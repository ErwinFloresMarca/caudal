export type Moneda = 'BOB' | 'USD'

export interface Money {
  centavos: number
  moneda: Moneda
}

export function parseAmount(input: string): number {
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.')
  const n = Number(normalized)
  if (!Number.isFinite(n)) {
    throw new Error('Cantidad inválida')
  }
  return Math.round(n * 100)
}

export function formatMoney(money: Money): string {
  return money.moneda === 'BOB'
    ? `Bs ${(money.centavos / 100).toFixed(2)}`
    : `US$ ${(money.centavos / 100).toFixed(2)}`
}

// Convierte a la moneda base (BOB) usando la tasa del dólar paralelo.
export function convertToBase(money: Money, tasaRef: number): number {
  return money.moneda === 'BOB' ? money.centavos : Math.round(money.centavos * tasaRef)
}