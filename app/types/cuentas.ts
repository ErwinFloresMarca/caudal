export interface CuentaFondo {
  id: number
  nombre: string
  tipo: string
  moneda: 'BOB' | 'USD'
  activa: boolean
  saldo_inicial_centavos: number
  saldo_actual_centavos: number
}
