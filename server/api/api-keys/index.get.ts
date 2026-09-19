import { defineEventHandler } from 'h3'
import { desc, eq } from 'drizzle-orm'
import { authUserId } from '../../utils/auth'
import { db } from '../../utils/db'
import { apiKeys } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)

  return db
    .select({
      id: apiKeys.id,
      nombre: apiKeys.nombre,
      created_at: apiKeys.created_at,
      last_used_at: apiKeys.last_used_at,
    })
    .from(apiKeys)
    .where(eq(apiKeys.user_id, userId))
    .orderBy(desc(apiKeys.created_at))
})