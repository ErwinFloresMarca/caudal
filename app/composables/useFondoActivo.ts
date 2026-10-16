export interface FondoPublico {
  id: number
  nombre: string
  tipo: string
  moneda_base: 'BOB' | 'USD'
  color: string | null
  icono: string | null
  activo: boolean
  /** Solo lo devuelve el listado de /api/fondos. */
  predeterminado?: boolean
}

export interface CuentaPublica {
  id: number
  nombre: string
  tipo: string
  moneda: 'BOB' | 'USD'
  activa: boolean
  saldo_inicial_centavos: number
  saldo_actual_centavos: number
}

// Estado compartido del fondo activo (selector del shell) y del listado de fondos.
export function useFondoActivo() {
  const request = useRequestFetch()
  const fondos = useState<FondoPublico[]>('fondos', () => [])
  const fondoActivo = useState<FondoPublico | null>('fondo-activo', () => null)

  async function cargarFondos() {
    const r = await request<{ fondos: FondoPublico[]; sugerir_personal: boolean }>('/api/fondos')
    fondos.value = r.fondos
  }

  async function cargarFondoActivo() {
    const r = await request<{ fondo: FondoPublico | null }>('/api/fondos/activo')
    fondoActivo.value = r.fondo
  }

  async function seleccionarFondo(id: number) {
    const r = await request<{ fondo: FondoPublico }>('/api/fondos/activo', { method: 'POST', body: { id } })
    fondoActivo.value = r.fondo
  }

  async function marcarPredeterminado(id: number | null) {
    await request('/api/fondos/predeterminado', { method: 'POST', body: { id } })
    await cargarFondos()
  }

  return { fondos, fondoActivo, cargarFondos, cargarFondoActivo, seleccionarFondo, marcarPredeterminado }
}
