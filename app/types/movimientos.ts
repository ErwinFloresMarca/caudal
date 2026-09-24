export interface Cuenta {
  id: number
  nombre: string
  tipo: string
  moneda: 'BOB' | 'USD'
}

export interface Categoria {
  id: number
  nombre: string
  tipo: string
  icono: string | null
  color: string | null
}

export interface MovimientoEditable {
  id: number
  fecha: string
  tipo: string
  monto_centavos: number
  moneda: 'BOB' | 'USD'
  tasa_ref: number | null
  nota: string | null
  cuenta_id: number
  categoria: { id: number; nombre: string } | null
}

export interface Movimiento extends MovimientoEditable {
  monto_formateado: string
  cuenta_nombre: string | null
  categoria: Categoria | null
}
