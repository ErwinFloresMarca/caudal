export interface AporteMeta {
  id: number
  monto_centavos: number
  monto_formateado: string
  fecha: string
  cuenta_id: number | null
  nota: string | null
}

export interface Meta {
  id: number
  fondo_id: number
  nombre: string
  monto_objetivo_centavos: number
  moneda: 'BOB' | 'USD'
  monto_objetivo_formateado: string
  fecha_objetivo: string | null
  activa: boolean
  progreso: {
    acumulado_centavos: number
    porcentaje: number
    restante_centavos: number
    alcanzada: boolean
    acumulado_formateado: string
    restante_formateado: string
  }
  aportes?: AporteMeta[]
}
