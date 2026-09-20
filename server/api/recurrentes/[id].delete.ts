import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { borrarRecurrente } from '../../utils/recurrentes'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const borrado = await borrarRecurrente(userId, id)
  return { borrado, eliminado: true }
})
