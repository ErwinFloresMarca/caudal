export type EstadoPresupuesto = 'en_ritmo' | 'alerta' | 'sobregiro'

export interface Presupuesto {
  id: number
  fondo_id: number
  categoria_id: number
  mes: string
  moneda: 'BOB' | 'USD'
  monto_limite_centavos: number
  monto_limite_formateado: string
  consumido_centavos: number
  consumido_formateado: string
  disponible_centavos: number
  disponible_formateado: string
  excedido_centavos: number
  excedido_formateado: string
  porcentaje: number
  estado: EstadoPresupuesto
  disponible_por_dia_centavos: number
  disponible_por_dia_formateado: string
  categoria: { id: number; nombre: string; icono: string | null; color: string | null }
}

export interface PresupuestosResp {
  mes: string
  moneda: 'BOB' | 'USD'
  dias_restantes: number
  kpis: {
    asignado_centavos: number
    asignado_formateado: string
    consumido_centavos: number
    consumido_formateado: string
    disponible_centavos: number
    disponible_formateado: string
    gasto_diario_permitido_centavos: number
    gasto_diario_permitido_formateado: string
  }
  presupuestos: Presupuesto[]
  historial: { mes: string; asignado_centavos: number; gastado_centavos: number; porcentaje: number }[]
}
