import { defineEventHandler } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { listarMetas } from '../utils/metas'

// Metas de ahorro del fondo activo con su progreso.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    return { fondo: null, metas: [] }
  }
  return { fondo, metas: await listarMetas(userId, fondo.id) }
})
