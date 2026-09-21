import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { borrarMeta } from '../../utils/metas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const borrada = await borrarMeta(userId, id)
  return { borrada, eliminada: true }
})
