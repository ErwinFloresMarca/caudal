import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { borrarDeuda } from '../../utils/deudas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const borrada = await borrarDeuda(userId, id)
  return { borrada, eliminada: true }
})
