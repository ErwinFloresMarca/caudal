import { defineEventHandler, createError, getRouterParam } from 'h3'
import { and, eq } from 'drizzle-orm'
import { authUserId } from '../../utils/auth'
import { db } from '../../utils/db'
import { apiKeys } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'ID no válido' })
  }

  const deleted = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.user_id, userId)))
    .returning({ id: apiKeys.id })

  if (!deleted[0]) {
    throw createError({ statusCode: 404, statusMessage: 'API key no encontrada' })
  }
  return { ok: true }
})