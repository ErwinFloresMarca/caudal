import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, recurrentes, settings } from '../server/db/schema'
import { eq, sql } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { listarTransacciones } from '../server/utils/transacciones'
import {
  parseRecurrente,
  parseCadencia,
  crearRecurrente,
  listarRecurrentes,
  listarPendientes,
  getRecurrente,
  editarRecurrente,
  borrarRecurrente,
  confirmarRecurrente,
  saltarRecurrente,
} from '../server/utils/recurrentes'
import { nextDate, normalizarCadencia, esVencida } from '#shared/recurrentes'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let fondoId: number
let cuentaBobId: number
let cuentaUsdId: number
let catGastoId: number
let catIngresoId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `rec-${randomUUID()}@test.dev`, name: 'Recurrentes' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `rec-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo Rec', tipo: 'personal', moneda_base: 'BOB' })
  fondoId = fondo.id
  cuentaBobId = (await crearCuenta(userId, fondoId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 100000 })).id
  cuentaUsdId = (await crearCuenta(userId, fondoId, { nombre: 'Ahorro USD', tipo: 'ahorro', moneda: 'USD', saldo_inicial_centavos: 0 })).id

  const cats = await listarCategorias(userId, fondoId)
  catGastoId = cats.find((c) => c.tipo === 'gasto')!.id
  catIngresoId = cats.find((c) => c.tipo === 'ingreso')!.id
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(transacciones).where(eq(transacciones.user_id, userId))
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdOtro))
  await db.delete(recurrentes).where(eq(recurrentes.user_id, userId))
  await db.delete(recurrentes).where(eq(recurrentes.user_id, userIdOtro))
  await db.delete(cuentas).where(eq(cuentas.user_id, userId))
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdOtro))
  await db.delete(categorias).where(eq(categorias.user_id, userId))
  await db.delete(categorias).where(eq(categorias.user_id, userIdOtro))
  await db.delete(fondos).where(eq(fondos.user_id, userId))
  await db.delete(fondos).where(eq(fondos.user_id, userIdOtro))
  await db.delete(settings).where(eq(settings.user_id, userId))
  await db.delete(settings).where(eq(settings.user_id, userIdOtro))
  await db.delete(users).where(eq(users.id, userId))
  await db.delete(users).where(eq(users.id, userIdOtro))
})

describe('nextDate (puro)', () => {
  it('mensual ajusta fin de mes (31 → 28/29) y conserva el ancla con dia', () => {
    expect(nextDate('2026-01-31', { frecuencia: 'mensual' })).toBe('2026-02-28')
    expect(nextDate('2024-01-31', { frecuencia: 'mensual' })).toBe('2024-02-29')
    expect(nextDate('2026-04-30', { frecuencia: 'mensual', dia: 31 })).toBe('2026-05-31')
  })

  it('semanal, quincenal y anual con casos borde', () => {
    expect(nextDate('2026-01-08', { frecuencia: 'semanal' })).toBe('2026-01-15')
    // 15 → 30; 30 → 14 del mes siguiente (sin desbordar a "30 de febrero").
    expect(nextDate('2026-01-15', { frecuencia: 'quincenal' })).toBe('2026-01-30')
    expect(nextDate('2026-01-30', { frecuencia: 'quincenal' })).toBe('2026-02-14')
    expect(nextDate('2024-02-29', { frecuencia: 'anual' })).toBe('2025-02-28')
    expect(nextDate('2027-02-28', { frecuencia: 'anual', dia: 29 })).toBe('2028-02-29')
  })

  it('normaliza el ancla y detecta vencidas', () => {
    expect(normalizarCadencia({ frecuencia: 'mensual' }, '2026-01-31')).toEqual({ frecuencia: 'mensual', dia: 31 })
    expect(normalizarCadencia({ frecuencia: 'semanal' }, '2026-01-31')).toEqual({ frecuencia: 'semanal' })
    expect(esVencida('2026-01-15', '2026-01-15')).toBe(true)
    expect(esVencida('2026-01-16', '2026-01-15')).toBe(false)
  })

  it('parseCadencia valida y rejecta frecuencia/día inválidos', () => {
    expect(parseCadencia({ frecuencia: 'mensual', dia: 15 })).toEqual({ frecuencia: 'mensual', dia: 15, dia_semana: undefined })
    expect(() => parseCadencia({ frecuencia: 'cada-rato' })).toThrow(/frecuencia/)
    expect(() => parseCadencia({ frecuencia: 'mensual', dia: 40 })).toThrow(/dia/)
  })
})

describe.skipIf(!hasDb)('recurrentes (repositorio)', () => {
  it('crea un recurrente con proxima_fecha pasada y aparece como pendiente', async () => {
    const r = await crearRecurrente(userId, fondoId, {
      cuenta_id: cuentaBobId,
      categoria_id: catGastoId,
      tipo: 'gasto',
      monto_centavos: 25000,
      cadencia: { frecuencia: 'mensual' },
      proxima_fecha: '2020-01-15',
      nota: 'Alquiler',
    })
    expect(r!.pendiente).toBe(true)
    expect(r!.cadencia).toEqual({ frecuencia: 'mensual', dia: 15 })

    const pendientes = await listarPendientes(userId, fondoId)
    expect(pendientes.some((p) => p.id === r!.id)).toBe(true)
  })

  it('confirmar crea la transacción con la fecha esperada y fuente=recurrente, y avanza', async () => {
    const r = await crearRecurrente(userId, fondoId, {
      cuenta_id: cuentaBobId,
      categoria_id: catGastoId,
      tipo: 'gasto',
      monto_centavos: 12000,
      cadencia: { frecuencia: 'mensual' },
      proxima_fecha: '2020-02-29',
    })

    const { recurrente, transaccion } = await confirmarRecurrente(userId, r!.id)
    expect(transaccion.fecha).toBe('2020-02-29')
    expect(transaccion.fuente).toBe('recurrente')
    expect(recurrente!.proxima_fecha).toBe('2020-03-29')

    const movs = await listarTransacciones(userId, fondoId, { desde: '2020-02-29', hasta: '2020-02-29' })
    expect(movs.find((m) => m.id === transaccion.id)?.fuente).toBe('recurrente')

    await borrarRecurrente(userId, r!.id)
  })

  it('saltar avanza la fecha sin crear transacción', async () => {
    const r = await crearRecurrente(userId, fondoId, {
      cuenta_id: cuentaBobId,
      categoria_id: catGastoId,
      tipo: 'gasto',
      monto_centavos: 5000,
      cadencia: { frecuencia: 'semanal' },
      proxima_fecha: '2020-03-01',
    })
    const antes = await db.select({ n: sql<number>`COUNT(*)` }).from(transacciones).where(eq(transacciones.user_id, userId))
    const actualizado = await saltarRecurrente(userId, r!.id)
    const despues = await db.select({ n: sql<number>`COUNT(*)` }).from(transacciones).where(eq(transacciones.user_id, userId))

    expect(actualizado!.proxima_fecha).toBe('2020-03-08')
    expect(Number(despues[0]!.n)).toBe(Number(antes[0]!.n))
    await borrarRecurrente(userId, r!.id)
  })

  it('pausar lo saca de pendientes sin borrar la plantilla', async () => {
    const r = await crearRecurrente(userId, fondoId, {
      cuenta_id: cuentaBobId,
      categoria_id: catGastoId,
      tipo: 'gasto',
      monto_centavos: 8000,
      cadencia: { frecuencia: 'mensual' },
      proxima_fecha: '2020-04-10',
    })
    await editarRecurrente(userId, r!.id, {
      cuenta_id: cuentaBobId,
      categoria_id: catGastoId,
      tipo: 'gasto',
      monto_centavos: 8000,
      cadencia: { frecuencia: 'mensual' },
      proxima_fecha: '2020-04-10',
      activo: false,
    })
    const pendientes = await listarPendientes(userId, fondoId)
    expect(pendientes.some((p) => p.id === r!.id)).toBe(false)
    expect(await getRecurrente(userId, r!.id)).not.toBeNull()
    await borrarRecurrente(userId, r!.id)
  })

  it('confirmar una cuenta USD exige tasa_ref', async () => {
    const r = await crearRecurrente(userId, fondoId, {
      cuenta_id: cuentaUsdId,
      categoria_id: catIngresoId,
      tipo: 'ingreso',
      monto_centavos: 10000,
      cadencia: { frecuencia: 'mensual' },
      proxima_fecha: '2020-05-01',
    })
    await expect(confirmarRecurrente(userId, r!.id)).rejects.toMatchObject({ statusCode: 400, message: /tasa_ref/ })
    const ok = await confirmarRecurrente(userId, r!.id, { tasa_ref: 6.96 })
    expect(ok.transaccion.tasa_ref).toBe(6.96)
    await borrarRecurrente(userId, r!.id)
  })

  it('valida cuenta/categoría del mismo fondo y aísla por usuario', async () => {
    const fondoOtro = await crearFondo(userId, { nombre: 'Otro Rec', tipo: 'personal', moneda_base: 'BOB' })
    const cuentaOtroFondo = await crearCuenta(userId, fondoOtro.id, { nombre: 'Caja 2', tipo: 'efectivo', moneda: 'BOB' })
    await expect(
      crearRecurrente(userId, fondoId, {
        cuenta_id: cuentaOtroFondo.id,
        tipo: 'gasto',
        monto_centavos: 100,
        cadencia: { frecuencia: 'mensual' },
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /Cuenta no encontrada/ })

    const r = await crearRecurrente(userId, fondoId, {
      cuenta_id: cuentaBobId,
      tipo: 'gasto',
      monto_centavos: 1000,
      cadencia: { frecuencia: 'mensual' },
      proxima_fecha: '2026-01-01',
    })
    expect(await getRecurrente(userIdOtro, r!.id)).toBeNull()
    await expect(borrarRecurrente(userIdOtro, r!.id)).rejects.toMatchObject({ statusCode: 404 })
    expect((await listarRecurrentes(userIdOtro, fondoId)).length).toBe(0)
    await borrarRecurrente(userId, r!.id)
  })
})

describe('parseRecurrente (puro)', () => {
  it('valida campos y normaliza nota', () => {
    const d = parseRecurrente({
      cuenta_id: 1,
      tipo: 'gasto',
      monto_centavos: 1000,
      cadencia: { frecuencia: 'mensual', dia: 1 },
      proxima_fecha: '2026-01-01',
      nota: '  alquiler  ',
    })
    expect(d.nota).toBe('alquiler')
    expect(d.cadencia).toEqual({ frecuencia: 'mensual', dia: 1, dia_semana: undefined })

    expect(() => parseRecurrente({ cuenta_id: 0, tipo: 'gasto', monto_centavos: 10, cadencia: { frecuencia: 'mensual' } })).toThrow(/cuenta_id/)
    expect(() => parseRecurrente({ cuenta_id: 1, tipo: 'x', monto_centavos: 10, cadencia: { frecuencia: 'mensual' } })).toThrow(/tipo/)
    expect(() => parseRecurrente({ cuenta_id: 1, tipo: 'gasto', monto_centavos: 10, cadencia: { frecuencia: 'mensual' }, proxima_fecha: '01/01/2026' })).toThrow(/proxima_fecha/)
  })
})
