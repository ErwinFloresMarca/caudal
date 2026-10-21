import { defineEventHandler } from 'h3'
import { authUserId } from '../../utils/auth'
import { cerrarTodasLasSesiones } from '../../utils/sesiones'

// Invalida las cookies de todos los dispositivos y cierra la sesión actual (SPC-047).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const version = await cerrarTodasLasSesiones(userId)
  await clearUserSession(event)
  return { ok: true, version }
})
