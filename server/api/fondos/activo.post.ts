import { defineEventHandler, createError, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { getFondoPublico } from '../../utils/fondos'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number((await readBody<{ id?: number }>(event).catch(() => null))?.id)

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'id inválido' })
  }
  const fondo = await getFondoPublico(userId, id)
  if (!fondo) {
    throw createError({ statusCode: 404, statusMessage: 'Fondo no encontrado' })
  }

  const session = await getUserSession(event)
  if (session.user) {
    await setUserSession(event, { ...session, user: session.user, fondo_activo_id: id })
  }

  return { fondo }
})