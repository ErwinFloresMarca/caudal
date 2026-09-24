export interface Transferencia {
  id: number
  cuenta_origen_id: number
  cuenta_destino_id: number
  monto_origen_centavos: number
  monto_destino_centavos: number
  tasa_ref: number | null
  fecha: string
  nota: string | null
  moneda_origen: 'BOB' | 'USD' | null
  moneda_destino: 'BOB' | 'USD' | null
  monto_origen_formateado: string | null
  monto_destino_formateado: string | null
}

export interface PataAporte {
  transaccion_id: number
  fondo_id: number
  cuenta_id: number
  monto_centavos: number
  moneda: 'BOB' | 'USD'
  tasa_ref: number | null
  monto_formateado: string
}

export interface Aporte {
  grupo_id: number
  fecha: string | null
  nota: string | null
  destino: PataAporte | null
  origen: PataAporte | null
}
