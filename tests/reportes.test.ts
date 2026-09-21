import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, transferencias } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { crearTransaccion, hoyLocal } from '../server/utils/transacciones'
import { crearTransferencia } from '../server/utils/transferencias'
import { crearAporte } from '../server/utils/aportes'
import { generarReporte } from '../server/utils/reportes'
import { rangoMes, type MovResumen } from '#shared/resumen'
import { mesesAtras, serieMensual, evolucionSaldo } from '#shared/reportes'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let fondoAId: number
let fondoBId: number
let cuentaABobId: number
let cuentaABob2Id: number
let cuentaAUsdId: number
let cuentaBBobId: number
let catGastoAId: number
let catIngresoAId: number

const hoy = hoyLocal()
const { desde, hasta } = rangoMes(hoy)

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `rep-${randomUUID()}@test.dev`, name: 'Reportes' }).returning({ id: users.id })
  userId = u.id

  const a = await crearFondo(userId, { nombre: 'Personal', tipo: 'personal', moneda_base: 'BOB' })
  const b = await crearFondo(userId, { nombre: 'Negocio', tipo: 'negocio', moneda_base: 'BOB' })
  fondoAId = a.id
  fondoBId = b.id

  cuentaABobId = (await crearCuenta(userId, fondoAId, { nombre: 'Efectivo', tipo: 'efectivo', moneda: 'BOB' })).id
  cuentaABob2Id = (await crearCuenta(userId, fondoAId, { nombre: 'Banco', tipo: 'banco', moneda: 'BOB' })).id
  cuentaAUsdId = (await crearCuenta(userId, fondoAId, { nombre: 'USD', tipo: 'ahorro', moneda: 'USD' })).id
  cuentaBBobId = (await crearCuenta(userId, fondoBId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB' })).id

  const catsA = await listarCategorias(userId, fondoAId)
  catGastoAId = catsA.find((c) => c.tipo === 'gasto')!.id
  catIngresoAId = catsA.find((c) => c.tipo === 'ingreso')!.id

  // Gasto BOB Bs 69,60 y gasto USD US$ 10 @ tasa 6,96 (equivalente Bs 69,60)
  await crearTransaccion(userId, fondoAId, { cuenta_id: cuentaABobId, categoria_id: catGastoAId, tipo: 'gasto', monto_centavos: 6960, fecha: hoy })
  await crearTransaccion(userId, fondoAId, { cuenta_id: cuentaAUsdId, categoria_id: catGastoAId, tipo: 'gasto', monto_centavos: 10000, tasa_ref: 6.96, fecha: hoy })
  await crearTransaccion(userId, fondoAId, { cuenta_id: cuentaABobId, categoria_id: catIngresoAId, tipo: 'ingreso', monto_centavos: 100000, fecha: hoy })

  // Transferencia (no debe afectar el resultado)
  await crearTransferencia(userId, fondoAId, { cuenta_origen_id: cuentaABobId, cuenta_destino_id: cuentaABob2Id, monto_origen_centavos: 25000, fecha: hoy })

  // Aporte A → B: gasto en A, ingreso en B
  await crearAporte(userId, { cuenta_destino_id: cuentaBBobId, monto_destino_centavos: 50000, cuenta_origen_id: cuentaABobId, fecha: hoy })
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(transacciones).where(eq(transacciones.user_id, userId))
  await db.delete(transferencias).where(eq(transferencias.user_id, userId))
  await db.delete(cuentas).where(eq(cuentas.user_id, userId))
  await db.delete(categorias).where(eq(categorias.user_id, userId))
  await db.delete(fondos).where(eq(fondos.user_id, userId))
  await db.delete(users).where(eq(users.id, userId))
})

describe('reportes (puro)', () => {
  it('mesesAtras devuelve las claves en orden cronológico', () => {
    expect(mesesAtras('2026-09-15', 3)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(mesesAtras('2026-01-05', 2)).toEqual(['2025-12', '2026-01'])
  })

  it('serieMensual agrupa ingresos y egresos por mes', () => {
    const movs: MovResumen[] = [
      { tipo: 'ingreso', monto_centavos: 10000, moneda: 'BOB', fecha: '2026-08-10' },
      { tipo: 'gasto', monto_centavos: 4000, moneda: 'BOB', fecha: '2026-08-11' },
      { tipo: 'ingreso', monto_centavos: 5000, moneda: 'BOB', fecha: '2026-09-02' },
    ]
    const s = serieMensual(movs, { hasta: '2026-09-15', meses: 3 })
    expect(s.map((p) => p.mes)).toEqual(['2026-07', '2026-08', '2026-09'])
    expect(s[1]).toEqual({ mes: '2026-08', ingresos_centavos: 10000, egresos_centavos: 4000, neto_centavos: 6000 })
    expect(s[2]!.ingresos_centavos).toBe(5000)
  })

  it('evolucionSaldo parte del saldo inicial y acumula día a día', () => {
    const movs: MovResumen[] = [
      { tipo: 'ingreso', monto_centavos: 100000, moneda: 'BOB', fecha: '2026-08-10' },
      { tipo: 'gasto', monto_centavos: 20000, moneda: 'BOB', fecha: '2026-09-01' },
      { tipo: 'ingreso', monto_centavos: 5000, moneda: 'BOB', fecha: '2026-09-02' },
    ]
    const e = evolucionSaldo(movs, { desde: '2026-09-01', hasta: '2026-09-03', saldoInicialCentavos: 50000 })
    expect(e).toEqual([
      { fecha: '2026-09-01', saldo_centavos: 130000 },
      { fecha: '2026-09-02', saldo_centavos: 135000 },
      { fecha: '2026-09-03', saldo_centavos: 135000 },
    ])
  })
})

describe.skipIf(!hasDb)('generarReporte (agregación)', () => {
  it('un gasto USD de US$ 10 con tasa_ref 6,96 suma Bs 69,60 al consolidado', async () => {
    const r = await generarReporte(userId, { fondoIds: [fondoAId, fondoBId], desde, hasta })
    // egresos = 6960 (BOB) + 69600 (USD×6.96) + 50000 (aporte gasto en A) = 126560
    expect(r.flujo.consolidado.egresos_centavos).toBe(126560)
    expect(r.flujo.consolidado.ingresos_centavos).toBe(150000) // 100000 + 50000 (aporte ingreso en B)
    expect(r.flujo.consolidado.neto_centavos).toBe(23440)
    expect(r.nota).toContain('equivalente histórico')
  })

  it('el reporte por categoría cuadra con el total de gastos', async () => {
    const r = await generarReporte(userId, { fondoIds: [fondoAId, fondoBId], desde, hasta })
    expect(r.total_gastos_centavos).toBe(r.flujo.consolidado.egresos_centavos)
    expect(r.gastos_por_categoria.reduce((s, c) => s + c.centavos, 0)).toBe(126560)
  })

  it('la transferencia no altera ingresos/egresos/neto', async () => {
    const conTransferencia = await generarReporte(userId, { fondoIds: [fondoAId], desde, hasta })
    // Si la transferencia contara, egresos serían mayores. Compara contra el cálculo manual.
    expect(conTransferencia.flujo.consolidado.egresos_centavos).toBe(6960 + 69600 + 50000)
    expect(conTransferencia.flujo.consolidado.ingresos_centavos).toBe(100000)
  })

  it('un aporte es gasto en el origen e ingreso en el destino', async () => {
    const origen = await generarReporte(userId, { fondoIds: [fondoAId], desde, hasta })
    const destino = await generarReporte(userId, { fondoIds: [fondoBId], desde, hasta })
    expect(origen.flujo.consolidado.egresos_centavos).toBe(126560)
    expect(destino.flujo.consolidado.ingresos_centavos).toBe(50000)
    expect(destino.flujo.consolidado.egresos_centavos).toBe(0)
  })

  it('la serie mensual incluye el mes en curso y la evolución del saldo cierra en el total', async () => {
    const r = await generarReporte(userId, { fondoIds: [fondoAId, fondoBId], desde, hasta })
    const mesActual = hasta.slice(0, 7)
    const punto = r.serie_mensual.find((p) => p.mes === mesActual)!
    expect(punto.ingresos_centavos).toBe(150000)
    expect(r.evolucion_saldo.at(-1)!.saldo_centavos).toBe(23440 + r.saldo_inicial_centavos)
  })

  it('rechaza un fondo ajeno o inexistente', async () => {
    const otro = await db.insert(users).values({ email: `rep-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
    const otroId = otro[0]!.id
    const fondoAjeno = await crearFondo(otroId, { nombre: 'Ajeno', tipo: 'personal', moneda_base: 'BOB' })
    await expect(generarReporte(userId, { fondoIds: [fondoAjeno.id], desde, hasta })).rejects.toMatchObject({ statusCode: 400 })
    await db.delete(categorias).where(eq(categorias.user_id, otroId))
    await db.delete(fondos).where(eq(fondos.user_id, otroId))
    await db.delete(users).where(eq(users.id, otroId))
  })
})
