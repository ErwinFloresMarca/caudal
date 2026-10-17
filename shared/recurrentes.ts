export type Frecuencia =
  | 'diaria'
  | 'semanal'
  | 'quincenal'
  | 'mensual'
  | 'bimestral'
  | 'trimestral'
  | 'semestral'
  | 'anual'

export interface Cadencia {
  frecuencia: Frecuencia
  dia?: number
  dia_semana?: number
}

export const FRECUENCIAS: Frecuencia[] = ['diaria', 'semanal', 'quincenal', 'mensual', 'bimestral', 'trimestral', 'semestral', 'anual']

// Meses que avanzan por mes calendario (el resto son sumas de días).
const MESES: Partial<Record<Frecuencia, number>> = {
  mensual: 1,
  bimestral: 2,
  trimestral: 3,
  semestral: 6,
  anual: 12,
}

const DIAS: Partial<Record<Frecuencia, number>> = {
  diaria: 1,
  semanal: 7,
  quincenal: 15,
}

const FECHA_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function esFrecuencia(v: unknown): v is Frecuencia {
  return typeof v === 'string' && (FRECUENCIAS as string[]).includes(v)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmt(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`
}

export function diasDelMes(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function parseFecha(fecha: string): { y: number; m: number; d: number } {
  const m = FECHA_RE.exec(fecha)
  if (!m) throw new Error(`Fecha inválida: ${fecha}`)
  const y = Number(m[1])
  const mes = Number(m[2])
  const d = Number(m[3])
  if (mes < 1 || mes > 12 || d < 1 || d > diasDelMes(y, mes)) throw new Error(`Fecha inválida: ${fecha}`)
  return { y, m: mes, d }
}

function addDays(y: number, m: number, d: number, n: number): string {
  const dt = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000)
  return fmt(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())
}

// Avanza N meses conservando el día ancla, recortado al último día del mes destino
// (31 de enero → 28/29 de febrero). El ancla se guarda en `cadencia.dia` para no
// perderla tras un recorte.
function addMonths(y: number, m: number, d: number, ancla: number | undefined, n: number): string {
  const dia = ancla ?? d
  const total = m - 1 + n
  const ny = y + Math.floor(total / 12)
  const nm = ((total % 12) + 12) % 12 + 1
  return fmt(ny, nm, Math.min(dia, diasDelMes(ny, nm)))
}

// Siguiente ocurrencia estrictamente posterior a `fecha`.
export function nextDate(fecha: string, cadencia: Cadencia): string {
  const { y, m, d } = parseFecha(fecha)
  const meses = MESES[cadencia.frecuencia]
  if (meses != null) return addMonths(y, m, d, cadencia.dia, meses)
  const dias = DIAS[cadencia.frecuencia]
  if (dias == null) throw new Error(`Frecuencia inválida: ${cadencia.frecuencia}`)
  return addDays(y, m, d, dias)
}

// Si la cadencia avanza por mes y no fija un día, se ancla al día de la fecha de inicio.
export function normalizarCadencia(cadencia: Cadencia, proximaFecha: string): Cadencia {
  if (MESES[cadencia.frecuencia] != null && cadencia.dia == null) {
    return { ...cadencia, dia: parseFecha(proximaFecha).d }
  }
  return cadencia
}

// Las fechas ISO YYYY-MM-DD comparan lexicográficamente.
export function esVencida(proximaFecha: string, hoy: string): boolean {
  return proximaFecha <= hoy
}
