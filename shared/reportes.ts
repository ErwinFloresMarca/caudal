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
}

// Ingresos vs egresos por mes (barras agrupadas), consolidados con la tasa de cada movimiento.
export function serieMensual(movs: MovResumen[], { hasta, meses = 12, base = 'BOB' as Moneda }: OpcionesSerie): PuntoMensual[] {
  return mesesAtras(hasta, meses).map((mes) => {
    const delMes = movs.filter((m) => m.fecha.slice(0, 7) === mes)
    const ingresos = consolidarBase(delMes.filter((m) => m.tipo === 'ingreso'), base)
    const egresos = consolidarBase(delMes.filter((m) => m.tipo === 'gasto'), base)
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
}

// Evolución del saldo total: parte del saldo inicial de las cuentas + movimientos
// anteriores al período, y avanza día a día con el neto consolidado de cada día.
// Las transferencias no están en `movs` y no alteran el total (se cancelan en el fondo).
export function evolucionSaldo(movs: MovResumen[], { desde, hasta, saldoInicialCentavos, base = 'BOB' as Moneda }: OpcionesEvolucion): PuntoSaldo[] {
  let saldo = saldoInicialCentavos + consolidarBase(movs.filter((m) => m.fecha < desde), base)

  const porDia = new Map<string, number>()
  for (const m of movs) {
    if (m.fecha < desde || m.fecha > hasta) continue
    const delta = consolidarBase([m], base) * (m.tipo === 'ingreso' ? 1 : -1)
    porDia.set(m.fecha, (porDia.get(m.fecha) ?? 0) + delta)
  }

  return rangoDias(desde, hasta).map((fecha) => {
    saldo += porDia.get(fecha) ?? 0
    return { fecha, saldo_centavos: saldo }
  })
}
