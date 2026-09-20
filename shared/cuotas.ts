import { nextDate, type Cadencia } from './recurrentes'

// Reparte el total en N cuotas enteras. El sobrante de centavos va a las primeras
// cuotas: 10000 en 3 → [3334, 3333, 3333] (suma exacta 10000).
export function repartirMonto(totalCentavos: number, numCuotas: number): number[] {
  if (!Number.isInteger(totalCentavos) || totalCentavos <= 0) throw new Error('monto_total_centavos inválido')
  if (!Number.isInteger(numCuotas) || numCuotas <= 0) throw new Error('num_cuotas inválido')
  const base = Math.floor(totalCentavos / numCuotas)
  const resto = totalCentavos - base * numCuotas
  return Array.from({ length: numCuotas }, (_, i) => base + (i < resto ? 1 : 0))
}

// Vencimientos mensuales desde la fecha de inicio (la cuota 1 vence en fecha_inicio),
// con recorte de fin de mes conservando el día ancla.
export function fechasCuotas(fechaInicio: string, numCuotas: number): string[] {
  const dia = Number(fechaInicio.slice(8, 10))
  const cadencia: Cadencia = { frecuencia: 'mensual', dia }
  const fechas = [fechaInicio]
  for (let i = 1; i < numCuotas; i++) {
    fechas.push(nextDate(fechas[i - 1]!, cadencia))
  }
  return fechas
}

export interface CuotaCalculada {
  numero: number
  monto_centavos: number
  fecha_vencimiento: string
}

export function generarCuotas(totalCentavos: number, numCuotas: number, fechaInicio: string): CuotaCalculada[] {
  const montos = repartirMonto(totalCentavos, numCuotas)
  const fechas = fechasCuotas(fechaInicio, numCuotas)
  return montos.map((monto, i) => ({ numero: i + 1, monto_centavos: monto, fecha_vencimiento: fechas[i]! }))
}
