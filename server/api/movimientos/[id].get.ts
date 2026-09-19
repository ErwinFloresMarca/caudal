import { defineEventHandler, createError } from 'h3'
import { authUserId } from '../../utils/auth'
import { getTransaccion } from '../../utils/transacciones'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))

  const transaccion = await getTransaccion(userId, id)
  if (!transaccion) {
    throw createError({ statusCode: 404, statusMessage: 'Transacción no encontrada' })
  }

  return { transaccion }
})