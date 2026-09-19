import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { borrarTransferencia } from '../../utils/transferencias'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  await borrarTransferencia(userId, id)
  return { exito: true }
})