import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, oauthAccounts } from '../server/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { hashPasswordScrypt } from '../shared/password'
import { findOrCreateOAuthUser } from '../server/utils/users'

const hasDb = Boolean(process.env.DATABASE_URL)

let emailNuevo: string
let emailExistente: string
let emailOtro: string
let emailAislado: string

beforeAll(async () => {
  if (!hasDb) return
  emailNuevo = `oauth-nuevo-${randomUUID()}@test.dev`
  emailExistente = `oauth-existe-${randomUUID()}@test.dev`
  emailOtro = `oauth-otro-${randomUUID()}@test.dev`
  emailAislado = `oauth-aislado-${randomUUID()}@test.dev`

  await db
    .insert(users)
    .values({ email: emailExistente, name: 'Con contraseña', password_hash: await hashPasswordScrypt('clave-segura-123') })
  await db.insert(users).values({ email: emailOtro, name: 'Otro' })
})

afterAll(async () => {
  if (!hasDb) return
  const creados = await db.select({ id: users.id }).from(users).where(inArray(users.email, [emailNuevo, emailExistente, emailOtro, emailAislado]))
  const ids = creados.map((u) => u.id)
  if (ids.length) await db.delete(oauthAccounts).where(inArray(oauthAccounts.user_id, ids))
  await db.delete(users).where(inArray(users.id, ids))
})

describe.skipIf(!hasDb)('findOrCreateOAuthUser (SPC-023)', () => {
  it('email nuevo: crea usuario sin contraseña + cuenta OAuth', async () => {
    const user = await findOrCreateOAuthUser({ provider: 'google', providerId: 'g-nuevo-1', email: emailNuevo, name: 'Nuevo', avatarUrl: 'https://img/1' })
    expect(user.password_hash).toBeNull()
    expect(user.email).toBe(emailNuevo)
    expect(user.avatar_url).toBe('https://img/1')

    const cuentas = await db
      .select()
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.provider, 'google'), eq(oauthAccounts.provider_id, 'g-nuevo-1')))
    expect(cuentas.length).toBe(1)
    expect(cuentas[0]!.user_id).toBe(user.id)
    // No se persisten tokens: la fila solo tiene identidad.
    expect(Object.keys(cuentas[0]!)).not.toContain('access_token')
    expect(Object.keys(cuentas[0]!)).not.toContain('refresh_token')
  })

  it('email ya existente con contraseña: no duplica usuario y lo vincula', async () => {
    const user = await findOrCreateOAuthUser({ provider: 'google', providerId: 'g-existe-1', email: emailExistente, name: 'Vinculado' })
    const filas = await db.select({ id: users.id }).from(users).where(eq(users.email, emailExistente))
    expect(filas.length).toBe(1)
    expect(filas[0]!.id).toBe(user.id)
    expect(user.password_hash).not.toBeNull()

    const cuentas = await db.select().from(oauthAccounts).where(eq(oauthAccounts.user_id, user.id))
    expect(cuentas.some((c) => c.provider_id === 'g-existe-1')).toBe(true)
  })

  it('reintentar con la misma cuenta reutiliza el user_id (sin duplicados)', async () => {
    const primero = await findOrCreateOAuthUser({ provider: 'google', providerId: 'g-nuevo-1', email: emailNuevo, name: 'Nuevo', avatarUrl: 'https://img/2' })
    const segundo = await findOrCreateOAuthUser({ provider: 'google', providerId: 'g-nuevo-1', email: emailNuevo, name: 'Nuevo' })
    expect(segundo.id).toBe(primero.id)

    const filas = await db.select({ id: users.id }).from(users).where(eq(users.email, emailNuevo))
    expect(filas.length).toBe(1)
    const cuentas = await db
      .select({ id: oauthAccounts.id })
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.provider, 'google'), eq(oauthAccounts.provider_id, 'g-nuevo-1')))
    expect(cuentas.length).toBe(1)
  })

  it('no toca los datos de otro usuario', async () => {
    const [otroAntes] = await db.select().from(users).where(eq(users.email, emailOtro))
    await findOrCreateOAuthUser({ provider: 'google', providerId: 'g-aislado-1', email: emailAislado, name: 'Aislado' })
    const [otroDespues] = await db.select().from(users).where(eq(users.email, emailOtro))
    expect(otroDespues!.id).toBe(otroAntes!.id)
    expect(otroDespues!.name).toBe('Otro')
    const cuentasOtro = await db.select({ id: oauthAccounts.id }).from(oauthAccounts).where(eq(oauthAccounts.user_id, otroAntes!.id))
    expect(cuentasOtro.length).toBe(0)
  })
})
