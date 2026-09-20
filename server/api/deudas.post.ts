import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { crearDeuda, parseDeuda } from '../utils/deudas'

// Crea una deuda/MSI y genera sus cuotas.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    throw createError({ statusCode: 400, statusMessage: 'Crea un fondo antes de registrar deudas' })
  }
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const deuda = await crearDeuda(userId, fondo.id, parseDeuda(body))
  return { fondo, deuda }
})
