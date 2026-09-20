import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../../../utils/auth'
import { editarCuota } from '../../../../utils/deudas'

// Edita una cuota no pagada (monto distinto, interés, otra fecha).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const deudaId = Number(getRouterParam(event, 'id'))
  const cuotaId = Number(getRouterParam(event, 'cuotaId'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}

  const monto_centavos = body.monto_centavos == null || body.monto_centavos === '' ? undefined : Number(body.monto_centavos)
  const fecha_vencimiento = body.fecha_vencimiento == null || body.fecha_vencimiento === '' ? undefined : String(body.fecha_vencimiento)

  const cuota = await editarCuota(userId, deudaId, cuotaId, { monto_centavos, fecha_vencimiento })
  if (!cuota) {
    throw createError({ statusCode: 404, statusMessage: 'Cuota no encontrada' })
  }
  return { cuota }
})
