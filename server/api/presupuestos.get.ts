import { defineEventHandler, getQuery } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { hoyLocal } from '../utils/transacciones'
import { listarPresupuestos } from '../utils/presupuestos'

// Presupuestos del fondo activo para un mes (por defecto el actual).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    return { fondo: null, presupuestos: null }
  }
  const query = getQuery(event)
  const mes = typeof query.mes === 'string' && /^\d{4}-\d{2}$/.test(query.mes) ? query.mes : hoyLocal().slice(0, 7)
  return { fondo, presupuestos: await listarPresupuestos(userId, fondo.id, mes) }
})
