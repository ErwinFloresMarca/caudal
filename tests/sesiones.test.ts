import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { versionSesion, sesionVigente, cerrarTodasLasSesiones } from '../server/utils/sesiones'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let otroId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `ses-${randomUUID()}@test.dev`, name: 'Sesiones' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `ses-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  otroId = o.id
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(users).where(eq(users.id, userId))
  await db.delete(users).where(eq(users.id, otroId))
})

describe('sesiones', () => {
  it('arranca en 0 y una cookie sin versión cuenta como válida', async () => {
    if (!hasDb) return
    expect(await versionSesion(userId)).toBe(0)
    expect(await sesionVigente(userId, undefined)).toBe(true)
    expect(await sesionVigente(userId, 0)).toBe(true)
    expect(await sesionVigente(userId, 1)).toBe(false)
  })

  it('cerrar todas invalida las versiones anteriores', async () => {
    if (!hasDb) return
    expect(await cerrarTodasLasSesiones(userId)).toBe(1)
    expect(await sesionVigente(userId, 0)).toBe(false)
    expect(await sesionVigente(userId, undefined)).toBe(false)
    expect(await sesionVigente(userId, 1)).toBe(true)
  })

  it('acumula y una sesión nueva sigue viva', async () => {
    if (!hasDb) return
    expect(await cerrarTodasLasSesiones(userId)).toBe(2)
    expect(await sesionVigente(userId, 1)).toBe(false)
    expect(await sesionVigente(userId, 2)).toBe(true)
  })

  it('no toca a otros usuarios', async () => {
    if (!hasDb) return
    expect(await versionSesion(otroId)).toBe(0)
    expect(await sesionVigente(otroId, 0)).toBe(true)
  })
})
