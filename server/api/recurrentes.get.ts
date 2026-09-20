import { defineEventHandler } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { listarRecurrentes, listarPendientes } from '../utils/recurrentes'

// Recurrentes del fondo activo, con el bloque de pendientes por confirmar.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    return { fondo: null, recurrentes: [], pendientes: [] }
  }
  return {
    fondo,
    recurrentes: await listarRecurrentes(userId, fondo.id),
    pendientes: await listarPendientes(userId, fondo.id),
  }
})
