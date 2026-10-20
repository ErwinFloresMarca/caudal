import { defineEventHandler, setHeader } from 'h3'
import { filtrosDeMovimientos } from '../../utils/filtros-movimientos'
import { listarFiltradas } from '../../utils/transacciones'
import { listarFondos } from '../../utils/fondos'
import { getMonedaBase, getTasa } from '../../utils/ajustes'
import { csvMovimientos, filaCsv } from '../../utils/csv-movimientos'
import type { Moneda } from '../../../shared/money'

// CSV de los movimientos que cumplen los filtros de la pantalla (SPC-042).
// Baja todas las filas del filtro, no solo la página visible.
export default defineEventHandler(async (event) => {
  const { userId, filtros } = await filtrosDeMovimientos(event)
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', 'attachment; filename="caudal-movimientos.csv"')
  if (!filtros) return csvMovimientos([])

  const base = (await getMonedaBase(userId)) as Moneda
  const tasaFallback = base === 'USD' ? (await getTasa(userId)).actual?.valor : undefined
  const nombres = new Map((await listarFondos(userId)).map((f) => [f.id, f.nombre]))

  const filas = (await listarFiltradas(userId, filtros)).map((t) =>
    filaCsv(t, { base, tasaFallback, fondo: nombres.get(t.fondo_id) ?? '' }),
  )
  return csvMovimientos(filas)
})
