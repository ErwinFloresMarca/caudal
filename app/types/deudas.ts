export interface Cuota {
  id: number
  numero: number
  fecha_vencimiento: string
  monto_centavos: number
  monto_formateado: string
  pagada: boolean
  fecha_pago: string | null
}

export interface Deuda {
  id: number
  fondo_id: number
  contraparte: string
  direccion: string
  concepto: string | null
  monto_total_centavos: number
  moneda: 'BOB' | 'USD'
  monto_total_formateado: string
  fecha_inicio: string
  num_cuotas: number
  estado: string
  nota: string | null
  progreso: { pagadas: number; total: number }
  saldo_pendiente_centavos: number
  saldo_pendiente_formateado: string
  proxima_cuota: string | null
  cuotas?: Cuota[]
}
