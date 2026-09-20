import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../../utils/auth'
import { saltarRecurrente } from '../../../utils/recurrentes'

// Salta una ocurrencia: avanza proxima_fecha sin crear transacción.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const recurrente = await saltarRecurrente(userId, id)
  return { recurrente }
})
