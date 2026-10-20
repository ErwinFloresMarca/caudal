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

export interface KpisMovimientos {
  ingresos_centavos: number
  egresos_centavos: number
  neto_centavos: number
  entradas: number
  salidas: number
  operaciones: number
  porcentaje_consumido: number
  tasa_ahorro: number
  superavit: boolean
}

export interface CategoriaGasto {
  categoria_id: number | null
  nombre: string
  icono: string | null
  color: string | null
  centavos: number
  porcentaje: number
}

export interface ResumenMovimientos {
  kpis: KpisMovimientos
  por_categoria: CategoriaGasto[]
  moneda: 'BOB' | 'USD'
}
