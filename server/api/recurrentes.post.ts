import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { crearRecurrente, parseRecurrente } from '../utils/recurrentes'

// Crea una plantilla recurrente en el fondo activo.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    throw createError({ statusCode: 400, statusMessage: 'Crea un fondo antes de registrar recurrentes' })
  }
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const recurrente = await crearRecurrente(userId, fondo.id, parseRecurrente(body))
  return { fondo, recurrente }
})
