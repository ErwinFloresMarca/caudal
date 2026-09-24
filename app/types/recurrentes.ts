export interface Cadencia {
  frecuencia: string
  dia?: number
  dia_semana?: number
}

export interface Recurrente {
  id: number
  fondo_id: number
  cuenta_id: number
  categoria_id: number | null
  tipo: string
  monto_centavos: number
  moneda: 'BOB' | 'USD'
  monto_formateado: string
  cadencia: Cadencia
  proxima_fecha: string
  activo: boolean
  nota: string | null
  pendiente: boolean
  categoria: { id: number; nombre: string; icono: string | null; color: string | null } | null
}
