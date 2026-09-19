import { defineEventHandler } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { listarTransferencias } from '../utils/transferencias'

// Lista las transferencias del fondo activo.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    throw createError({ statusCode: 400, statusMessage: 'Crea un fondo antes de ver transferencias' })
  }
  return { fondo, transferencias: await listarTransferencias(userId, fondo.id) }
})