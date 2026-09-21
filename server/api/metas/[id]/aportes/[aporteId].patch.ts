import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../../../utils/auth'
import { editarAporteMeta, parseAporteMeta } from '../../../../utils/metas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const metaId = Number(getRouterParam(event, 'id'))
  const aporteId = Number(getRouterParam(event, 'aporteId'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const res = await editarAporteMeta(userId, metaId, aporteId, parseAporteMeta(body))
  if (!res.aporte) {
    throw createError({ statusCode: 404, statusMessage: 'Aporte no encontrado' })
  }
  return res
})
