import { describe, it, expect } from 'vitest'
import { distribucion503020 } from '../shared/presupuestos'

describe('distribucion503020', () => {
  it('calcula los porcentajes reales sobre los ingresos', () => {
    const d = distribucion503020(100000, { necesidad: 50000, deseo: 30000, ahorro: 20000, sin_clasificar: 0 })
    expect(d.tramos.map((t) => t.real_pct)).toEqual([50, 30, 20])
    expect(d.tramos.map((t) => t.desvio_pct)).toEqual([0, 0, 0])
    expect(d.total_gastos_centavos).toBe(100000)
  })

  it('marca desvíos cuando se pasa o se queda corto', () => {
    const d = distribucion503020(100000, { necesidad: 65000, deseo: 15000, ahorro: 20000, sin_clasificar: 0 })
    expect(d.tramos[0]!.desvio_pct).toBe(15)
    expect(d.tramos[1]!.desvio_pct).toBe(-15)
  })

  it('sin ingresos no divide por cero', () => {
    const d = distribucion503020(0, { necesidad: 5000, deseo: 0, ahorro: 0, sin_clasificar: 0 })
    expect(d.tramos.every((t) => t.real_pct === 0)).toBe(true)
    expect(d.sin_clasificar_pct).toBe(0)
  })

  it('lo sin clasificar se informa aparte y no entra en los tramos', () => {
    const d = distribucion503020(100000, { necesidad: 40000, deseo: 10000, ahorro: 0, sin_clasificar: 25000 })
    expect(d.tramos.reduce((s, t) => s + t.centavos, 0)).toBe(50000)
    expect(d.sin_clasificar_centavos).toBe(25000)
    expect(d.sin_clasificar_pct).toBe(25)
    expect(d.total_gastos_centavos).toBe(75000)
  })

  it('gastar más que el ingreso da más de 100 %', () => {
    const d = distribucion503020(10000, { necesidad: 12000, deseo: 0, ahorro: 0, sin_clasificar: 0 })
    expect(d.tramos[0]!.real_pct).toBe(120)
  })
})
