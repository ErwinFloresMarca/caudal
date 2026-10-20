import { aCsv, centavosADecimal } from '../../shared/csv'
import { convertToBase, type Moneda } from '../../shared/money'

// Columnas del CSV de movimientos (SPC-039 y SPC-042), en un solo lugar.
export const CABECERAS_MOVIMIENTOS = ['fecha', 'tipo', 'monto', 'moneda', 'tasa_ref', 'monto_base', 'categoria', 'cuenta', 'fondo', 'nota']

export interface TransaccionCsv {
  fecha: string
  tipo: string
  monto_centavos: number
  moneda: string
  tasa_ref: number | null
  nota: string | null
  categoria: { nombre: string } | null
  cuenta_nombre: string | null
}

export function filaCsv(t: TransaccionCsv, { base, tasaFallback, fondo }: { base: Moneda; tasaFallback?: number; fondo: string }): (string | number)[] {
  let montoBase: string
  try {
    montoBase = centavosADecimal(convertToBase({ centavos: t.monto_centavos, moneda: t.moneda as Moneda }, t.tasa_ref ?? tasaFallback, base).centavos)
  } catch {
    montoBase = '' // sin tasa no se puede consolidar; la fila sigue siendo útil
  }
  return [
    t.fecha,
    t.tipo,
    centavosADecimal(t.monto_centavos),
    t.moneda,
    t.tasa_ref ?? '',
    montoBase,
    t.categoria?.nombre ?? '',
    t.cuenta_nombre ?? '',
    fondo,
    t.nota ?? '',
  ]
}

export function csvMovimientos(filas: (string | number)[][]): string {
  return aCsv(CABECERAS_MOVIMIENTOS, filas)
}
