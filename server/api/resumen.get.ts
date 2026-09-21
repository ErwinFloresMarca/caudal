import { defineEventHandler } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { resumenDashboard } from '../utils/resumen'

// Agregación del dashboard del fondo activo (SPC-014).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    return { fondo: null, resumen: null }
  }
  return { fondo, resumen: await resumenDashboard(userId, fondo.id) }
})
