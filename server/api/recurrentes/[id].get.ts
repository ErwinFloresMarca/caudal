import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { getRecurrente } from '../../utils/recurrentes'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const recurrente = await getRecurrente(userId, id)
  if (!recurrente) {
    throw createError({ statusCode: 404, statusMessage: 'Recurrente no encontrado' })
  }
  return { recurrente }
})
