import { defineEventHandler, createError, readBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../utils/db'
import { users } from '../../db/schema'
import { verifyPasswordScrypt } from '../../../shared/password'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string; password?: string }>(event).catch(() => ({} as { email?: string; password?: string }))
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user || !user.password_hash || !(await verifyPasswordScrypt(user.password_hash, password))) {
    throw createError({ statusCode: 401, statusMessage: 'Email o contraseña incorrectos' })
  }

  await setUserSession(event, {
    user: { id: user.id, email: user.email, name: user.name },
  })

  return { id: user.id, email: user.email, name: user.name }
})