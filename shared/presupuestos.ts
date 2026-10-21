import { diasDelMes } from './recurrentes'

export const UMBRAL_ALERTA = 0.8

export type EstadoPresupuesto = 'en_ritmo' | 'alerta' | 'sobregiro'

const MES_RE = /^(\d{4})-(\d{2})$/
const FECHA_RE = /^(\d{4})-(\d{2})-(\d{2})$/

// < umbral → en_ritmo; ≥ umbral → alerta; > límite → sobregiro.
export function estadoPresupuesto(consumido: number, limite: number, umbral: number = UMBRAL_ALERTA): EstadoPresupuesto {
  if (limite <= 0) return consumido > 0 ? 'sobregiro' : 'en_ritmo'
  if (consumido > limite) return 'sobregiro'
  if (consumido >= limite * umbral) return 'alerta'
  return 'en_ritmo'
}

export function disponible(consumido: number, limite: number): number {
  return Math.max(0, limite - consumido)
}

// Gasto diario permitido para no pasarse en los días que quedan del mes.
export function disponiblePorDia(consumido: number, limite: number, diasRestantes: number): number {
  if (diasRestantes <= 0) return 0
  return Math.floor(disponible(consumido, limite) / diasRestantes)
}

// Mueve `monto` del presupuesto origen al destino sin cambiar el total asignado.
// El origen no puede quedar negativo ni por debajo de lo consumido.
export function compensar(
  origen: { limite: number; consumido: number },
  destino: { limite: number; consumido: number },
  monto: number,
): { limite_origen: number; limite_destino: number } {
  if (!Number.isInteger(monto) || monto <= 0) throw new Error('El monto a compensar debe ser un entero positivo')
  if (origen.limite - monto < 0) throw new Error('El presupuesto de origen no puede quedar negativo')
  if (origen.limite - monto < origen.consumido) throw new Error('El presupuesto de origen no puede quedar por debajo de lo consumido')
  return { limite_origen: origen.limite - monto, limite_destino: destino.limite + monto }
}

// Días que quedan del mes (incluyendo hoy) para un mes 'YYYY-MM' y una fecha 'YYYY-MM-DD'.
export function diasRestantesDelMes(mes: string, hoy: string): number {
  const m = MES_RE.exec(mes)
  const h = FECHA_RE.exec(hoy)
  if (!m || !h) throw new Error('Mes o fecha inválidos')
  const my = Number(m[1])
  const mm = Number(m[2])
  const hy = Number(h[1])
  const hm = Number(h[2])
  const hd = Number(h[3])
  const total = diasDelMes(my, mm)
  if (my < hy || (my === hy && mm < hm)) return 0
  if (my > hy || (my === hy && mm > hm)) return total
  return Math.max(0, total - hd + 1)
}

// Regla 50/30/20: proporción ideal del ingreso entre necesidades, deseos y ahorro.
export const REGLA_503020 = [
  { clave: 'necesidad', nombre: 'Necesidades', ideal_pct: 50 },
  { clave: 'deseo', nombre: 'Deseos', ideal_pct: 30 },
  { clave: 'ahorro', nombre: 'Ahorro', ideal_pct: 20 },
] as const

export type ClaveTramo = (typeof REGLA_503020)[number]['clave']

export interface TramoDistribucion {
  clave: ClaveTramo
  nombre: string
  ideal_pct: number
  real_pct: number
  centavos: number
  desvio_pct: number
}

export interface Distribucion503020 {
  ingresos_centavos: number
  total_gastos_centavos: number
  tramos: TramoDistribucion[]
  sin_clasificar_centavos: number
  sin_clasificar_pct: number
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0)

// Los porcentajes reales se calculan sobre los INGRESOS del mes, no sobre los gastos:
// así "50 % en necesidades" significa la mitad de lo que entró. Lo no clasificado se
// informa aparte en lugar de repartirse entre los tramos.
export function distribucion503020(
  ingresosCentavos: number,
  montos: { necesidad: number; deseo: number; ahorro: number; sin_clasificar: number },
): Distribucion503020 {
  const tramos = REGLA_503020.map((t) => {
    const centavos = montos[t.clave]
    const real_pct = pct(centavos, ingresosCentavos)
    return { ...t, real_pct, centavos, desvio_pct: real_pct - t.ideal_pct }
  })
  return {
    ingresos_centavos: ingresosCentavos,
    total_gastos_centavos: montos.necesidad + montos.deseo + montos.ahorro + montos.sin_clasificar,
    tramos,
    sin_clasificar_centavos: montos.sin_clasificar,
    sin_clasificar_pct: pct(montos.sin_clasificar, ingresosCentavos),
  }
}
