import { describe, it, expect } from 'vitest'
import { barrasDiariasPorCategoria } from '../shared/reportes'
import type { MovResumen } from '../shared/resumen'

function mov(fecha: string, tipo: 'ingreso' | 'gasto', centavos: number, categoria: { id: number | null; nombre: string } = { id: 1, nombre: 'Comida' }): MovResumen {
  return {
    tipo,
    monto_centavos: centavos,
    moneda: 'BOB',
    tasa_ref: null,
    fecha,
    categoria_id: categoria.id,
    categoria_nombre: categoria.nombre,
    categoria_icono: null,
    categoria_color: '#0E6FFF',
  }
}

const opciones = { desde: '2026-10-01', hasta: '2026-10-03', base: 'BOB' as const }

describe('barrasDiariasPorCategoria', () => {
  it('devuelve todos los días del rango, vacíos si no hay movimientos', () => {
    const dias = barrasDiariasPorCategoria([], opciones)
    expect(dias.map((d) => d.fecha)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    expect(dias.every((d) => d.ingresos.length === 0 && d.egresos.length === 0)).toBe(true)
  })

  it('separa ingresos de egresos en el mismo día', () => {
    const dias = barrasDiariasPorCategoria([mov('2026-10-01', 'ingreso', 5000), mov('2026-10-01', 'gasto', 1200)], opciones)
    expect(dias[0]!.ingresos).toEqual([{ categoria_id: 1, nombre: 'Comida', color: '#0E6FFF', centavos: 5000 }])
    expect(dias[0]!.egresos).toEqual([{ categoria_id: 1, nombre: 'Comida', color: '#0E6FFF', centavos: 1200 }])
    expect(dias[1]!.ingresos.length).toBe(0)
  })

  it('agrupa por categoría y suma los movimientos del día', () => {
    const comida = { id: 1, nombre: 'Comida' }
    const transporte = { id: 2, nombre: 'Transporte' }
    const dias = barrasDiariasPorCategoria(
      [mov('2026-10-02', 'gasto', 1000, comida), mov('2026-10-02', 'gasto', 500, comida), mov('2026-10-02', 'gasto', 300, transporte)],
      opciones,
    )
    expect(dias[1]!.egresos).toEqual([
      { categoria_id: 1, nombre: 'Comida', color: '#0E6FFF', centavos: 1500 },
      { categoria_id: 2, nombre: 'Transporte', color: '#0E6FFF', centavos: 300 },
    ])
    const totalDia = dias[1]!.egresos.reduce((s, c) => s + c.centavos, 0)
    expect(totalDia).toBe(1800)
  })

  it('deja las 6 categorías más grandes y suma el resto en Otras', () => {
    const movs = Array.from({ length: 8 }, (_, i) => mov('2026-10-01', 'gasto', (8 - i) * 100, { id: i + 1, nombre: `Cat${i + 1}` }))
    const dias = barrasDiariasPorCategoria(movs, { ...opciones, top: 6 })
    const egresos = dias[0]!.egresos
    expect(egresos.length).toBe(7)
    expect(egresos.slice(0, 6).map((c) => c.nombre)).toEqual(['Cat1', 'Cat2', 'Cat3', 'Cat4', 'Cat5', 'Cat6'])
    expect(egresos[6]).toEqual({ categoria_id: null, nombre: 'Otras categorías', color: null, centavos: 200 + 100 })
  })

  it('consolida los movimientos en USD con su tasa histórica', () => {
    const usd: MovResumen = { ...mov('2026-10-03', 'gasto', 1000), moneda: 'USD', tasa_ref: 7 }
    const dias = barrasDiariasPorCategoria([usd], opciones)
    expect(dias[2]!.egresos[0]!.centavos).toBe(7000)
  })

  it('las categorías sin id caen en "Sin categoría"', () => {
    const dias = barrasDiariasPorCategoria([mov('2026-10-01', 'gasto', 100, { id: null, nombre: 'Sin categoría' })], opciones)
    expect(dias[0]!.egresos[0]).toMatchObject({ categoria_id: null, nombre: 'Sin categoría' })
  })
})
