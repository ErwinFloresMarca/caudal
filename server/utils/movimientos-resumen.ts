import { listarFiltradas, type FiltrosBusqueda } from './transacciones'
import { getMonedaBase, getTasa } from './ajustes'
import { consolidarBase, gastosPorCategoria, type MovResumen, type CategoriaGasto } from '../../shared/resumen'
import { calcularKpis, type KpisMovimientos } from '../../shared/movimientos-kpis'
import type { Moneda } from '../../shared/money'

const SIN_DESDE = '0001-01-01'
const SIN_HASTA = '9999-12-31'

export interface ResumenMovimientos {
  kpis: KpisMovimientos
  por_categoria: CategoriaGasto[]
  moneda: Moneda
}

function aMov(t: Awaited<ReturnType<typeof listarFiltradas>>[number]): MovResumen {
  return {
    tipo: t.tipo as 'ingreso' | 'gasto',
    monto_centavos: t.monto_centavos,
    moneda: t.moneda as Moneda,
    tasa_ref: t.tasa_ref,
    fecha: t.fecha,
    categoria_id: t.categoria?.id ?? null,
    categoria_nombre: t.categoria?.nombre ?? null,
    categoria_icono: t.categoria?.icono ?? null,
    categoria_color: t.categoria?.color ?? null,
  }
}

// KPIs y egresos por categoría con el mismo filtro que la lista (SPC-042).
// Todo se consolida a la moneda base del usuario con la tasa histórica de cada movimiento.
export async function resumenMovimientos(userId: number, filtros: FiltrosBusqueda): Promise<ResumenMovimientos> {
  const movs = (await listarFiltradas(userId, filtros)).map(aMov)
  const moneda = (await getMonedaBase(userId)) as Moneda
  const tasaFallback = moneda === 'USD' ? (await getTasa(userId)).actual?.valor : undefined

  const ingresos = movs.filter((m) => m.tipo === 'ingreso')
  const egresos = movs.filter((m) => m.tipo === 'gasto')
  const kpis = calcularKpis({
    ingresos_centavos: consolidarBase(ingresos, moneda, tasaFallback),
    egresos_centavos: consolidarBase(egresos, moneda, tasaFallback),
    entradas: ingresos.length,
    salidas: egresos.length,
  })

  const todas = gastosPorCategoria(movs, {
    desde: filtros.desde ?? SIN_DESDE,
    hasta: filtros.hasta ?? SIN_HASTA,
    base: moneda,
    tasaFallback,
    limite: 1000,
  })
  // Top 6 + "Otras categorías": el panel suma exactamente el total de egresos.
  const por_categoria = todas.slice(0, 6)
  const resto = todas.slice(6)
  if (resto.length) {
    const centavos = resto.reduce((s, c) => s + c.centavos, 0)
    const total = todas.reduce((s, c) => s + c.centavos, 0)
    por_categoria.push({
      categoria_id: null,
      nombre: 'Otras categorías',
      icono: null,
      color: null,
      centavos,
      porcentaje: total > 0 ? Math.round((centavos / total) * 100) : 0,
    })
  }

  return { kpis, por_categoria, moneda }
}
