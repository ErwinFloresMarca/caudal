import { convertToBase, type Moneda } from './money'
import { diasDelMes } from './recurrentes'

export interface MovResumen {
  tipo: 'ingreso' | 'gasto'
  monto_centavos: number
  moneda: Moneda
  tasa_ref?: number | null
  fecha: string
  categoria_id?: number | null
  categoria_nombre?: string | null
  categoria_icono?: string | null
  categoria_color?: string | null
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Primer y último día del mes de una fecha YYYY-MM-DD.
export function rangoMes(fecha: string): { desde: string; hasta: string } {
  const y = Number(fecha.slice(0, 4))
  const m = Number(fecha.slice(5, 7))
  return { desde: `${y}-${pad(m)}-01`, hasta: `${y}-${pad(m)}-${pad(diasDelMes(y, m))}` }
}

// Consolida montos a la moneda base usando la tasa histórica de cada movimiento (0002).
export function consolidarBase(movs: MovResumen[], base: Moneda = 'BOB'): number {
  return movs.reduce((s, m) => s + convertToBase({ centavos: m.monto_centavos, moneda: m.moneda }, m.tasa_ref ?? undefined, base).centavos, 0)
}

export interface OpcionesResumen {
  desde: string
  hasta: string
  base?: Moneda
  limite?: number
}

export interface ResumenPeriodo {
  desde: string
  hasta: string
  por_moneda: { moneda: Moneda; ingresos_centavos: number; egresos_centavos: number; neto_centavos: number }[]
  consolidado: { ingresos_centavos: number; egresos_centavos: number; neto_centavos: number }
}

// Ingresos/egresos/neto del período, por moneda y consolidado. Las transferencias no
// viven en `transacciones`, así que quedan fuera por construcción.
export function resumenPeriodo(movs: MovResumen[], { desde, hasta, base = 'BOB' as Moneda }: OpcionesResumen): ResumenPeriodo {
  const dentro = movs.filter((m) => m.fecha >= desde && m.fecha <= hasta)
  const monedas = [...new Set(dentro.map((m) => m.moneda))].sort() as Moneda[]

  const por_moneda = monedas.map((moneda) => {
    const de = dentro.filter((m) => m.moneda === moneda)
    const ingresos = de.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto_centavos, 0)
    const egresos = de.filter((m) => m.tipo === 'gasto').reduce((s, m) => s + m.monto_centavos, 0)
    return { moneda, ingresos_centavos: ingresos, egresos_centavos: egresos, neto_centavos: ingresos - egresos }
  })

  const ingresos = consolidarBase(dentro.filter((m) => m.tipo === 'ingreso'), base)
  const egresos = consolidarBase(dentro.filter((m) => m.tipo === 'gasto'), base)
  return {
    desde,
    hasta,
    por_moneda,
    consolidado: { ingresos_centavos: ingresos, egresos_centavos: egresos, neto_centavos: ingresos - egresos },
  }
}

export interface CategoriaGasto {
  categoria_id: number | null
  nombre: string
  icono: string | null
  color: string | null
  centavos: number
  porcentaje: number
}

// Top de gastos por categoría del período (consolidado), ordenado desc.
export function gastosPorCategoria(movs: MovResumen[], { desde, hasta, base = 'BOB' as Moneda, limite = 6 }: OpcionesResumen): CategoriaGasto[] {
  const gastos = movs.filter((m) => m.tipo === 'gasto' && m.fecha >= desde && m.fecha <= hasta)
  const total = consolidarBase(gastos, base)

  const grupos = new Map<string, { categoria_id: number | null; nombre: string; icono: string | null; color: string | null; movs: MovResumen[] }>()
  for (const m of gastos) {
    const key = m.categoria_id == null ? 'sin' : String(m.categoria_id)
    const g = grupos.get(key)
    if (g) g.movs.push(m)
    else {
      grupos.set(key, {
        categoria_id: m.categoria_id ?? null,
        nombre: m.categoria_nombre ?? 'Sin categoría',
        icono: m.categoria_icono ?? null,
        color: m.categoria_color ?? null,
        movs: [m],
      })
    }
  }

  return [...grupos.values()]
    .map((g) => ({
      categoria_id: g.categoria_id,
      nombre: g.nombre,
      icono: g.icono,
      color: g.color,
      centavos: consolidarBase(g.movs, base),
      porcentaje: total > 0 ? Math.round((consolidarBase(g.movs, base) / total) * 100) : 0,
    }))
    .sort((a, b) => b.centavos - a.centavos)
    .slice(0, limite)
}
