export interface FlujoMoneda {
  moneda: 'BOB' | 'USD'
  ingresos_centavos: number
  egresos_centavos: number
  neto_centavos: number
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

export interface Reporte {
  fondos: { id: number; nombre: string }[]
  filtros: { desde: string; hasta: string; base: 'BOB' | 'USD' }
  flujo: {
    desde: string
    hasta: string
    por_moneda: FlujoMoneda[]
    consolidado: { ingresos_centavos: number; egresos_centavos: number; neto_centavos: number }
  }
  gastos_por_categoria: { categoria_id: number | null; nombre: string; icono: string | null; color: string | null; centavos: number; porcentaje: number }[]
  total_gastos_centavos: number
  total_gastos_formateado: string
  serie_mensual: { mes: string; ingresos_centavos: number; egresos_centavos: number; neto_centavos: number }[]
  barras_diarias: DiaBarras[]
  evolucion_saldo: { fecha: string; saldo_centavos: number }[]
  saldo_inicial_centavos: number
  nota: string
}
