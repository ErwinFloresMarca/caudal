import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import {
  users, fondos, cuentas, categorias, transacciones, transferencias, recurrentes,
  deudas, cuotas, metasAhorro, aportesMeta, presupuestos, settings,
} from '../server/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta, getCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { crearTransaccion } from '../server/utils/transacciones'
import { callTool, TOOLS } from '../server/utils/mcp'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let fondoId: number
let cuentaBobId: number
let cuentaUsdId: number
let catGastoId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `mcp-${randomUUID()}@test.dev`, name: 'MCP' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `mcp-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo MCP', tipo: 'personal', moneda_base: 'BOB' })
  fondoId = fondo.id
  cuentaBobId = (await crearCuenta(userId, fondoId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 100000 })).id
  cuentaUsdId = (await crearCuenta(userId, fondoId, { nombre: 'USD', tipo: 'ahorro', moneda: 'USD', saldo_inicial_centavos: 0 })).id
  catGastoId = (await listarCategorias(userId, fondoId)).find((c) => c.tipo === 'gasto')!.id
})

afterAll(async () => {
  if (!hasDb) return
  const uids = [userId, userIdOtro]
  const metaIds = (await db.select({ id: metasAhorro.id }).from(metasAhorro).where(inArray(metasAhorro.user_id, uids))).map((m) => m.id)
  if (metaIds.length) await db.delete(aportesMeta).where(inArray(aportesMeta.meta_id, metaIds))
  const deudaIds = (await db.select({ id: deudas.id }).from(deudas).where(inArray(deudas.user_id, uids))).map((d) => d.id)
  if (deudaIds.length) await db.delete(cuotas).where(inArray(cuotas.deuda_id, deudaIds))
  await db.delete(transacciones).where(inArray(transacciones.user_id, uids))
  await db.delete(transferencias).where(inArray(transferencias.user_id, uids))
  await db.delete(recurrentes).where(inArray(recurrentes.user_id, uids))
  await db.delete(deudas).where(inArray(deudas.user_id, uids))
  await db.delete(metasAhorro).where(inArray(metasAhorro.user_id, uids))
  await db.delete(presupuestos).where(inArray(presupuestos.user_id, uids))
  await db.delete(cuentas).where(inArray(cuentas.user_id, uids))
  await db.delete(categorias).where(inArray(categorias.user_id, uids))
  await db.delete(fondos).where(inArray(fondos.user_id, uids))
  await db.delete(settings).where(inArray(settings.user_id, uids))
  await db.delete(users).where(inArray(users.id, uids))
})

describe('MCP tools (definición)', () => {
  it('expone el set completo (54 tools) con inputSchema', () => {
    const nombres = new Set(TOOLS.map((t) => t.name))
    expect(TOOLS.length).toBe(54)
    for (const n of ['list_funds', 'create_fund', 'create_account', 'create_category', 'delete_category', 'update_transaction', 'delete_transaction', 'create_aporte', 'create_recurrente', 'confirm_recurrente', 'create_deuda', 'pay_cuota', 'create_meta', 'create_meta_contribution', 'upsert_budget', 'compensate_budget', 'update_settings', 'get_report']) {
      expect(nombres.has(n)).toBe(true)
    }
    for (const t of TOOLS) expect(t.inputSchema).toHaveProperty('type', 'object')
  })
})

describe.skipIf(!hasDb)('MCP callTool', () => {
  it('list_funds / list_accounts / get_balances con tasa histórica', async () => {
    const fondos = (await callTool(userId, 'list_funds', {})) as { id: number }[]
    expect(fondos.some((f) => f.id === fondoId)).toBe(true)

    await crearTransaccion(userId, fondoId, { cuenta_id: cuentaUsdId, categoria_id: catGastoId, tipo: 'gasto', monto_centavos: 1000, tasa_ref: 6.96 })
    const r = (await callTool(userId, 'get_balances', { fund_id: fondoId })) as { por_moneda: { moneda: string; centavos: number }[]; consolidado: { tasa_ref: number | null } }
    const bob = r.por_moneda.find((m) => m.moneda === 'BOB')!
    const usd = r.por_moneda.find((m) => m.moneda === 'USD')!
    expect(usd.centavos).toBe(-1000)
    expect(r.consolidado.tasa_ref).toBe(6.96)
    expect((await callTool(userId, 'list_accounts', { fund_id: fondoId })) as { cuentas: unknown[] }).toHaveProperty('cuentas')
    expect(bob.centavos).toBeGreaterThan(0)
  })

  it('get_balances consolida con la tasa de Ajustes si el fondo no tiene tasa histórica', async () => {
    const fondo = await crearFondo(userId, { nombre: 'Fondo saldo inicial', tipo: 'personal', moneda_base: 'BOB' })
    await crearCuenta(userId, fondo.id, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 50000 })
    await crearCuenta(userId, fondo.id, { nombre: 'Ahorro USD', tipo: 'ahorro', moneda: 'USD', saldo_inicial_centavos: 10000 })
    await callTool(userId, 'update_settings', { tasa: 12.32 })

    const r = (await callTool(userId, 'get_balances', { fund_id: fondo.id, base: 'BOB' })) as { consolidado: { tasa_ref: number; centavos: number } | null }
    expect(r.consolidado).not.toBeNull()
    expect(r.consolidado!.tasa_ref).toBe(12.32)
    expect(r.consolidado!.centavos).toBe(50000 + Math.round(10000 * 12.32))
  })

  it('create_transaction con "12,50" y fuente=asistente; update y delete', async () => {
    const antes = (await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos
    const trx = (await callTool(userId, 'create_transaction', { cuenta_id: cuentaBobId, categoria_id: catGastoId, tipo: 'gasto', monto: '12,50', nota: 'café' })) as { id: number; monto_centavos: number; fuente: string | null }
    expect(trx.monto_centavos).toBe(1250)
    expect(trx.fuente).toBe('asistente')
    expect((await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos).toBe(antes - 1250)

    const upd = (await callTool(userId, 'update_transaction', { transaction_id: trx.id, tipo: 'gasto', monto: '20,00' })) as { monto_centavos: number }
    expect(upd.monto_centavos).toBe(2000)

    await callTool(userId, 'delete_transaction', { transaction_id: trx.id })
    expect((await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos).toBe(antes)
  })

  it('create_transaction con cuenta ajena falla y no crea nada', async () => {
    const otroFondo = await crearFondo(userIdOtro, { nombre: 'Ajeno', tipo: 'personal', moneda_base: 'BOB' })
    const [cuentaAjena] = await db.insert(cuentas).values({ user_id: userIdOtro, fondo_id: otroFondo.id, nombre: 'Ajena', tipo: 'efectivo', moneda: 'BOB' }).returning({ id: cuentas.id })
    const antes = (await db.select({ id: transacciones.id }).from(transacciones).where(eq(transacciones.user_id, userId))).length
    await expect(callTool(userId, 'create_transaction', { cuenta_id: cuentaAjena!.id, tipo: 'gasto', monto: '1,00' })).rejects.toThrow(/cuenta no encontrada/)
    expect((await db.select({ id: transacciones.id }).from(transacciones).where(eq(transacciones.user_id, userId))).length).toBe(antes)
  })

  it('fondos, cuentas y categorías: crear/editar/ocultar/borrar', async () => {
    const fund = (await callTool(userId, 'create_fund', { nombre: 'MCP Fondo', tipo: 'negocio', moneda_base: 'USD' })) as { id: number }
    expect(fund.id).toBeGreaterThan(0)
    await callTool(userId, 'update_fund', { fund_id: fund.id, activo: false })
    const tras = (await callTool(userId, 'list_funds', {})) as { id: number }[]
    expect(tras.some((f) => f.id === fund.id)).toBe(false)

    const acc = (await callTool(userId, 'create_account', { fund_id: fondoId, nombre: 'MCP Cuenta', tipo: 'banco' })) as { id: number }
    await callTool(userId, 'update_account', { account_id: acc.id, nombre: 'MCP Cuenta 2' })
    await callTool(userId, 'update_account', { account_id: acc.id, activo: false })

    const cat = (await callTool(userId, 'create_category', { fund_id: fondoId, nombre: 'MCP Cat', tipo: 'gasto' })) as { id: number }
    await callTool(userId, 'update_category', { category_id: cat.id, nombre: 'MCP Cat 2' })
    await callTool(userId, 'delete_category', { category_id: cat.id })
  })

  it('aportes, recurrentes, deudas y metas', async () => {
    const negocio = await crearFondo(userId, { nombre: 'MCP Negocio', tipo: 'negocio', moneda_base: 'BOB' })
    const caja = await crearCuenta(userId, negocio.id, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB' })

    const aporte = (await callTool(userId, 'create_aporte', { cuenta_destino_id: caja.id, monto: '30,00', cuenta_origen_id: cuentaBobId })) as { grupo_id: number }
    expect(aporte.grupo_id).toBeGreaterThan(0)
    expect((await callTool(userId, 'list_aportes', { fund_id: negocio.id })) as unknown[]).toHaveLength(1)

    const rec = (await callTool(userId, 'create_recurrente', { cuenta_id: cuentaBobId, tipo: 'gasto', monto: '5,00', cadencia: { frecuencia: 'mensual' }, proxima_fecha: '2020-01-01' })) as { id: number }
    expect(rec.id).toBeGreaterThan(0)
    const conf = (await callTool(userId, 'confirm_recurrente', { recurrente_id: rec.id })) as { transaccion: { id: number } }
    expect(conf.transaccion.id).toBeGreaterThan(0)

    const deuda = (await callTool(userId, 'create_deuda', { contraparte: 'MCP Banco', direccion: 'por_pagar', monto: '20,00', num_cuotas: 2, fecha_inicio: '2026-01-01' })) as { id: number; cuotas: { id: number }[] }
    const pago = (await callTool(userId, 'pay_cuota', { deuda_id: deuda.id, cuota_id: deuda.cuotas[0]!.id, cuenta_id: cuentaBobId })) as { cuota: { pagada: boolean } }
    expect(pago.cuota.pagada).toBe(true)

    const meta = (await callTool(userId, 'create_meta', { nombre: 'MCP Meta', monto_objetivo: '100,00' })) as { id: number }
    const ap = (await callTool(userId, 'create_meta_contribution', { meta_id: meta.id, monto: '25,00' })) as { meta: { progreso: { porcentaje: number } } }
    expect(ap.meta.progreso.porcentaje).toBe(25)
  })

  it('presupuestos y ajustes', async () => {
    const mes = new Date().toISOString().slice(0, 7)
    const pres = (await callTool(userId, 'upsert_budget', { categoria_id: catGastoId, monto: '100,00', mes })) as { id: number }
    expect(pres.id).toBeGreaterThan(0)
    const lista = (await callTool(userId, 'list_budgets', { fund_id: fondoId, mes })) as { presupuestos: { id: number }[] }
    expect(lista.presupuestos.some((p) => p.id === pres.id)).toBe(true)

    await callTool(userId, 'update_settings', { moneda_base: 'USD', tasa: 6.96 })
    const st = (await callTool(userId, 'get_settings', {})) as { moneda_base: string; tasa: { actual: { valor: number } | null } }
    expect(st.moneda_base).toBe('USD')
    expect(st.tasa.actual?.valor).toBe(6.96)
    await callTool(userId, 'update_settings', { moneda_base: 'BOB' })
  })

  it('get_report devuelve el flujo del período', async () => {
    const rep = (await callTool(userId, 'get_report', { from: '2026-01-01', to: '2026-12-31', base: 'BOB' })) as { flujo: { consolidado: { neto_centavos: number } } }
    expect(rep.flujo.consolidado).toHaveProperty('neto_centavos')
  })
})
