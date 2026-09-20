import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { getAporte } from '../../utils/aportes'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const aporte = await getAporte(userId, id)
  if (!aporte) {
    throw createError({ statusCode: 404, statusMessage: 'Aporte no encontrado' })
  }
  return { aporte }
})
