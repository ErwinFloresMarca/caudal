import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { getTransferencia } from '../../utils/transferencias'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const transferencia = await getTransferencia(userId, id)
  if (!transferencia) {
    throw createError({ statusCode: 404, statusMessage: 'Transferencia no encontrada' })
  }
  return { transferencia }
})