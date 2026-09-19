import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import {
  users,
  fondos,
  cuentas,
  transacciones,
  apiKeys,
} from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { generateApiKey, hashApiKey } from '../shared/api-keys'

const hasDb = Boolean(process.env.DATABASE_URL)

let userIdA: number
let userIdB: number

beforeAll(async () => {
  if (!hasDb) return
  const [a] = await db.insert(users).values({ email: `iso-a-${randomUUID()}@test.dev`, name: 'Usuario A' }).returning({ id: users.id })
  const [b] = await db.insert(users).values({ email: `iso-b-${randomUUID()}@test.dev`, name: 'Usuario B' }).returning({ id: users.id })
  userIdA = a.id
  userIdB = b.id
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(apiKeys).where(eq(apiKeys.user_id, userIdB))
  const cuentasDeA = await db.select({ id: cuentas.id }).from(cuentas).where(eq(cuentas.user_id, userIdA))
  for (const c of cuentasDeA) {
    await db.delete(transacciones).where(eq(transacciones.cuenta_id, c.id))
  }
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdA))
  await db.delete(fondos).where(eq(fondos.user_id, userIdA))
  await db.delete(users).where(eq(users.id, userIdA))
  await db.delete(users).where(eq(users.id, userIdB))
})

describe.skipIf(!hasDb)('aislamiento multiusuario', () => {
  it('otro user_id NO ve fondos del usuario A', async () => {
    const [fondoA] = await db.insert(fondos).values({
      user_id: userIdA,
      nombre: 'Fondo A',
      tipo: 'personal',
      moneda_base: 'BOB',
    }).returning({ id: fondos.id })

    const deB = await db.select().from(fondos).where(eq(fondos.user_id, userIdB))
    expect(deB).toHaveLength(0)
    expect(deB.some((f) => f.id === fondoA.id)).toBe(false)

    const deA = await db.select().from(fondos).where(eq(fondos.user_id, userIdA))
    expect(deA.some((f) => f.id === fondoA.id)).toBe(true)
  })

  it('montos en enteros: 1250 = Bs 12,50; nunca un float', async () => {
    const [fondoA] = await db.select().from(fondos).where(eq(fondos.user_id, userIdA)).limit(1)
    const [cuentaA] = await db.insert(cuentas).values({
      user_id: userIdA,
      fondo_id: fondoA.id,
      nombre: 'Caja',
      tipo: 'efectivo',
      moneda: 'BOB',
      saldo_inicial_centavos: 1250,
    }).returning({ id: cuentas.id })

    await db.insert(transacciones).values({
      user_id: userIdA,
      fondo_id: fondoA.id,
      cuenta_id: cuentaA.id,
      tipo: 'ingreso',
      monto_centavos: 1250,
      moneda: 'BOB',
      fecha: '2026-09-19',
    })

    const [caja] = await db.select().from(cuentas).where(eq(cuentas.id, cuentaA.id))
    const [mov] = await db.select().from(transacciones).where(eq(transacciones.cuenta_id, cuentaA.id))
    expect(caja.saldo_inicial_centavos).toBe(1250)
    expect(mov.monto_centavos).toBe(1250)
    expect(Number.isInteger(mov.monto_centavos)).toBe(true)
  })

  it('tasa_ref nullable: transacción BOB sin tasa', async () => {
    const [fondoA] = await db.select().from(fondos).where(eq(fondos.user_id, userIdA)).limit(1)
    const [cuentaA] = await db.insert(cuentas).values({
      user_id: userIdA,
      fondo_id: fondoA.id,
      nombre: 'Banco',
      tipo: 'banco',
      moneda: 'BOB',
    }).returning({ id: cuentas.id })

    const [mov] = await db.insert(transacciones).values({
      user_id: userIdA,
      fondo_id: fondoA.id,
      cuenta_id: cuentaA.id,
      tipo: 'gasto',
      monto_centavos: 500,
      moneda: 'BOB',
      fecha: '2026-09-18',
    }).returning({ id: transacciones.id })

    const leido = await db.select({ tasa_ref: transacciones.tasa_ref }).from(transacciones).where(eq(transacciones.id, mov.id))
    expect(leido[0].tasa_ref).toBeNull()
  })

  it('API key de B resuelve a user_id de B y NO ve datos de A', async () => {
    const [fondoA] = await db.select().from(fondos).where(eq(fondos.user_id, userIdA)).limit(1)
    const key = generateApiKey()

    const [keyB] = await db.insert(apiKeys).values({
      user_id: userIdB,
      nombre: 'key test',
      key_hash: hashApiKey(key),
    }).returning({ id: apiKeys.id })

    const [resuelta] = await db
      .select({ user_id: apiKeys.user_id })
      .from(apiKeys)
      .where(eq(apiKeys.key_hash, hashApiKey(key)))
    expect(resuelta.user_id).toBe(userIdB)

    const deBLasApiKeys = await db.select().from(fondos).where(eq(fondos.user_id, resuelta.user_id))
    expect(deBLasApiKeys.some((f) => f.id === fondoA.id)).toBe(false)

    const [row] = await db
      .select({ last_used_at: apiKeys.last_used_at })
      .from(apiKeys)
      .where(eq(apiKeys.id, keyB.id))
    expect(row.last_used_at).toBeNull()
  })
})