import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, deudas, cuotas } from '../server/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta, getCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { listarTransacciones } from '../server/utils/transacciones'
import {
  parseDeuda,
  parsePago,
  crearDeuda,
  listarDeudas,
  getDeuda,
  editarDeuda,
  editarCuota,
  pagarCuota,
  borrarDeuda,
} from '../server/utils/deudas'
import { repartirMonto, fechasCuotas, generarCuotas } from '#shared/cuotas'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let fondoId: number
let cuentaBobId: number
let catGastoId: number
let catIngresoId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `deuda-${randomUUID()}@test.dev`, name: 'Deudas' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `deuda-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo Deudas', tipo: 'personal', moneda_base: 'BOB' })
  fondoId = fondo.id
  cuentaBobId = (await crearCuenta(userId, fondoId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 100000 })).id

  const cats = await listarCategorias(userId, fondoId)
  catGastoId = cats.find((c) => c.tipo === 'gasto')!.id
  catIngresoId = cats.find((c) => c.tipo === 'ingreso')!.id
})

afterAll(async () => {
  if (!hasDb) return
  const deudasDe = async (uid: number) => (await db.select({ id: deudas.id }).from(deudas).where(eq(deudas.user_id, uid))).map((d) => d.id)
  for (const uid of [userId, userIdOtro]) {
    const ids = await deudasDe(uid)
    if (ids.length) await db.delete(cuotas).where(inArray(cuotas.deuda_id, ids))
  }
  await db.delete(transacciones).where(eq(transacciones.user_id, userId))
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdOtro))
  await db.delete(deudas).where(eq(deudas.user_id, userId))
  await db.delete(deudas).where(eq(deudas.user_id, userIdOtro))
  await db.delete(cuentas).where(eq(cuentas.user_id, userId))
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdOtro))
  await db.delete(categorias).where(eq(categorias.user_id, userId))
  await db.delete(categorias).where(eq(categorias.user_id, userIdOtro))
  await db.delete(fondos).where(eq(fondos.user_id, userId))
  await db.delete(fondos).where(eq(fondos.user_id, userIdOtro))
  await db.delete(users).where(eq(users.id, userId))
  await db.delete(users).where(eq(users.id, userIdOtro))
})

describe('cuotas (puro)', () => {
  it('reparte exacto con ajuste de centavos en las primeras cuotas', () => {
    expect(repartirMonto(30000, 3)).toEqual([10000, 10000, 10000])
    expect(repartirMonto(10000, 3)).toEqual([3334, 3333, 3333])
    expect(repartirMonto(10000, 3).reduce((a, b) => a + b, 0)).toBe(10000)
  })

  it('fechas mensuales desde el inicio con recorte de fin de mes', () => {
    expect(fechasCuotas('2026-01-31', 3)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    const cs = generarCuotas(10000, 3, '2026-01-31')
    expect(cs.map((c) => c.monto_centavos)).toEqual([3334, 3333, 3333])
    expect(cs.map((c) => c.numero)).toEqual([1, 2, 3])
  })
})

describe.skipIf(!hasDb)('deudas (repositorio)', () => {
  it('crea deuda de Bs 300 en 3 cuotas exactas de 10000', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      concepto: 'Préstamo',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    expect(d!.estado).toBe('activa')
    expect(d!.cuotas!.map((c) => c.monto_centavos)).toEqual([10000, 10000, 10000])
    expect(d!.progreso).toEqual({ pagadas: 0, total: 3 })
    expect(d!.saldo_pendiente_centavos).toBe(30000)
    await borrarDeuda(userId, d!.id)
  })

  it('crea deuda de Bs 100 en 3 cuotas que suman 10000', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Tienda',
      direccion: 'por_pagar',
      monto_total_centavos: 10000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    expect(d!.cuotas!.map((c) => c.monto_centavos)).toEqual([3334, 3333, 3333])
    expect(d!.cuotas!.reduce((s, c) => s + c.monto_centavos, 0)).toBe(10000)
    await borrarDeuda(userId, d!.id)
  })

  it('pagar cuota crea un gasto en la cuenta y sube el progreso a 1/3', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    const antes = (await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos

    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId, fecha: '2026-09-05' })
    expect(res.transaccion.tipo).toBe('gasto')
    expect(res.transaccion.monto_centavos).toBe(10000)
    expect(res.cuota!.pagada).toBe(true)
    expect(res.cuota!.fecha_pago).toBe('2026-09-05')
    expect(res.deuda!.progreso).toEqual({ pagadas: 1, total: 3 })
    expect(res.deuda!.saldo_pendiente_centavos).toBe(20000)
    expect((await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos).toBe(antes - 10000)

    const movs = await listarTransacciones(userId, fondoId, { desde: '2026-09-05', hasta: '2026-09-05' })
    expect(movs.some((m) => m.id === res.transaccion.id)).toBe(true)

    await expect(pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId })).rejects.toMatchObject({ statusCode: 400, message: /ya está pagada/ })
    await borrarDeuda(userId, d!.id)
  })

  it('pagadas todas las cuotas la deuda queda saldada', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 20000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 2,
    })
    await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId })
    const res = await pagarCuota(userId, d!.id, d!.cuotas![1]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId })
    expect(res.deuda!.estado).toBe('saldada')
    expect(res.deuda!.saldo_pendiente_centavos).toBe(0)
    await borrarDeuda(userId, d!.id)
  })

  it('una deuda por_cobrar genera un ingreso al pagar su cuota', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Cliente',
      direccion: 'por_cobrar',
      monto_total_centavos: 15000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catIngresoId })
    expect(res.transaccion.tipo).toBe('ingreso')
    expect(res.transaccion.monto_centavos).toBe(15000)
    await borrarDeuda(userId, d!.id)
  })

  it('editar num_cuotas recalcula las no pagadas sin tocar las pagadas', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId })

    const editada = await editarDeuda(userId, d!.id, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 4,
    })
    expect(editada!.cuotas!.length).toBe(4)
    const pagada = editada!.cuotas!.find((c) => c.numero === 1)!
    expect(pagada.pagada).toBe(true)
    expect(pagada.monto_centavos).toBe(10000)
    const noPagadas = editada!.cuotas!.filter((c) => !c.pagada)
    expect(noPagadas.length).toBe(3)
    expect(noPagadas.reduce((s, c) => s + c.monto_centavos, 0)).toBe(20000)

    await borrarDeuda(userId, d!.id)
  })

  it('edita una cuota no pagada y rechaza las pagadas', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    const editada = await editarCuota(userId, d!.id, d!.cuotas![1]!.id, { monto_centavos: 12000 })
    expect(editada!.monto_centavos).toBe(12000)

    await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId })
    await expect(editarCuota(userId, d!.id, d!.cuotas![0]!.id, { monto_centavos: 1 })).rejects.toMatchObject({ statusCode: 400, message: /pagada/ })
    await borrarDeuda(userId, d!.id)
  })

  it('aislamiento: otro usuario no ve ni borra mis deudas', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 10000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    expect(await getDeuda(userIdOtro, d!.id)).toBeNull()
    await expect(borrarDeuda(userIdOtro, d!.id)).rejects.toMatchObject({ statusCode: 404 })
    expect((await listarDeudas(userIdOtro, fondoId)).length).toBe(0)
    expect(Number((await db.select({ n: sql<number>`COUNT(*)` }).from(transacciones).where(and(eq(transacciones.user_id, userIdOtro))))[0]!.n)).toBe(0)
    await borrarDeuda(userId, d!.id)
  })
})

describe('parseDeuda / parsePago (puro)', () => {
  it('valida dirección, monto y cuotas', () => {
    expect(() => parseDeuda({ contraparte: '', direccion: 'por_pagar', monto_total_centavos: 100, num_cuotas: 1, moneda: 'BOB' })).toThrow(/contraparte/)
    expect(() => parseDeuda({ contraparte: 'X', direccion: 'otro', monto_total_centavos: 100, num_cuotas: 1, moneda: 'BOB' })).toThrow(/direccion/)
    expect(() => parseDeuda({ contraparte: 'X', direccion: 'por_pagar', monto_total_centavos: 0, num_cuotas: 1, moneda: 'BOB' })).toThrow(/monto_total/)
    expect(() => parseDeuda({ contraparte: 'X', direccion: 'por_pagar', monto_total_centavos: 100, num_cuotas: 0, moneda: 'BOB' })).toThrow(/num_cuotas/)
    const d = parseDeuda({ contraparte: '  Banco  ', direccion: 'por_pagar', monto_total_centavos: 10000, num_cuotas: 3, moneda: 'BOB', fecha_inicio: '2026-09-01' })
    expect(d.contraparte).toBe('Banco')
  })

  it('parsePago exige cuenta y valida tasa', () => {
    expect(() => parsePago({})).toThrow(/cuenta_id/)
    expect(() => parsePago({ cuenta_id: 1, monto_centavos: 0 })).toThrow(/monto_centavos/)
    expect(parsePago({ cuenta_id: 1, tasa_ref: '6,96' }).tasa_ref).toBe(6.96)
  })
})
