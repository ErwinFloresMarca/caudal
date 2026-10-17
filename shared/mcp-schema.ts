// Validador de argumentos del MCP contra el `inputSchema` publicado (SPC-033, huecos en SPC-036).
// Cubre el subconjunto que las tools declaran de verdad: type, enum, items, format,
// required y additionalProperties (también dentro de objetos anidados). Sin dependencias.

import { parseAmount } from './money'

export interface EsquemaPropiedad {
  type?: string
  enum?: unknown[]
  format?: 'date' | 'amount'
  items?: EsquemaPropiedad
  properties?: Record<string, EsquemaPropiedad>
  required?: string[]
  additionalProperties?: boolean
}

export interface EsquemaTool {
  type?: string
  properties?: Record<string, EsquemaPropiedad>
  required?: string[]
  additionalProperties?: boolean
}

// Acepta lo mismo que los handlers ya coercen: ids numéricos que llegan como
// string (`Number()`) y montos numéricos donde el schema dice string
// (`String(v)`), pero `boolean` estricto: `Boolean('false')` es `true`.
function encaja(v: unknown, tipo: string | undefined): boolean {
  switch (tipo) {
    case 'integer':
      return Number.isInteger(v) || (typeof v === 'string' && v.trim() !== '' && Number.isInteger(Number(v)))
    case 'number':
      return (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)))
    case 'string':
      return typeof v === 'string' || (typeof v === 'number' && Number.isFinite(v))
    case 'boolean':
      return typeof v === 'boolean'
    case 'array':
      return Array.isArray(v)
    case 'object':
      return typeof v === 'object' && v !== null && !Array.isArray(v)
    default:
      return true
  }
}

function fechaReal(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const [anio, mes, dia] = v.split('-').map(Number) as [number, number, number]
  const f = new Date(Date.UTC(anio, mes - 1, dia))
  return f.getUTCFullYear() === anio && f.getUTCMonth() === mes - 1 && f.getUTCDate() === dia
}

function montoInterpretable(v: unknown): boolean {
  if (typeof v !== 'string' && typeof v !== 'number') return false
  try {
    parseAmount(String(v))
    return true
  } catch {
    return false
  }
}

const describe = (v: unknown) => (v === undefined ? 'undefined' : JSON.stringify(v))

/** Motivo del rechazo, o `null` si los argumentos son válidos. */
export function validarArgs(schema: EsquemaTool, args: Record<string, unknown>): string | null {
  const props = schema.properties ?? {}

  for (const requerida of schema.required ?? []) {
    if (args[requerida] === undefined) return `falta el argumento obligatorio «${requerida}»`
  }

  for (const [clave, valor] of Object.entries(args)) {
    const prop = props[clave]
    if (!prop) {
      if (schema.additionalProperties !== false) continue
      const permitidas = Object.keys(props)
      return permitidas.length
        ? `argumento desconocido «${clave}»; acepta: ${permitidas.join(', ')}`
        : `«${clave}» no es un argumento de esta tool (no acepta ninguno)`
    }
    if (valor == null) continue // ausente o nulo: el handler aplica su default

    if (prop.enum && !prop.enum.includes(valor)) {
      return `«${clave}» debe ser uno de: ${prop.enum.join(', ')} (recibido ${describe(valor)})`
    }
    if (!encaja(valor, prop.type)) {
      return `«${clave}» debe ser ${prop.type} (recibido ${describe(valor)})`
    }
    if (prop.format === 'date' && !fechaReal(String(valor))) {
      return `«${clave}» debe ser una fecha YYYY-MM-DD válida (recibido ${describe(valor)})`
    }
    if (prop.format === 'amount' && !montoInterpretable(valor)) {
      return `«${clave}» debe ser un monto como "12,50" (recibido ${describe(valor)})`
    }
    if (prop.type === 'array' && prop.items) {
      for (const [i, item] of (valor as unknown[]).entries()) {
        if (!encaja(item, prop.items.type)) {
          return `«${clave}[${i}]» debe ser ${prop.items.type} (recibido ${describe(item)})`
        }
      }
    }
    if (prop.type === 'object' && prop.properties) {
      const interno = validarArgs(
        { properties: prop.properties, required: prop.required, additionalProperties: prop.additionalProperties },
        valor as Record<string, unknown>,
      )
      if (interno) return `«${clave}»: ${interno}`
    }
  }
  return null
}
