import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { editarRecurrente, parseRecurrente } from '../../utils/recurrentes'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const recurrente = await editarRecurrente(userId, id, parseRecurrente(body))
  if (!recurrente) {
    throw createError({ statusCode: 404, statusMessage: 'Recurrente no encontrado' })
  }
  return { recurrente }
})
