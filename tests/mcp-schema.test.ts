import { describe, it, expect } from 'vitest'
import { validarArgs, type EsquemaTool } from '../shared/mcp-schema'

const ESQUEMA: EsquemaTool = {
  type: 'object',
  properties: {
    fund_id: { type: 'integer' },
    monto: { type: 'string' },
    tipo: { type: 'string', enum: ['ingreso', 'gasto'] },
    activo: { type: 'boolean' },
    fund_ids: { type: 'array', items: { type: 'integer' } },
    cadencia: { type: 'object' },
    tasa: { type: 'number' },
  },
  required: ['monto'],
  additionalProperties: false,
}

// Con las validaciones nuevas de SPC-036 (formato y anidados).
const ESQUEMA_NUEVO: EsquemaTool = {
  type: 'object',
  properties: {
    fecha: { type: 'string', format: 'date' },
    monto: { type: 'string', format: 'amount' },
    cadencia: {
      type: 'object',
      properties: {
        frecuencia: { type: 'string', enum: ['diaria', 'mensual'] },
        dia: { type: 'integer' },
      },
      required: ['frecuencia'],
      additionalProperties: false,
    },
  },
  additionalProperties: false,
}

describe('validarArgs (SPC-033)', () => {
  it('acepta lo válido y los opcionales ausentes', () => {
    expect(validarArgs(ESQUEMA, { monto: '12,50' })).toBeNull()
    expect(
      validarArgs(ESQUEMA, {
        monto: '12,50',
        fund_id: 3,
        tipo: 'gasto',
        activo: true,
        fund_ids: [1, 2],
        cadencia: { frecuencia: 'mensual' },
        tasa: 6.96,
      }),
    ).toBeNull()
  })

  it('rechaza una propiedad no declarada y dice cuáles acepta', () => {
    const motivo = validarArgs(ESQUEMA, { monto: '1,00', fond_id: 2 })
    expect(motivo).toContain('fond_id')
    expect(motivo).toContain('fund_id')
  })

  it('exige los argumentos obligatorios', () => {
    expect(validarArgs(ESQUEMA, {})).toContain('monto')
    expect(validarArgs(ESQUEMA, { fund_id: 1 })).toContain('monto')
  })

  it('acepta ids numéricos enviados como string (los handlers coercen con Number())', () => {
    expect(validarArgs(ESQUEMA, { monto: '1', fund_id: '3', fund_ids: ['1', '2'], tasa: '6.96' })).toBeNull()
  })

  it('acepta un monto numérico donde el schema dice string', () => {
    expect(validarArgs(ESQUEMA, { monto: 12.5 })).toBeNull()
  })

  it('rechaza tipos incorrectos', () => {
    expect(validarArgs(ESQUEMA, { monto: '1', fund_id: 'abc' })).toContain('fund_id')
    expect(validarArgs(ESQUEMA, { monto: '1', fund_id: 1.5 })).toContain('fund_id')
    expect(validarArgs(ESQUEMA, { monto: '1', activo: 'false' })).toContain('activo')
    expect(validarArgs(ESQUEMA, { monto: '1', cadencia: [1] })).toContain('cadencia')
    expect(validarArgs(ESQUEMA, { monto: '1', fund_ids: [1, 'x'] })).toContain('fund_ids[1]')
  })

  it('rechaza un enum inválido y enumera los válidos', () => {
    const motivo = validarArgs(ESQUEMA, { monto: '1', tipo: 'otro' })
    expect(motivo).toContain('ingreso, gasto')
  })

  it('deja pasar null (el handler aplica su default)', () => {
    expect(validarArgs(ESQUEMA, { monto: '1', fund_id: null })).toBeNull()
  })

  describe('SPC-036: formatos y objetos anidados', () => {
    it('valida dentro de objetos anidados (y no solo que sean objetos)', () => {
      expect(validarArgs(ESQUEMA_NUEVO, { cadencia: { frecuencia: 'mensual', dia: 5 } })).toBeNull()
      expect(validarArgs(ESQUEMA_NUEVO, { cadencia: { frecuncia: 'mensual' } })).toContain('frecuencia')
      expect(validarArgs(ESQUEMA_NUEVO, { cadencia: { frecuencia: 'otra' } })).toContain('mensual')
      expect(validarArgs(ESQUEMA_NUEVO, { cadencia: { dia: 5 } })).toContain('frecuencia')
      expect(validarArgs(ESQUEMA_NUEVO, { cadencia: { frecuencia: 'diaria', dia: 'x' } })).toContain('dia')
    })

    it('exige fechas YYYY-MM-DD reales', () => {
      expect(validarArgs(ESQUEMA_NUEVO, { fecha: '2026-10-17' })).toBeNull()
      for (const mala of ['2026-9-1', 'mañana', '2026-02-31', '17/10/2026', '']) {
        expect(validarArgs(ESQUEMA_NUEVO, { fecha: mala }), mala).toContain('fecha')
      }
    })

    it('exige montos interpretables por parseAmount', () => {
      expect(validarArgs(ESQUEMA_NUEVO, { monto: '12,50' })).toBeNull()
      expect(validarArgs(ESQUEMA_NUEVO, { monto: '1.234,50' })).toBeNull()
      expect(validarArgs(ESQUEMA_NUEVO, { monto: '12.5' })).toBeNull() // un punto con 1-2 dígitos = decimal
      // `parseAmount` rechaza lo que no puede interpretar y también 0 (centavos <= 0).
      for (const malo of ['abc', '', '1,2,3', '0']) {
        expect(validarArgs(ESQUEMA_NUEVO, { monto: malo }), malo).toContain('monto')
      }
    })
  })
})
