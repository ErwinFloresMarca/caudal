import { and, eq } from 'drizzle-orm'
import { db } from './db'
import { fondos } from '../db/schema'
import { sembrarCategorias } from './categorias'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

export const TIPOS_FONDO = ['personal', 'negocio'] as const
export type TipoFondo = (typeof TIPOS_FONDO)[number]

export const MONEDAS_FONDO = ['BOB', 'USD'] as const
export type MonedaFondo = (typeof MONEDAS_FONDO)[number]

export interface DatosFondo {
  nombre: string
  tipo: TipoFondo
  moneda_base: MonedaFondo
  color?: string | null
  icono?: string | null
  activo?: boolean
}

function fondoPublico(f: { id: number; nombre: string; tipo: string; moneda_base: string; color: string | null; icono: string | null; activo: boolean }) {
  return {
    id: f.id,
    nombre: f.nombre,
    tipo: f.tipo,
    moneda_base: f.moneda_base,
    color: f.color,
    icono: f.icono,
    activo: f.activo,
  }
}

function parseFondo(body: Record<string, unknown>): DatosFondo {
  const nombre = String(body.nombre ?? '').trim()
  if (!nombre) {
    throw httpError(400, 'El nombre es obligatorio')
  }
  const tipo = String(body.tipo ?? '').trim()
  if (!TIPOS_FONDO.includes(tipo as TipoFondo)) {
    throw httpError(400, 'tipo debe ser personal o negocio')
  }
  const moneda_base = String(body.moneda_base ?? 'BOB').trim() as MonedaFondo
  if (!MONEDAS_FONDO.includes(moneda_base)) {
    throw httpError(400, 'moneda_base debe ser BOB o USD')
  }
  return {
    nombre,
    tipo: tipo as TipoFondo,
    moneda_base,
    color: body.color == null ? null : String(body.color),
    icono: body.icono == null ? null : String(body.icono),
    activo: body.activo == null ? undefined : Boolean(body.activo),
  }
}

// ponytail: saldo_total del fondo se agrega en SPC-006/008; aquí solo datos del fondo.
export async function listarFondos(userId: number, { incluirInactivos = false } = {}) {
  const cond = and(eq(fondos.user_id, userId), incluirInactivos ? undefined : eq(fondos.activo, true))
  const filas = await db
    .select({
      id: fondos.id,
      nombre: fondos.nombre,
      tipo: fondos.tipo,
      moneda_base: fondos.moneda_base,
      color: fondos.color,
      icono: fondos.icono,
      activo: fondos.activo,
    })
    .from(fondos)
    .where(cond)
    .orderBy(fondos.nombre)
  return filas.map(fondoPublico)
}

export async function getFondo(userId: number, id: number) {
  const [fondo] = await db.select().from(fondos).where(and(eq(fondos.id, id), eq(fondos.user_id, userId))).limit(1)
  return fondo ?? null
}

export async function getFondoPublico(userId: number, id: number) {
  const fondo = await getFondo(userId, id)
  return fondo ? fondoPublico(fondo) : null
}

export async function crearFondo(userId: number, data: DatosFondo): Promise<typeof fondos.$inferSelect> {
  const [fondo] = await db
    .insert(fondos)
    .values({
      user_id: userId,
      nombre: data.nombre,
      tipo: data.tipo,
      moneda_base: data.moneda_base,
      color: data.color,
      icono: data.icono,
      activo: data.activo ?? true,
    })
    .returning()
  if (!fondo) {
    throw httpError(500, 'No se pudo crear el fondo')
  }
  // Presets de categorías (SPC-007) al nacer el fondo.
  await sembrarCategorias(userId, fondo.id, data.tipo)
  return fondo
}

export async function editarFondo(userId: number, id: number, data: DatosFondo) {
  const fondo = await getFondo(userId, id)
  if (!fondo) {
    throw httpError(404, 'Fondo no encontrado')
  }
  const [update] = await db
    .update(fondos)
    .set({
      nombre: data.nombre,
      tipo: data.tipo,
      moneda_base: data.moneda_base,
      color: data.color,
      icono: data.icono,
      activo: data.activo ?? fondo.activo,
    })
    .where(and(eq(fondos.id, id), eq(fondos.user_id, userId)))
    .returning()
  return update ? fondoPublico(update) : fondoPublico(fondo)
}

export async function ocultarFondo(userId: number, id: number) {
  const fondo = await getFondo(userId, id)
  if (!fondo) {
    throw httpError(404, 'Fondo no encontrado')
  }
  const [update] = await db
    .update(fondos)
    .set({ activo: false })
    .where(and(eq(fondos.id, id), eq(fondos.user_id, userId)))
    .returning()
  return update ? fondoPublico(update) : fondoPublico(fondo)
}

export { parseFondo, fondoPublico }

// Fondo activo de la sesión; si no existe o se ocultó, fallback al primer fondo activo.
export async function fondoActivoUsuario(userId: number, sessionFondoId: number | undefined | null) {
  if (sessionFondoId != null) {
    const activo = await getFondoPublico(userId, sessionFondoId)
    if (activo?.activo) return activo
  }
  const primeros = await listarFondos(userId)
  return primeros[0] ?? null
}