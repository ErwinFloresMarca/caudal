import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { apiKeys } from '../db/schema'
import { hashApiKey, isApiKeyFormat } from '../../shared/api-keys'

type AuthContext = { authUserId?: number }

/**
 * user_id de la petición: API key (Bearer) o sesión de navegador.
 * Nunca proviene del cuerpo de la petición. 401 si no hay autenticación.
 * El resultado queda cacheado en event.context para el middleware y la ruta.
 */
export async function authUserId(event: H3Event): Promise<number> {
  const cached = (event.context as AuthContext).authUserId
  if (cached) return cached

  const header = getHeader(event, 'authorization')
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim()
    if (!isApiKeyFormat(token)) {
      throw createError({ statusCode: 401, statusMessage: 'API key inválida' })
    }
    const [key] = await db
      .select({ id: apiKeys.id, user_id: apiKeys.user_id })
      .from(apiKeys)
      .where(eq(apiKeys.key_hash, hashApiKey(token)))
      .limit(1)
    if (!key) {
      throw createError({ statusCode: 401, statusMessage: 'API key inválida' })
    }
    await db.update(apiKeys).set({ last_used_at: new Date() }).where(eq(apiKeys.id, key.id))
    event.context.authUserId = key.user_id
    return key.user_id
  }

  const { user } = await requireUserSession(event)
  const id = Number((user as { id?: number } | undefined)?.id)
  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
  }
  event.context.authUserId = id
  return id
}