import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { crearPresupuesto, parsePresupuesto } from '../utils/presupuestos'

// Asigna (o actualiza) el presupuesto mensual de una categoría de gasto.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    throw createError({ statusCode: 400, statusMessage: 'Crea un fondo antes de asignar presupuestos' })
  }
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  return { presupuesto: await crearPresupuesto(userId, fondo.id, parsePresupuesto(body)) }
})
