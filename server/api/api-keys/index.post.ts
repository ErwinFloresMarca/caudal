import { defineEventHandler, readBody, createError } from 'h3'
import { authUserId } from '../../utils/auth'
import { db } from '../../utils/db'
import { apiKeys } from '../../db/schema'
import { generateApiKey, hashApiKey } from '../../../shared/api-keys'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const body = (await readBody<{ nombre?: string }>(event).catch(() => null)) ?? {}

  const nombre = (body.nombre ?? '').trim() || 'API key'
  const key = generateApiKey()

  const [created] = await db
    .insert(apiKeys)
    .values({ user_id: userId, nombre, key_hash: hashApiKey(key) })
    .returning({ id: apiKeys.id, nombre: apiKeys.nombre })

  if (!created) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo crear la API key' })
  }

  return { id: created.id, nombre: created.nombre, key }
})