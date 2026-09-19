import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, transacciones } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import {
  parseCuenta,
  parseCuentaCompleta,
  crearCuenta,
  listarCuentas,
  getCuenta,
  editarCuenta,
  ocultarCuenta,
  contarMovimientos,
} from '../server/utils/cuentas'
import { crearFondo } from '../server/utils/fondos'

const hasDb = Boolean(process.env.DATABASE_URL)

let userIdA: number
let userIdB: number
let fondoAId: number

beforeAll(async () => {
  if (!hasDb) return
  const [a] = await db.insert(users).values({ email: `cta-a-${randomUUID()}@test.dev`, name: 'Cuentas A' }).returning({ id: users.id })
  const [b] = await db.insert(users).values({ email: `cta-b-${randomUUID()}@test.dev`, name: 'Cuentas B' }).returning({ id: users.id })
  userIdA = a.id
  userIdB = b.id
  const fondo = await crearFondo(userIdA, { nombre: 'Fondo Cuentas', tipo: 'personal', moneda_base: 'BOB' })
  fondoAId = fondo.id
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdA))
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdB))
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdA))
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdB))
  await db.delete(fondos).where(eq(fondos.user_id, userIdA))
  await db.delete(fondos).where(eq(fondos.user_id, userIdB))
  await db.delete(users).where(eq(users.id, userIdA))
  await db.delete(users).where(eq(users.id, userIdB))
})

describe.skipIf(!hasDb)('repositorio cuentas', () => {
  it('parseCuenta valida nombre, tipo, moneda y saldo entero', () => {
    expect(() => parseCuenta({ nombre: 'x', tipo: 'otro' })).toThrow()
    expect(() => parseCuenta({ nombre: 'x', tipo: 'banco', moneda: 'EUR' })).toThrow()
    expect(() => parseCuenta({ nombre: 'x', tipo: 'banco', saldo_inicial_centavos: 12.5 })).toThrow()
    expect(() => parseCuenta({ nombre: 'x', tipo: 'banco', saldo_inicial_centavos: -1 })).toThrow()
    expect(parseCuenta({ nombre: ' Banca Móvil ', tipo: 'banco', moneda: 'USD', saldo_inicial_centavos: 1500 })).toEqual({
      nombre: 'Banca Móvil',
      tipo: 'banco',
      moneda: 'USD',
      saldo_inicial_centavos: 1500,
      activa: undefined,
    })
    // parseCuenta es laxo para edición (nombre/tipo pueden faltar)
    expect(parseCuenta({ nombre: 'Solo nombre' })).toEqual({
      nombre: 'Solo nombre',
      tipo: undefined,
      moneda: undefined,
      saldo_inicial_centavos: undefined,
      activa: undefined,
    })
    // parseCuentaCompleta exige nombre y tipo (creación)
    expect(() => parseCuentaCompleta({ nombre: 'x' })).toThrow()
    expect(() => parseCuentaCompleta({ tipo: 'banco' })).toThrow()
  })

  it('crear dos cuentas en el mismo fondo: BOB y USD', async () => {
    const ctaBob = await crearCuenta(userIdA, fondoAId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 10000 })
    const ctaUsd = await crearCuenta(userIdA, fondoAId, { nombre: 'Ahorro USD', tipo: 'ahorro', moneda: 'USD', saldo_inicial_centavos: 20000 })
    expect(ctaBob.moneda).toBe('BOB')
    expect(ctaUsd.moneda).toBe('USD')

    const lista = await listarCuentas(userIdA, fondoAId)
    expect(lista.some((c) => c.id === ctaBob.id)).toBe(true)
    expect(lista.some((c) => c.id === ctaUsd.id)).toBe(true)
  })

  it('saldo actual = inicial + ingresos - gastos (3 transacciones)', async () => {
    const cuenta = await crearCuenta(userIdA, fondoAId, { nombre: 'Saldo vivo', tipo: 'banco', moneda: 'BOB', saldo_inicial_centavos: 5000 })
    await db.insert(transacciones).values([
      { user_id: userIdA, fondo_id: fondoAId, cuenta_id: cuenta.id, tipo: 'ingreso', monto_centavos: 3000, moneda: 'BOB', fecha: '2026-09-01' },
      { user_id: userIdA, fondo_id: fondoAId, cuenta_id: cuenta.id, tipo: 'gasto', monto_centavos: 1000, moneda: 'BOB', fecha: '2026-09-05' },
      { user_id: userIdA, fondo_id: fondoAId, cuenta_id: cuenta.id, tipo: 'gasto', monto_centavos: 1500, moneda: 'BOB', fecha: '2026-09-10' },
    ])

    const conSaldo = await getCuenta(userIdA, cuenta.id)
    expect(conSaldo?.saldo_inicial_centavos).toBe(5000)
    expect(conSaldo?.saldo_actual_centavos).toBe(5000 + 3000 - 1000 - 1500)
    expect(await contarMovimientos(cuenta.id)).toBe(3)
  })

  it('no cambia moneda ni saldo inicial de cuenta con movimientos; sí nombre/tipo', async () => {
    const cuenta = await crearCuenta(userIdA, fondoAId, { nombre: 'Intocable', tipo: 'tarjeta', moneda: 'BOB', saldo_inicial_centavos: 1000 })
    await db
      .insert(transacciones)
      .values({ user_id: userIdA, fondo_id: fondoAId, cuenta_id: cuenta.id, tipo: 'gasto', monto_centavos: 100, moneda: 'BOB', fecha: '2026-09-02' })

    await expect(editarCuenta(userIdA, cuenta.id, { nombre: 'Intocable', tipo: 'tarjeta', moneda: 'USD' })).rejects.toMatchObject({ statusCode: 400 })
    await expect(
      editarCuenta(userIdA, cuenta.id, { nombre: 'Intocable', tipo: 'tarjeta', moneda: 'BOB', saldo_inicial_centavos: 9999 }),
    ).rejects.toMatchObject({ statusCode: 400 })

    const editada = await editarCuenta(userIdA, cuenta.id, { nombre: 'Renombrada', tipo: 'ahorro' })
    expect(editada?.nombre).toBe('Renombrada')
    expect(editada?.tipo).toBe('ahorro')
    expect(editada?.moneda).toBe('BOB')
  })

  it('ocultar activa=false la quita de la lista pero conserva el registro', async () => {
    const cuenta = await crearCuenta(userIdA, fondoAId, { nombre: 'A ocultar', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 700 })
    const ocultada = await ocultarCuenta(userIdA, cuenta.id)
    expect(ocultada?.activa).toBe(false)

    const enDb = await getCuenta(userIdA, cuenta.id)
    expect(enDb?.activa).toBe(false)
    expect(enDb).not.toBeNull()

    const lista = await listarCuentas(userIdA, fondoAId)
    expect(lista.some((c) => c.id === cuenta.id)).toBe(false)
  })

  it('edit/ocultar cuenta ajena (otro fondo/usuario) lanza 404', async () => {
    const fondoB = await crearFondo(userIdB, { nombre: 'Fondo B', tipo: 'personal', moneda_base: 'BOB' })
    const deB = await crearCuenta(userIdB, fondoB.id, { nombre: 'Solo de B', tipo: 'banco', moneda: 'BOB' })
    await expect(editarCuenta(userIdA, deB.id, { nombre: 'Robado', tipo: 'banco' })).rejects.toMatchObject({ statusCode: 404 })
    await expect(ocultarCuenta(userIdA, deB.id)).rejects.toMatchObject({ statusCode: 404 })

    const intacta = await getCuenta(userIdB, deB.id)
    expect(intacta?.nombre).toBe('Solo de B')
    expect(intacta?.activa).toBe(true)
  })

  it('aislamiento: cuentas de B no aparecen en el fondo de A', async () => {
    const deA = await listarCuentas(userIdA, fondoAId)
    const fondoB = await db.select().from(fondos).where(eq(fondos.user_id, userIdB)).orderBy(fondos.id).limit(1)
    const deB = fondoB[0] ? await listarCuentas(userIdB, fondoB[0].id) : []
    expect(deA.some((c) => deB.some((b) => b.id === c.id))).toBe(false)
  })
})