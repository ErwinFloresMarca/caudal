import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { editarTransferencia, parseTransferencia } from '../../utils/transferencias'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const transferencia = await editarTransferencia(userId, id, parseTransferencia(body))
  if (!transferencia) {
    throw createError({ statusCode: 404, statusMessage: 'Transferencia no encontrada' })
  }
  return { transferencia }
})