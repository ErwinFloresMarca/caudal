import { defineEventHandler } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { listarTransacciones } from '../utils/transacciones'

// Listado de movimientos del fondo activo (opcional: ?desde=&hasta= en YYYY-MM-DD).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    return { fondo: null, transacciones: [] }
  }

  const q = getQuery(event)
  const desde = typeof q.desde === 'string' && q.desde ? q.desde : undefined
  const hasta = typeof q.hasta === 'string' && q.hasta ? q.hasta : undefined
  const transacciones = await listarTransacciones(userId, fondo.id, { desde, hasta })

  return { fondo, transacciones }
})