import { describe, expect, it } from 'vitest'
import { convertToBase, formatMoney, parseAmount } from '#shared/money'

describe('money (smoke)', () => {
  it('parseAmount convierte "12,50" a centavos', () => {
    expect(parseAmount('12,50')).toBe(1250)
  })

  it('formatMoney formatea BOB y USD', () => {
    expect(formatMoney({ centavos: 1250, moneda: 'BOB' })).toBe('Bs 12.50')
    expect(formatMoney({ centavos: 1250, moneda: 'USD' })).toBe('US$ 12.50')
  })

  it('convertToBase deja BOB igual y convierte USD con tasa', () => {
    expect(convertToBase({ centavos: 1000, moneda: 'BOB' }, 6.96)).toBe(1000)
    expect(convertToBase({ centavos: 1000, moneda: 'USD' }, 6.96)).toBe(6960)
  })
})