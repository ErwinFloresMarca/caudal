import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { crearMeta, parseMeta } from '../utils/metas'

// Crea una meta de ahorro en el fondo activo.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    throw createError({ statusCode: 400, statusMessage: 'Crea un fondo antes de registrar metas' })
  }
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  return { fondo, meta: await crearMeta(userId, fondo.id, parseMeta(body)) }
})
