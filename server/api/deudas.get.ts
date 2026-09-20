import { defineEventHandler } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { listarDeudas } from '../utils/deudas'

// Deudas del fondo activo con progreso, saldo pendiente y próxima cuota.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    return { fondo: null, deudas: [] }
  }
  return { fondo, deudas: await listarDeudas(userId, fondo.id) }
})
