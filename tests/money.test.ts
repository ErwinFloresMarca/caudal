import { describe, expect, it } from 'vitest'
import { convertToBase, formatMoney, parseAmount } from '#shared/money'

describe('parseAmount', () => {
  it('acepta coma decimal y punto decimal', () => {
    expect(parseAmount('12,50')).toBe(1250)
    expect(parseAmount('12.50')).toBe(1250)
  })

  it('acepta separadores de miles con punto (formato boliviano)', () => {
    expect(parseAmount('1.250')).toBe(125000)
    expect(parseAmount('12.500,75')).toBe(1250075)
  })

  it('acepta enteros sin separadores', () => {
    expect(parseAmount('1250')).toBe(125000)
  })

  it('rechaza negativos, NaN y más de 2 decimales', () => {
    expect(() => parseAmount('-5')).toThrow(/inválida/)
    expect(() => parseAmount('abc')).toThrow(/inválida/)
    expect(() => parseAmount('')).toThrow(/inválida/)
    expect(() => parseAmount('3,145')).toThrow(/inválida/)
  })
})

describe('formatMoney', () => {
  it('usa formato boliviano: coma decimal, punto de miles', () => {
    expect(formatMoney({ centavos: 1250, moneda: 'BOB' })).toBe('Bs 12,50')
    expect(formatMoney({ centavos: 1250, moneda: 'USD' })).toBe('US$ 12,50')
  })

  it('no usa separador de miles para montos grandes', () => {
    expect(formatMoney({ centavos: 1250075, moneda: 'BOB' })).toBe('Bs 12.500,75')
  })
})

describe('convertToBase', () => {
  it('deja BOB igual y convierte USD con tasa', () => {
    expect(convertToBase({ centavos: 1000, moneda: 'BOB' }, 6.96)).toEqual({ centavos: 1000, moneda: 'BOB' })
    expect(convertToBase({ centavos: 4500, moneda: 'USD' }, 6.96)).toEqual({ centavos: 31320, moneda: 'BOB' })
  })

  it('falla si falta tasa para USD', () => {
    expect(() => convertToBase({ centavos: 4500, moneda: 'USD' }, undefined)).toThrow(/tasa/)
  })
})