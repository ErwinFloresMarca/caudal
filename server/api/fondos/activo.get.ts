import { defineEventHandler } from 'h3'
import { authUserId } from '../../utils/auth'
import { getFondoPublico, listarFondos } from '../../utils/fondos'

// Fondo activo de la sesión; si no existe o se ocultó, fallback al primer activo.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)

  if (session.fondo_activo_id != null) {
    const activo = await getFondoPublico(userId, session.fondo_activo_id as number)
    if (activo?.activo) return { fondo: activo }
  }

  const fondos = await listarFondos(userId)
  return { fondo: fondos[0] ?? null }
})