import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, recurrentes, deudas, cuotas, metasAhorro, aportesMeta, settings } from '../server/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { crearTransaccion, hoyLocal } from '../server/utils/transacciones'
import { crearRecurrente } from '../server/utils/recurrentes'
import { crearDeuda } from '../server/utils/deudas'
import { crearMeta, crearAporteMeta } from '../server/utils/metas'
import { resumenDashboard } from '../server/utils/resumen'
import { rangoMes, resumenPeriodo, consolidarBase, gastosPorCategoria, type MovResumen } from '#shared/resumen'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let fondoId: number
let fondoVacioId: number
let cuentaBobId: number
let cuentaUsdId: number
let catGastoId: number
let catIngresoId: number
let deudaId: number

const hoy = hoyLocal()
const rango = rangoMes(hoy)

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `resumen-${randomUUID()}@test.dev`, name: 'Resumen' }).returning({ id: users.id })
  userId = u.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo Resumen', tipo: 'personal', moneda_base: 'BOB' })
  fondoId = fondo.id
  const fondoVacio = await crearFondo(userId, { nombre: 'Fondo Vacío', tipo: 'personal', moneda_base: 'BOB' })
  fondoVacioId = fondoVacio.id

  cuentaBobId = (await crearCuenta(userId, fondoId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 100000 })).id
  cuentaUsdId = (await crearCuenta(userId, fondoId, { nombre: 'Ahorro USD', tipo: 'ahorro', moneda: 'USD', saldo_inicial_centavos: 0 })).id

  const cats = await listarCategorias(userId, fondoId)
  catGastoId = cats.find((c) => c.tipo === 'gasto')!.id
  catIngresoId = cats.find((c) => c.tipo === 'ingreso')!.id

  await crearTransaccion(userId, fondoId, { cuenta_id: cuentaBobId, categoria_id: catIngresoId, tipo: 'ingreso', monto_centavos: 400000, fecha: hoy })
  await crearTransaccion(userId, fondoId, { cuenta_id: cuentaBobId, categoria_id: catGastoId, tipo: 'gasto', monto_centavos: 100000, fecha: hoy })
  await crearTransaccion(userId, fondoId, { cuenta_id: cuentaUsdId, categoria_id: catIngresoId, tipo: 'ingreso', monto_centavos: 10000, tasa_ref: 6.96, fecha: hoy })

  await crearRecurrente(userId, fondoId, {
    cuenta_id: cuentaBobId,
    categoria_id: catGastoId,
    tipo: 'gasto',
    monto_centavos: 25000,
    cadencia: { frecuencia: 'mensual' },
    proxima_fecha: '2020-01-15',
  })

  const deuda = await crearDeuda(userId, fondoId, {
    contraparte: 'Banco',
    direccion: 'por_pagar',
    monto_total_centavos: 30000,
    moneda: 'BOB',
    fecha_inicio: hoy,
    num_cuotas: 3,
  })
  deudaId = deuda!.id

  const meta = await crearMeta(userId, fondoId, { nombre: 'Emergencia', monto_objetivo_centavos: 100000, moneda: 'BOB' })
  await crearAporteMeta(userId, meta!.id, { monto_centavos: 24000 })
})

afterAll(async () => {
  if (!hasDb) return
  for (const uid of [userId]) {
    const ids = (await db.select({ id: metasAhorro.id }).from(metasAhorro).where(eq(metasAhorro.user_id, uid))).map((m) => m.id)
    if (ids.length) await db.delete(aportesMeta).where(inArray(aportesMeta.meta_id, ids))
    const dIds = (await db.select({ id: deudas.id }).from(deudas).where(eq(deudas.user_id, uid))).map((d) => d.id)
    if (dIds.length) await db.delete(cuotas).where(inArray(cuotas.deuda_id, dIds))
  }
  await db.delete(transacciones).where(eq(transacciones.user_id, userId))
  await db.delete(recurrentes).where(eq(recurrentes.user_id, userId))
  await db.delete(deudas).where(eq(deudas.user_id, userId))
  await db.delete(metasAhorro).where(eq(metasAhorro.user_id, userId))
  await db.delete(cuentas).where(eq(cuentas.user_id, userId))
  await db.delete(categorias).where(eq(categorias.user_id, userId))
  await db.delete(fondos).where(eq(fondos.user_id, userId))
  await db.delete(settings).where(eq(settings.user_id, userId))
  await db.delete(users).where(eq(users.id, userId))
})

describe('resumen (puro)', () => {
  it('rangoMes da el primero y último día del mes', () => {
    expect(rangoMes('2026-09-20')).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' })
    expect(rangoMes('2024-02-05')).toEqual({ desde: '2024-02-01', hasta: '2024-02-29' })
  })

  it('consolida con la tasa histórica de cada movimiento', () => {
    const movs: MovResumen[] = [
      { tipo: 'ingreso', monto_centavos: 10000, moneda: 'BOB', fecha: '2026-09-01' },
      { tipo: 'ingreso', monto_centavos: 10000, moneda: 'USD', tasa_ref: 6.96, fecha: '2026-09-01' },
    ]
    expect(consolidarBase(movs)).toBe(10000 + 69600)
  })

  it('resumenPeriodo separa por moneda y neto = ingresos − egresos', () => {
    const movs: MovResumen[] = [
      { tipo: 'ingreso', monto_centavos: 400000, moneda: 'BOB', fecha: '2026-09-05' },
      { tipo: 'gasto', monto_centavos: 100000, moneda: 'BOB', fecha: '2026-09-06' },
      { tipo: 'ingreso', monto_centavos: 10000, moneda: 'USD', tasa_ref: 6.96, fecha: '2026-09-07' },
      { tipo: 'gasto', monto_centavos: 999999, moneda: 'BOB', fecha: '2026-08-31' },
    ]
    const r = resumenPeriodo(movs, { desde: '2026-09-01', hasta: '2026-09-30' })
    expect(r.por_moneda.find((p) => p.moneda === 'BOB')).toEqual({ moneda: 'BOB', ingresos_centavos: 400000, egresos_centavos: 100000, neto_centavos: 300000 })
    expect(r.consolidado).toEqual({ ingresos_centavos: 469600, egresos_centavos: 100000, neto_centavos: 369600 })
  })

  it('gastosPorCategoria ordena y calcula porcentaje', () => {
    const movs: MovResumen[] = [
      { tipo: 'gasto', monto_centavos: 7500, moneda: 'BOB', fecha: '2026-09-01', categoria_id: 1, categoria_nombre: 'Comida' },
      { tipo: 'gasto', monto_centavos: 2500, moneda: 'BOB', fecha: '2026-09-02', categoria_id: 2, categoria_nombre: 'Transporte' },
      { tipo: 'ingreso', monto_centavos: 999999, moneda: 'BOB', fecha: '2026-09-03', categoria_id: 3, categoria_nombre: 'Sueldo' },
    ]
    const cats = gastosPorCategoria(movs, { desde: '2026-09-01', hasta: '2026-09-30' })
    expect(cats.map((c) => c.nombre)).toEqual(['Comida', 'Transporte'])
    expect(cats[0]!.centavos).toBe(7500)
    expect(cats[0]!.porcentaje).toBe(75)
    expect(cats[1]!.porcentaje).toBe(25)
  })
})

describe.skipIf(!hasDb)('resumenDashboard (agregación)', () => {
  it('muestra saldo por moneda y consolidado etiquetado como histórico', async () => {
    const r = await resumenDashboard(userId, fondoId)
    const bob = r.saldos.por_moneda.find((p) => p.moneda === 'BOB')!
    const usd = r.saldos.por_moneda.find((p) => p.moneda === 'USD')!
    expect(bob.centavos).toBe(400000) // 100000 + 400000 − 100000
    expect(usd.centavos).toBe(10000)
    expect(r.saldos.consolidado!.centavos).toBe(400000 + Math.round(10000 * 6.96))
    expect(r.saldos.consolidado!.nota).toBe('Convertido con tasa histórica')
    expect(r.vacio).toBe(false)
  })

  it('neto del mes = Σ ingresos − Σ egresos (consolidado)', async () => {
    const r = await resumenDashboard(userId, fondoId)
    expect(r.mes.desde).toBe(rango.desde)
    expect(r.mes.consolidado.ingresos_centavos).toBe(469600)
    expect(r.mes.consolidado.egresos_centavos).toBe(100000)
    expect(r.mes.consolidado.neto_centavos).toBe(369600)
    expect(r.gastos_por_categoria[0]!.centavos).toBe(100000)
  })

  it('solo aparecen pendientes reales: recurrente vencido y cuota por vencer', async () => {
    const r = await resumenDashboard(userId, fondoId)
    expect(r.pendientes.recurrentes.length).toBeGreaterThanOrEqual(1)
    expect(r.pendientes.cuotas.some((c) => c.deuda_id === deudaId)).toBe(true)
  })

  it('incluye las metas activas con progreso', async () => {
    const r = await resumenDashboard(userId, fondoId)
    expect(r.metas.length).toBeGreaterThanOrEqual(1)
    expect(r.metas[0]!.progreso.porcentaje).toBe(24)
  })

  it('un fondo sin datos devuelve estado vacío', async () => {
    const r = await resumenDashboard(userId, fondoVacioId)
    expect(r.vacio).toBe(true)
    expect(r.saldos.por_moneda).toEqual([])
    expect(r.saldos.consolidado!.centavos).toBe(0)
    expect(r.mes.consolidado).toEqual({ ingresos_centavos: 0, egresos_centavos: 0, neto_centavos: 0 })
  })
})
