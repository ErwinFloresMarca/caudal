import { consolidarBase, resumenPeriodo, type MovResumen, type OpcionesResumen } from './resumen'
import type { Moneda } from './money'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export { resumenPeriodo }
export type { MovResumen, OpcionesResumen }

// Claves 'YYYY-MM' de los últimos N meses terminando en el mes de `hasta`, en orden cronológico.
export function mesesAtras(hasta: string, cantidad: number): string[] {
  let y = Number(hasta.slice(0, 4))
  let m = Number(hasta.slice(5, 7))
  const out: string[] = []
  for (let i = 0; i < cantidad; i++) {
    out.push(`${y}-${pad(m)}`)
    m--
    if (m < 1) {
      m = 12
      y--
    }
  }
  return out.reverse()
}

export interface PuntoMensual {
  mes: string
  ingresos_centavos: number
  egresos_centavos: number
  neto_centavos: number
}

export interface OpcionesSerie {
  hasta: string
  meses?: number
  base?: Moneda
  tasaFallback?: number
}

// Ingresos vs egresos por mes (barras agrupadas), consolidados con la tasa de cada movimiento.
export function serieMensual(movs: MovResumen[], { hasta, meses = 12, base = 'BOB' as Moneda, tasaFallback }: OpcionesSerie): PuntoMensual[] {
  return mesesAtras(hasta, meses).map((mes) => {
    const delMes = movs.filter((m) => m.fecha.slice(0, 7) === mes)
    const ingresos = consolidarBase(delMes.filter((m) => m.tipo === 'ingreso'), base, tasaFallback)
    const egresos = consolidarBase(delMes.filter((m) => m.tipo === 'gasto'), base, tasaFallback)
    return { mes, ingresos_centavos: ingresos, egresos_centavos: egresos, neto_centavos: ingresos - egresos }
  })
}

function diaSiguiente(fecha: string): string {
  const dt = new Date(`${fecha}T00:00:00Z`)
  dt.setUTCDate(dt.getUTCDate() + 1)
  return dt.toISOString().slice(0, 10)
}

export function rangoDias(desde: string, hasta: string): string[] {
  const out: string[] = []
  let d = desde
  while (d <= hasta) {
    out.push(d)
    d = diaSiguiente(d)
  }
  return out
}

export interface PuntoSaldo {
  fecha: string
  saldo_centavos: number
}

export interface OpcionesEvolucion {
  desde: string
  hasta: string
  saldoInicialCentavos: number
  base?: Moneda
  tasaFallback?: number
}

// Evolución del saldo total: parte del saldo inicial de las cuentas + movimientos
// anteriores al período, y avanza día a día con el neto consolidado de cada día.
// Las transferencias no están en `movs` y no alteran el total (se cancelan en el fondo).
export function evolucionSaldo(movs: MovResumen[], { desde, hasta, saldoInicialCentavos, base = 'BOB' as Moneda, tasaFallback }: OpcionesEvolucion): PuntoSaldo[] {
  let saldo = saldoInicialCentavos + consolidarBase(movs.filter((m) => m.fecha < desde), base, tasaFallback)

  const porDia = new Map<string, number>()
  for (const m of movs) {
    if (m.fecha < desde || m.fecha > hasta) continue
    const delta = consolidarBase([m], base, tasaFallback) * (m.tipo === 'ingreso' ? 1 : -1)
    porDia.set(m.fecha, (porDia.get(m.fecha) ?? 0) + delta)
  }

  return rangoDias(desde, hasta).map((fecha) => {
    saldo += porDia.get(fecha) ?? 0
    return { fecha, saldo_centavos: saldo }
  })
}

export interface CategoriaDia {
  categoria_id: number | null
  nombre: string
  color: string | null
  centavos: number
}

export interface DiaBarras {
  fecha: string
  ingresos: CategoriaDia[]
  egresos: CategoriaDia[]
}

export interface OpcionesBarras {
  desde: string
  hasta: string
  base?: Moneda
  tasaFallback?: number
  top?: number
}

// Barras diarias: cada día del rango con sus ingresos y egresos consolidados
// desglosados por categoría. Las `top` categorías por monto del período van
// sueltas y el resto se suma en "Otras". Los días sin movimiento vienen vacíos.
export function barrasDiariasPorCategoria(movs: MovResumen[], { desde, hasta, base = 'BOB' as Moneda, tasaFallback, top = 6 }: OpcionesBarras): DiaBarras[] {
  const dentro = movs.filter((m) => m.fecha >= desde && m.fecha <= hasta)
  const clave = (m: MovResumen) => (m.categoria_id == null ? 'sin' : String(m.categoria_id))

  const total = new Map<string, { categoria_id: number | null; nombre: string; color: string | null; centavos: number }>()
  for (const m of dentro) {
    const k = clave(m)
    const acc = total.get(k) ?? { categoria_id: m.categoria_id ?? null, nombre: m.categoria_nombre ?? 'Sin categoría', color: m.categoria_color ?? null, centavos: 0 }
    acc.centavos += consolidarBase([m], base, tasaFallback)
    total.set(k, acc)
  }

  const ranking = [...total.entries()].sort((a, b) => b[1].centavos - a[1].centavos || a[0].localeCompare(b[0]))
  const orden = new Map<string, number>()
  ranking.slice(0, top).forEach(([k], i) => orden.set(k, i))

  function desglose(fecha: string, tipo: 'ingreso' | 'gasto'): CategoriaDia[] {
    const porCat = new Map<string, number>()
    for (const m of dentro) {
      if (m.fecha !== fecha || m.tipo !== tipo) continue
      const k = orden.has(clave(m)) ? clave(m) : 'otras'
      porCat.set(k, (porCat.get(k) ?? 0) + consolidarBase([m], base, tasaFallback))
    }
    return [...porCat.entries()]
      .map(([k, centavos]) => ({ k, centavos, pos: orden.get(k) ?? orden.size }))
      .sort((a, b) => a.pos - b.pos)
      .map(({ k, centavos }) => {
        if (k === 'otras') return { categoria_id: null, nombre: 'Otras categorías', color: null, centavos }
        const meta = total.get(k)!
        return { categoria_id: meta.categoria_id, nombre: meta.nombre, color: meta.color, centavos }
      })
  }

  return rangoDias(desde, hasta).map((fecha) => ({ fecha, ingresos: desglose(fecha, 'ingreso'), egresos: desglose(fecha, 'gasto') }))
}
