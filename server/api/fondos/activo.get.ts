import { defineEventHandler } from 'h3'
import { authUserId } from '../../utils/auth'
import { fondoActivoUsuario } from '../../utils/fondos'

// Fondo activo de la sesión; si no existe o se ocultó, fallback al primer activo.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  return { fondo: await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined) }
})