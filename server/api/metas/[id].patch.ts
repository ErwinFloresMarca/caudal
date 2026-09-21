import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { editarMeta, parseMeta } from '../../utils/metas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const meta = await editarMeta(userId, id, parseMeta(body))
  if (!meta) {
    throw createError({ statusCode: 404, statusMessage: 'Meta no encontrada' })
  }
  return { meta }
})
