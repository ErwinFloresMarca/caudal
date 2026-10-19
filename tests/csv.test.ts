import { describe, it, expect } from 'vitest'
import { aCsv, centavosADecimal } from '../shared/csv'

describe('csv', () => {
  it('empieza con BOM y termina cada línea con CRLF', () => {
    const csv = aCsv(['a', 'b'], [[1, 2]])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toBe('\uFEFFa,b\r\n1,2\r\n')
  })

  it('escapa comas, comillas y saltos de línea (RFC 4180)', () => {
    const csv = aCsv(['nota'], [['hola, mundo'], ['dijo "hola"'], ['linea1\nlinea2']])
    expect(csv).toBe('\uFEFFnota\r\n"hola, mundo"\r\n"dijo ""hola"""\r\n"linea1\nlinea2"\r\n')
  })

  it('no neutraliza números negativos (deben seguir siendo números)', () => {
    expect(aCsv(['monto'], [[-12.5]])).toBe('\uFEFFmonto\r\n-12.5\r\n')
  })

  it('neutraliza texto que empieza con = + - @ (inyección de fórmulas)', () => {
    const csv = aCsv(['nota'], [['=HYPERLINK("http://x")'], ['+1'], ['-1'], ['@sum']])
    expect(csv).not.toMatch(/\r\n=/)
    expect(csv).not.toMatch(/\r\n\+/)
    expect(csv).not.toMatch(/\r\n@/)
    expect(csv).toContain(`'=HYPERLINK`)
  })

  it('deja vacías las celdas nulas', () => {
    expect(aCsv(['a', 'b'], [[null, undefined]])).toBe('\uFEFFa,b\r\n,\r\n')
  })

  it('convierte centavos a decimal con punto', () => {
    expect(centavosADecimal(1250)).toBe('12.50')
    expect(centavosADecimal(0)).toBe('0.00')
    expect(centavosADecimal(123456789)).toBe('1234567.89')
  })
})
