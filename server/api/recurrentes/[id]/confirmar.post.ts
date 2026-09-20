import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { authUserId } from '../../../utils/auth'
import { confirmarRecurrente } from '../../../utils/recurrentes'

// Confirma un pendiente: crea la transacción (fuente='recurrente') y avanza la fecha.
// Acepta `fecha` (registro en otra fecha) y `tasa_ref` (cuentas USD).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const fecha = typeof body.fecha === 'string' && body.fecha ? body.fecha : undefined
  const tasa_ref = body.tasa_ref == null || body.tasa_ref === '' ? null : Number(String(body.tasa_ref).replace(',', '.'))
  const resultado = await confirmarRecurrente(userId, id, { fecha, tasa_ref })
  return resultado
})
