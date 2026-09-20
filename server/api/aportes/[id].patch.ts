import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { editarAporte, parseAporte } from '../../utils/aportes'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const aporte = await editarAporte(userId, id, parseAporte(body))
  if (!aporte) {
    throw createError({ statusCode: 404, statusMessage: 'Aporte no encontrado' })
  }
  return { aporte }
})
