import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../../utils/auth'
import { crearAporteMeta, parseAporteMeta } from '../../../utils/metas'

// Registra un aporte (o retiro, monto negativo) a una meta. v1: no toca cuentas.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const metaId = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  return await crearAporteMeta(userId, metaId, parseAporteMeta(body))
})
