import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { editarDeuda, parseDeuda } from '../../utils/deudas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const deuda = await editarDeuda(userId, id, parseDeuda(body))
  if (!deuda) {
    throw createError({ statusCode: 404, statusMessage: 'Deuda no encontrada' })
  }
  return { deuda }
})
