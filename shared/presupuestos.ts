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
