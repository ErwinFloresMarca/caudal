import { defineEventHandler } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { listarAportes } from '../utils/aportes'

// Lista los aportes/retiros que tocan el fondo activo (cualquiera de sus patas).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    return { fondo: null, aportes: [] }
  }
  return { fondo, aportes: await listarAportes(userId, fondo.id) }
})
