export interface FondoEditable {
  id: number
  nombre: string
  tipo: string
  moneda_base: 'BOB' | 'USD'
  color: string | null
  icono: string | null
  activo: boolean
}

export interface CategoriaEditable {
  id: number
  nombre: string
  tipo: string
  icono: string | null
  color: string | null
  clasificacion?: 'necesidad' | 'deseo' | 'ahorro' | null
  es_predefinida: boolean
  activa: boolean
}
