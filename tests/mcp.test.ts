import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, settings } from '../server/db/schema'
import { eq } from 'drizzle-orm'
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
  await db.delete(transacciones).where(eq(transacciones.user_id, userId))
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdOtro))
  await db.delete(cuentas).where(eq(cuentas.user_id, userId))
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdOtro))
  await db.delete(categorias).where(eq(categorias.user_id, userId))
  await db.delete(categorias).where(eq(categorias.user_id, userIdOtro))
  await db.delete(fondos).where(eq(fondos.user_id, userId))
  await db.delete(fondos).where(eq(fondos.user_id, userIdOtro))
  await db.delete(settings).where(eq(settings.user_id, userId))
  await db.delete(users).where(eq(users.id, userId))
  await db.delete(users).where(eq(users.id, userIdOtro))
})

describe('MCP tools (definición)', () => {
  it('expone las 9 tools con inputSchema', () => {
    const nombres = TOOLS.map((t) => t.name)
    expect(nombres).toEqual([
      'list_funds',
      'list_accounts',
      'get_balances',
      'list_categories',
      'list_transactions',
      'create_transaction',
      'create_transfer',
      'get_month_summary',
      'list_pending',
    ])
    for (const t of TOOLS) expect(t.inputSchema).toHaveProperty('type', 'object')
  })
})

describe.skipIf(!hasDb)('MCP callTool', () => {
  it('list_funds / list_accounts devuelven datos del usuario', async () => {
    const fondos = (await callTool(userId, 'list_funds', {})) as { id: number }[]
    expect(fondos.some((f) => f.id === fondoId)).toBe(true)

    const res = (await callTool(userId, 'list_accounts', { fund_id: fondoId })) as { cuentas: { id: number }[] }
    expect(res.cuentas.some((c) => c.id === cuentaBobId)).toBe(true)
  })

  it('get_balances consolida con la tasa histórica de cada movimiento', async () => {
    // Gasto USD 10 con tasa 6.96 → equivalente Bs 69,60 (aunque hoy el paralelo sea otro).
    await crearTransaccion(userId, fondoId, { cuenta_id: cuentaUsdId, categoria_id: catGastoId, tipo: 'gasto', monto_centavos: 1000, tasa_ref: 6.96 })
    const r = (await callTool(userId, 'get_balances', { fund_id: fondoId })) as { por_moneda: { moneda: string; centavos: number }[]; consolidado: { centavos: number; tasa_ref: number | null; nota: string | null } }
    const bob = r.por_moneda.find((m) => m.moneda === 'BOB')!
    const usd = r.por_moneda.find((m) => m.moneda === 'USD')!
    expect(usd.centavos).toBe(-1000)
    expect(r.consolidado.tasa_ref).toBe(6.96)
    expect(r.consolidado.centavos).toBe(bob.centavos + Math.round(-1000 * 6.96))
    expect(r.consolidado.nota).toContain('tasa histórica')
  })

  it('create_transaction con "12,50" en BOB crea 1250 centavos, afecta el saldo y fuente=asistente', async () => {
    const antes = (await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos
    const trx = (await callTool(userId, 'create_transaction', { cuenta_id: cuentaBobId, categoria_id: catGastoId, tipo: 'gasto', monto: '12,50', nota: 'café' })) as { monto_centavos: number; fuente: string | null }
    expect(trx.monto_centavos).toBe(1250)
    expect(trx.fuente).toBe('asistente')
    expect((await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos).toBe(antes - 1250)
  })

  it('create_transaction con cuenta de otro usuario falla y no crea nada', async () => {
    const [cuentaAjena] = await db
      .insert(cuentas)
      .values({ user_id: userIdOtro, fondo_id: (await crearFondo(userIdOtro, { nombre: 'Ajeno', tipo: 'personal', moneda_base: 'BOB' })).id, nombre: 'Ajena', tipo: 'efectivo', moneda: 'BOB' })
      .returning({ id: cuentas.id })
    const antes = await db.select({ n: transacciones.id }).from(transacciones).where(eq(transacciones.user_id, userId))
    await expect(callTool(userId, 'create_transaction', { cuenta_id: cuentaAjena!.id, tipo: 'gasto', monto: '1,00' })).rejects.toThrow(/cuenta no encontrada/)
    const despues = await db.select({ n: transacciones.id }).from(transacciones).where(eq(transacciones.user_id, userId))
    expect(despues.length).toBe(antes.length)
  })

  it('get_month_summary y list_pending responden con la forma esperada', async () => {
    const resumen = (await callTool(userId, 'get_month_summary', { fund_id: fondoId })) as { consolidado: { ingresos_centavos: number; egresos_centavos: number; neto_centavos: number } }
    expect(resumen.consolidado).toHaveProperty('neto_centavos')

    const pend = (await callTool(userId, 'list_pending', { fund_id: fondoId })) as { recurrentes: unknown[]; cuotas: unknown[] }
    expect(Array.isArray(pend.recurrentes)).toBe(true)
    expect(Array.isArray(pend.cuotas)).toBe(true)
  })
})
