import { defineEventHandler } from 'h3'
import { filtrosDeMovimientos } from '../../utils/filtros-movimientos'
import { resumenMovimientos } from '../../utils/movimientos-resumen'
import { calcularKpis } from '../../../shared/movimientos-kpis'
import { getMonedaBase } from '../../utils/ajustes'
import type { Moneda } from '../../../shared/money'

// KPIs y egresos por categoría con los mismos filtros que /api/movimientos (SPC-042).
export default defineEventHandler(async (event) => {
  const { userId, filtros } = await filtrosDeMovimientos(event)
  if (!filtros) {
    return {
      resumen: {
        kpis: calcularKpis({ ingresos_centavos: 0, egresos_centavos: 0, entradas: 0, salidas: 0 }),
        por_categoria: [],
        moneda: (await getMonedaBase(userId)) as Moneda,
      },
    }
  }
  return { resumen: await resumenMovimientos(userId, filtros) }
})
