import { describe, it, expect } from 'vitest'
import { calcularKpis } from '../shared/movimientos-kpis'

describe('calcularKpis', () => {
  it('calcula totales, operaciones y superávit', () => {
    const k = calcularKpis({ ingresos_centavos: 450000, egresos_centavos: 195550, entradas: 1, salidas: 4 })
    expect(k.neto_centavos).toBe(254450)
    expect(k.operaciones).toBe(5)
    expect(k.porcentaje_consumido).toBe(43)
    expect(k.tasa_ahorro).toBe(57)
    expect(k.superavit).toBe(true)
  })

  it('marca déficit y tasa de ahorro negativa', () => {
    const k = calcularKpis({ ingresos_centavos: 100000, egresos_centavos: 130000, entradas: 2, salidas: 8 })
    expect(k.neto_centavos).toBe(-30000)
    expect(k.superavit).toBe(false)
    expect(k.tasa_ahorro).toBe(-30)
    expect(k.porcentaje_consumido).toBe(130)
  })

  it('sin ingresos no divide por cero', () => {
    const k = calcularKpis({ ingresos_centavos: 0, egresos_centavos: 5000, entradas: 0, salidas: 3 })
    expect(k.porcentaje_consumido).toBe(0)
    expect(k.tasa_ahorro).toBe(0)
    expect(k.superavit).toBe(false)
  })

  it('neto exactamente cero cuenta como superávit (no hay déficit)', () => {
    const k = calcularKpis({ ingresos_centavos: 5000, egresos_centavos: 5000, entradas: 1, salidas: 1 })
    expect(k.neto_centavos).toBe(0)
    expect(k.superavit).toBe(true)
    expect(k.porcentaje_consumido).toBe(100)
  })

  it('sin movimientos devuelve todo en cero', () => {
    const k = calcularKpis({ ingresos_centavos: 0, egresos_centavos: 0, entradas: 0, salidas: 0 })
    expect(k).toMatchObject({ operaciones: 0, neto_centavos: 0, superavit: true })
  })
})
