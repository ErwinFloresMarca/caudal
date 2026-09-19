import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { editarTransaccion, parseTransaccion } from '../../utils/transacciones'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}

  const transaccion = await editarTransaccion(userId, id, parseTransaccion(body))
  if (!transaccion) {
    throw createError({ statusCode: 404, statusMessage: 'Transacción no encontrada' })
  }
  return { transaccion }
})