import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { compensarPresupuesto, parseCompensacion } from '../../utils/presupuestos'

// Mueve monto de un presupuesto a otro sin cambiar el total asignado del mes.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  return await compensarPresupuesto(userId, parseCompensacion(body))
})
