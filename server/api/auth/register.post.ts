import { defineEventHandler, createError, readBody } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from '../../utils/db'
import { users } from '../../db/schema'
import { hashPasswordScrypt } from '../../../shared/password'

export interface RegisterBody {
  email?: string
  password?: string
  name?: string
}

export default defineEventHandler(async (event) => {
  const body = await readBody<RegisterBody>(event).catch(() => ({}) as RegisterBody)
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Email no válido' })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'La contraseña debe tener al menos 8 caracteres' })
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing[0]) {
    throw createError({ statusCode: 409, statusMessage: 'Ese email ya está registrado' })
  }

  const user = {
    email,
    name: (body.name ?? '').trim() || (email.split('@')[0] ?? ''),
    password_hash: await hashPasswordScrypt(password),
  }

  const [created] = await db.insert(users).values(user).returning({
    id: users.id,
    email: users.email,
    name: users.name,
  })
  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo crear el usuario' })
  }

  await setUserSession(event, {
    user: { id: created.id, email: created.email, name: created.name },
  })

  return { id: created.id, email: created.email, name: created.name }
})