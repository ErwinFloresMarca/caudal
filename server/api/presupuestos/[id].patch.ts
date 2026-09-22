import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { editarPresupuesto } from '../../utils/presupuestos'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const monto = body.monto_limite_centavos == null || body.monto_limite_centavos === '' ? undefined : Number(body.monto_limite_centavos)
  const presupuesto = await editarPresupuesto(userId, id, { monto_limite_centavos: monto })
  if (!presupuesto) {
    throw createError({ statusCode: 404, statusMessage: 'Presupuesto no encontrado' })
  }
  return { presupuesto }
})
