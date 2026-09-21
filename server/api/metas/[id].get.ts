import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { getMeta } from '../../utils/metas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const meta = await getMeta(userId, id)
  if (!meta) {
    throw createError({ statusCode: 404, statusMessage: 'Meta no encontrada' })
  }
  return { meta }
})
