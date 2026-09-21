import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../../../utils/auth'
import { borrarAporte } from '../../../../utils/metas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const metaId = Number(getRouterParam(event, 'id'))
  const aporteId = Number(getRouterParam(event, 'aporteId'))
  return await borrarAporte(userId, metaId, aporteId)
})
