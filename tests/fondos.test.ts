import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, categorias } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { crearFondo, listarFondos, getFondo, editarFondo, ocultarFondo, parseFondo } from '../server/utils/fondos'

const hasDb = Boolean(process.env.DATABASE_URL)

let userIdA: number
let userIdB: number

beforeAll(async () => {
  if (!hasDb) return
  const [a] = await db.insert(users).values({ email: `fnd-a-${randomUUID()}@test.dev`, name: 'Fondos A' }).returning({ id: users.id })
  const [b] = await db.insert(users).values({ email: `fnd-b-${randomUUID()}@test.dev`, name: 'Fondos B' }).returning({ id: users.id })
  userIdA = a.id
  userIdB = b.id
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(categorias).where(eq(categorias.user_id, userIdA))
  await db.delete(categorias).where(eq(categorias.user_id, userIdB))
  await db.delete(fondos).where(eq(fondos.user_id, userIdA))
  await db.delete(fondos).where(eq(fondos.user_id, userIdB))
  await db.delete(users).where(eq(users.id, userIdA))
  await db.delete(users).where(eq(users.id, userIdB))
})

describe.skipIf(!hasDb)('repositorio fondos', () => {
  it('parseFondo valida nombre, tipo y moneda_base', () => {
    expect(() => parseFondo({ nombre: '   ', tipo: 'personal' })).toThrow()
    expect(() => parseFondo({ nombre: 'x', tipo: 'otro', moneda_base: 'BOB' })).toThrow()
    expect(() => parseFondo({ nombre: 'x', tipo: 'personal', moneda_base: 'EUR' })).toThrow()
    expect(parseFondo({ nombre: ' Personal ', tipo: 'personal', moneda_base: 'USD' })).toEqual({
      nombre: 'Personal',
      tipo: 'personal',
      moneda_base: 'USD',
      color: null,
      icono: null,
      activo: undefined,
    })
  })

  it('crear / listar / get: CRUD completo en enteros y por moneda', async () => {
    const fondo = await crearFondo(userIdA, {
      nombre: 'Impresión 3D',
      tipo: 'negocio',
      moneda_base: 'BOB',
      color: '#0E6FFF',
      icono: '3d_rotation',
    })
    expect(fondo.id).toBeGreaterThan(0)
    expect(fondo.moneda_base).toBe('BOB')

    const enDb = await getFondo(userIdA, fondo.id)
    expect(enDb?.nombre).toBe('Impresión 3D')

    const lista = await listarFondos(userIdA)
    expect(lista.some((f) => f.id === fondo.id)).toBe(true)
  })

  it('editar cambia nombre/tipo/moneda/color/icono', async () => {
    const fondo = await crearFondo(userIdA, { nombre: 'Viejo', tipo: 'personal', moneda_base: 'BOB' })
    const editado = await editarFondo(userIdA, fondo.id, {
      nombre: 'Nuevo',
      tipo: 'negocio',
      moneda_base: 'USD',
      color: '#E5484D',
      icono: 'storefront',
    })
    expect(editado.nombre).toBe('Nuevo')
    expect(editado.tipo).toBe('negocio')
    expect(editado.moneda_base).toBe('USD')
    expect(editado.color).toBe('#E5484D')
    expect(editado.icono).toBe('storefront')
  })

  it('ocultar pone activo=false sin borrar el registro', async () => {
    const fondo = await crearFondo(userIdA, { nombre: 'A ocultar', tipo: 'personal', moneda_base: 'BOB' })
    const ocultado = await ocultarFondo(userIdA, fondo.id)
    expect(ocultado.activo).toBe(false)

    const enDb = await getFondo(userIdA, fondo.id)
    expect(enDb?.activo).toBe(false)
    expect(enDb).not.toBeNull()

    const lista = await listarFondos(userIdA)
    expect(lista.some((f) => f.id === fondo.id)).toBe(false)
    const todos = await listarFondos(userIdA, { incluirInactivos: true })
    expect(todos.some((f) => f.id === fondo.id)).toBe(true)
  })

  it('editar/ocultar un fondo ajeno lanza 404 y no lo toca', async () => {
    const fondoA = await crearFondo(userIdA, { nombre: 'Solo de A', tipo: 'personal', moneda_base: 'BOB' })
    await expect(editarFondo(userIdB, fondoA.id, { nombre: 'Robado', tipo: 'personal', moneda_base: 'BOB' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(ocultarFondo(userIdB, fondoA.id)).rejects.toMatchObject({ statusCode: 404 })

    const intacto = await getFondo(userIdA, fondoA.id)
    expect(intacto?.nombre).toBe('Solo de A')
    expect(intacto?.activo).toBe(true)
  })

  it('aislamiento: B no ve los fondos de A', async () => {
    const deB = await listarFondos(userIdB)
    const deA = await listarFondos(userIdA)
    expect(deB.some((f) => deA.some((a) => a.id === f.id))).toBe(false)
  })
})