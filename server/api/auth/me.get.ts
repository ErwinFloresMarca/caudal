import { defineEventHandler } from 'h3'
import { authUserId } from '../../utils/auth'
import { eq } from 'drizzle-orm'
import { db } from '../../utils/db'
import { users } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return user ?? { id: userId, email: null, name: null }
})