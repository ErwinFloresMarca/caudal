import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { getDeuda } from '../../utils/deudas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const deuda = await getDeuda(userId, id)
  if (!deuda) {
    throw createError({ statusCode: 404, statusMessage: 'Deuda no encontrada' })
  }
  return { deuda }
})
