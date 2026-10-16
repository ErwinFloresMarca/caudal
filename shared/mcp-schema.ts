// Validador de argumentos del MCP contra el `inputSchema` publicado (SPC-033).
// Cubre el subconjunto que las 54 tools declaran de verdad: type, enum, items,
// required y additionalProperties. Sin dependencias (los schemas son chicos y
// conocidos; un validador de JSON Schema completo sería maquinaria de más).

export interface EsquemaPropiedad {
  type?: string
  enum?: unknown[]
  items?: EsquemaPropiedad
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
    if (prop.type === 'array' && prop.items) {
      for (const [i, item] of (valor as unknown[]).entries()) {
        if (!encaja(item, prop.items.type)) {
          return `«${clave}[${i}]» debe ser ${prop.items.type} (recibido ${describe(item)})`
        }
      }
    }
  }
  return null
}
