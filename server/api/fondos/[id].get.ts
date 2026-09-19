import { defineEventHandler, createError } from 'h3'
import { authUserId } from '../../utils/auth'
import { getFondoPublico } from '../../utils/fondos'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const fondo = await getFondoPublico(userId, id)
  if (!fondo) {
    throw createError({ statusCode: 404, statusMessage: 'Fondo no encontrado' })
  }
  return { fondo }
})