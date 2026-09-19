import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, categorias, transacciones, cuentas } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import {
  sembrarCategorias,
  listarCategorias,
  getCategoria,
  crearCategoria,
  editarCategoria,
  ocultarCategoria,
  borrarCategoria,
  PRESETS_FONDO,
} from '../server/utils/categorias'
import { crearFondo } from '../server/utils/fondos'

const hasDb = Boolean(process.env.DATABASE_URL)

let userIdA: number
let userIdB: number

beforeAll(async () => {
  if (!hasDb) return
  const [a] = await db.insert(users).values({ email: `cat-a-${randomUUID()}@test.dev`, name: 'Categorías A' }).returning({ id: users.id })
  const [b] = await db.insert(users).values({ email: `cat-b-${randomUUID()}@test.dev`, name: 'Categorías B' }).returning({ id: users.id })
  userIdA = a.id
  userIdB = b.id
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdA)).catch(() => {})
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdB)).catch(() => {})
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdA))
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdB))
  await db.delete(categorias).where(eq(categorias.user_id, userIdA))
  await db.delete(categorias).where(eq(categorias.user_id, userIdB))
  await db.delete(fondos).where(eq(fondos.user_id, userIdA))
  await db.delete(fondos).where(eq(fondos.user_id, userIdB))
  await db.delete(users).where(eq(users.id, userIdA))
  await db.delete(users).where(eq(users.id, userIdB))
})

describe.skipIf(!hasDb)('categorías por fondo', () => {
  it('presets al crear fondo: personal y negocio precargan sus categorías sin duplicar', async () => {
    const personal = await crearFondo(userIdA, { nombre: 'Personal', tipo: 'personal', moneda_base: 'BOB' })
    const negocio = await crearFondo(userIdA, { nombre: 'Taller', tipo: 'negocio', moneda_base: 'BOB' })

    const dePersonal = await listarCategorias(userIdA, personal.id)
    expect(dePersonal.some((c) => c.nombre === 'Comida' && c.tipo === 'gasto' && c.es_predefinida)).toBe(true)
    expect(dePersonal.some((c) => c.nombre === 'Sueldo' && c.tipo === 'ingreso' && c.es_predefinida)).toBe(true)

    const deNegocio = await listarCategorias(userIdA, negocio.id)
    expect(deNegocio.some((c) => c.nombre === 'Insumos' && c.tipo === 'gasto')).toBe(true)
    expect(deNegocio.some((c) => c.nombre === 'Venta' && c.tipo === 'ingreso')).toBe(true)

    // Sin duplicados: un preset por nombre+tipo.
    const unicos = new Set(dePersonal.map((c) => `${c.nombre}|${c.tipo}`))
    expect(unicos.size).toBe(dePersonal.length)
  })

  it('sembrarCategorias es idempotente por fondo (no duplica si ya existen)', async () => {
    const fondo = await crearFondo(userIdA, { nombre: 'Fondo Idem', tipo: 'personal', moneda_base: 'BOB' })
    await sembrarCategorias(userIdA, fondo.id, 'personal')
    const deNuevo = await listarCategorias(userIdA, fondo.id)
    const esperados = PRESETS_FONDO.personal.length
    expect(deNuevo.filter((c) => c.es_predefinida).length).toBe(esperados)
  })

  it('crear categoría propia con icono/color; aparece lista del mismo fondo', async () => {
    const fondo = await crearFondo(userIdA, { nombre: 'Fondo Propia', tipo: 'personal', moneda_base: 'BOB' })
    const creada = await crearCategoria(userIdA, fondo.id, {
      nombre: 'Seguro',
      tipo: 'gasto',
      icono: 'shield',
      color: '#E8A13A',
    })
    expect(creada.es_predefinida).toBe(false)

    const enFondo = await listarCategorias(userIdA, fondo.id)
    expect(enFondo.some((c) => c.id === creada.id && c.icono === 'shield' && c.color === '#E8A13A')).toBe(true)
  })

  it('ocultar predefinida la quita del selector sin borrarla; usadas siguen en histórico', async () => {
    const fondo = await crearFondo(userIdA, { nombre: 'Fondo Oculta', tipo: 'personal', moneda_base: 'BOB' })
    const antes = await listarCategorias(userIdA, fondo.id)
    const comida = antes.find((c) => c.nombre === 'Comida')!

    const ocultada = await ocultarCategoria(userIdA, comida.id)
    expect(ocultada?.activa).toBe(false)

    const activas = await listarCategorias(userIdA, fondo.id)
    expect(activas.some((c) => c.id === comida.id)).toBe(false)

    const todas = await listarCategorias(userIdA, fondo.id, { incluirInactivas: true })
    expect(todas.some((c) => c.id === comida.id)).toBe(true)
  })

  it('borrar predefinida da error; borrar propia sin transacciones borra la fila', async () => {
    const fondo = await crearFondo(userIdA, { nombre: 'Fondo Borra', tipo: 'personal', moneda_base: 'BOB' })
    const lista = await listarCategorias(userIdA, fondo.id)
    const predefinida = lista.find((c) => c.nombre === 'Otros')!
    await expect(borrarCategoria(userIdA, predefinida.id)).rejects.toMatchObject({ statusCode: 400 })

    const propia = await crearCategoria(userIdA, fondo.id, { nombre: 'Temporal', tipo: 'gasto' })
    const borrada = await borrarCategoria(userIdA, propia.id)
    expect(borrada.id).toBe(propia.id)
    expect(await getCategoria(userIdA, propia.id)).toBeNull()
  })

  it('borrar categoría con transacciones da error (sugiere ocultar)', async () => {
    const fondo = await crearFondo(userIdA, { nombre: 'Fondo Usada', tipo: 'personal', moneda_base: 'BOB' })
    const propia = await crearCategoria(userIdA, fondo.id, { nombre: 'Usada', tipo: 'gasto' })

    const cuenta = await crearCuentaPara(userIdA, fondo.id)
    await db
      .insert(transacciones)
      .values({
        user_id: userIdA,
        fondo_id: fondo.id,
        cuenta_id: cuenta,
        categoria_id: propia.id,
        tipo: 'gasto',
        monto_centavos: 100,
        moneda: 'BOB',
        fecha: '2026-09-15',
      })
    await expect(borrarCategoria(userIdA, propia.id)).rejects.toMatchObject({ statusCode: 400 })

    const ocultada = await ocultarCategoria(userIdA, propia.id)
    expect(ocultada?.activa).toBe(false)
    const activas = await listarCategorias(userIdA, fondo.id, { incluirInactivas: false })
    expect(activas.some((c) => c.id === propia.id)).toBe(false)
  })

  it('aislamiento: categorías de otro fondo/usuario no se leen ni se editan', async () => {
    const fondoA = await crearFondo(userIdA, { nombre: 'Solo A Cat', tipo: 'personal', moneda_base: 'BOB' })
    const catA = await crearCategoria(userIdA, fondoA.id, { nombre: 'Exclusiva', tipo: 'gasto' })

    await expect(editarCategoria(userIdB, catA.id, { nombre: 'Robada', tipo: 'gasto' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(borrarCategoria(userIdB, catA.id)).rejects.toMatchObject({ statusCode: 404 })
    expect(await getCategoria(userIdB, catA.id)).toBeNull()

    const intacta = await getCategoria(userIdA, catA.id)
    expect(intacta?.nombre).toBe('Exclusiva')
  })
})

async function crearCuentaPara(userId: number, fondoId: number) {
  const [cuenta] = await db
    .insert(cuentas)
    .values({ user_id: userId, fondo_id: fondoId, nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB' })
    .returning({ id: cuentas.id })
  return cuenta.id
}