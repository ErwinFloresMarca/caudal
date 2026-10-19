import { defineEventHandler, getQuery, setHeader, createError } from 'h3'
import { authUserId } from '../../utils/auth'
import { listarTransacciones, hoyLocal } from '../../utils/transacciones'
import { fondosDelReporte } from '../../utils/reportes'
import { getTasa } from '../../utils/ajustes'
import { rangoMes } from '../../../shared/resumen'
import { aCsv, centavosADecimal } from '../../../shared/csv'
import { convertToBase, type Moneda } from '../../../shared/money'

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

const CABECERAS = ['fecha', 'tipo', 'monto', 'moneda', 'tasa_ref', 'monto_base', 'categoria', 'cuenta', 'fondo', 'nota']

// Movimientos del período en CSV, con los mismos filtros que /api/reportes:
// ?desde=&hasta=&fondos=1,2&base=BOB|USD
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
  const base: Moneda = q.base === 'USD' ? 'USD' : 'BOB'
  const tasaFallback = base === 'USD' ? (await getTasa(userId)).actual?.valor : undefined
  const fondoIds =
    typeof q.fondos === 'string' && q.fondos
      ? q.fondos
          .split(',')
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n > 0)
      : undefined

  const seleccion = await fondosDelReporte(userId, fondoIds)
  const filas: (string | number | null)[][] = []

  for (const fondo of seleccion) {
    const trx = await listarTransacciones(userId, fondo.id, { desde, hasta })
    for (const t of trx) {
      let montoBase: string
      try {
        const conv = convertToBase({ centavos: t.monto_centavos, moneda: t.moneda as Moneda }, t.tasa_ref ?? tasaFallback, base)
        montoBase = centavosADecimal(conv.centavos)
      } catch {
        montoBase = '' // sin tasa no se puede consolidar; la fila sigue siendo útil
      }
      filas.push([
        t.fecha,
        t.tipo,
        centavosADecimal(t.monto_centavos),
        t.moneda,
        t.tasa_ref ?? '',
        montoBase,
        t.categoria?.nombre ?? '',
        t.cuenta_nombre ?? '',
        fondo.nombre,
        t.nota ?? '',
      ])
    }
  }

  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="caudal-movimientos-${desde}_${hasta}.csv"`)
  return aCsv(CABECERAS, filas)
})
