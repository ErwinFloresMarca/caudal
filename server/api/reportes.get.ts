import { defineEventHandler, getQuery } from 'h3'
import { authUserId } from '../utils/auth'
import { generarReporte } from '../utils/reportes'
import { hoyLocal } from '../utils/transacciones'
import { rangoMes } from '../../shared/resumen'

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

// Reporte del período. Filtros por URL: ?desde=&hasta=&fondos=1,2&base=BOB|USD
// (por defecto: mes en curso y todos los fondos).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const q = getQuery(event)
  const hoy = hoyLocal()
  const mes = rangoMes(hoy)

  const desde = typeof q.desde === 'string' && FECHA_RE.test(q.desde) ? q.desde : mes.desde
  const hasta = typeof q.hasta === 'string' && FECHA_RE.test(q.hasta) ? q.hasta : hoy
  if (desde > hasta) {
    throw createError({ statusCode: 400, statusMessage: 'El rango de fechas es inválido' })
  }
  const base = q.base === 'USD' ? 'USD' : 'BOB'
  const fondoIds =
    typeof q.fondos === 'string' && q.fondos
      ? q.fondos
          .split(',')
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n > 0)
      : undefined

  return { reporte: await generarReporte(userId, { fondoIds, desde, hasta, base }) }
})
