import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../../../../utils/auth'
import { pagarCuota, parsePago } from '../../../../../utils/deudas'

// Paga una cuota: crea la transacción (gasto si es por pagar, ingreso si es por cobrar),
// marca la cuota y salda la deuda si ya no quedan cuotas pendientes.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const deudaId = Number(getRouterParam(event, 'id'))
  const cuotaId = Number(getRouterParam(event, 'cuotaId'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  return await pagarCuota(userId, deudaId, cuotaId, parsePago(body))
})
