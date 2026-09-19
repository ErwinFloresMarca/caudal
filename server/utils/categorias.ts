import { and, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { categorias, transacciones } from '../db/schema'
import type { TipoFondo } from './fondos'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

export type TipoCategoria = 'ingreso' | 'gasto'

export interface DatosCategoria {
  nombre: string
  tipo: TipoCategoria
  icono?: string | null
  color?: string | null
  activa?: boolean
}

type FilaCategoria = typeof categorias.$inferSelect

// Presets por tipo de fondo. Colores/iconos limitados a tokens del DESIGN.md.
export const PRESETS_FONDO: Record<TipoFondo, { nombre: string; tipo: TipoCategoria; icono: string; color: string }[]> = {
  personal: [
    { nombre: 'Comida', tipo: 'gasto', icono: 'restaurant', color: '#E5484D' },
    { nombre: 'Transporte', tipo: 'gasto', icono: 'directions_bus', color: '#0E6FFF' },
    { nombre: 'Servicios', tipo: 'gasto', icono: 'receipt_long', color: '#5B6B85' },
    { nombre: 'Salud', tipo: 'gasto', icono: 'ecg_heart', color: '#0FA47F' },
    { nombre: 'Ocio', tipo: 'gasto', icono: 'sports_esports', color: '#E8A13A' },
    { nombre: 'Vivienda', tipo: 'gasto', icono: 'home', color: '#0E6FFF' },
    { nombre: 'Compras', tipo: 'gasto', icono: 'shopping_bag', color: '#0FA47F' },
    { nombre: 'Otros', tipo: 'gasto', icono: 'category', color: '#8E9BAE' },
    { nombre: 'Sueldo', tipo: 'ingreso', icono: 'payments', color: '#0FA47F' },
    { nombre: 'Venta', tipo: 'ingreso', icono: 'storefront', color: '#0E6FFF' },
    { nombre: 'Otros', tipo: 'ingreso', icono: 'savings', color: '#8E9BAE' },
  ],
  negocio: [
    { nombre: 'Insumos', tipo: 'gasto', icono: 'construction', color: '#E5484D' },
    { nombre: 'Empaque', tipo: 'gasto', icono: 'inventory_2', color: '#5B6B85' },
    { nombre: 'Envíos', tipo: 'gasto', icono: 'local_shipping', color: '#0E6FFF' },
    { nombre: 'Impuestos', tipo: 'gasto', icono: 'request_quote', color: '#E8A13A' },
    { nombre: 'Herramientas', tipo: 'gasto', icono: 'handyman', color: '#5B6B85' },
    { nombre: 'Marketing', tipo: 'gasto', icono: 'campaign', color: '#0E6FFF' },
    { nombre: 'Otros', tipo: 'gasto', icono: 'category', color: '#8E9BAE' },
    { nombre: 'Venta', tipo: 'ingreso', icono: 'storefront', color: '#0FA47F' },
    { nombre: 'Servicios', tipo: 'ingreso', icono: 'build', color: '#0E6FFF' },
    { nombre: 'Otros', tipo: 'ingreso', icono: 'savings', color: '#8E9BAE' },
  ],
}

function categoriaPublica(c: FilaCategoria) {
  return {
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    icono: c.icono,
    color: c.color,
    es_predefinida: c.es_predefinida,
    activa: c.activa,
  }
}

export function parseCategoria(body: Record<string, unknown>): DatosCategoria {
  const nombre = String(body.nombre ?? '').trim()
  if (!nombre) {
    throw httpError(400, 'El nombre es obligatorio')
  }
  const tipo = String(body.tipo ?? '').trim() as TipoCategoria
  if (tipo !== 'ingreso' && tipo !== 'gasto') {
    throw httpError(400, 'tipo debe ser ingreso o gasto')
  }
  return {
    nombre,
    tipo,
    icono: body.icono == null ? null : String(body.icono),
    color: body.color == null ? null : String(body.color),
    activa: body.activa == null ? undefined : Boolean(body.activa),
  }
}

// Inserta los presets al crear un fondo (mismo estado para ambos: nada antes → todo).
// Idempotente: no duplica (nombre, tipo) ya sembrados en ese fondo.
export async function sembrarCategorias(userId: number, fondoId: number, tipoFondo: TipoFondo) {
  const presets = PRESETS_FONDO[tipoFondo]
  if (presets.length === 0) return

  const existentes = await db
    .select({ nombre: categorias.nombre, tipo: categorias.tipo })
    .from(categorias)
    .where(and(eq(categorias.user_id, userId), eq(categorias.fondo_id, fondoId)))
  const ya = new Set(existentes.map((e) => `${e.nombre}|${e.tipo}`))

  const nuevos = presets.filter((p) => !ya.has(`${p.nombre}|${p.tipo}`))
  if (nuevos.length === 0) return

  await db.insert(categorias).values(
    nuevos.map((p) => ({
      user_id: userId,
      fondo_id: fondoId,
      nombre: p.nombre,
      tipo: p.tipo,
      icono: p.icono,
      color: p.color,
      es_predefinida: true,
      activa: true,
    })),
  )
}

export async function listarCategorias(userId: number, fondoId: number, { incluirInactivas = false } = {}) {
  const filas = await db
    .select()
    .from(categorias)
    .where(
      and(
        eq(categorias.user_id, userId),
        eq(categorias.fondo_id, fondoId),
        incluirInactivas ? undefined : eq(categorias.activa, true),
      ),
    )
    .orderBy(categorias.tipo, categorias.nombre)
  return filas.map(categoriaPublica)
}

export async function getCategoria(userId: number, id: number) {
  const [categoria] = await db
    .select()
    .from(categorias)
    .where(and(eq(categorias.id, id), eq(categorias.user_id, userId)))
    .limit(1)
  return categoria ? categoriaPublica(categoria) : null
}

export async function crearCategoria(userId: number, fondoId: number, data: DatosCategoria): Promise<FilaCategoria> {
  const [categoria] = await db
    .insert(categorias)
    .values({
      user_id: userId,
      fondo_id: fondoId,
      nombre: data.nombre,
      tipo: data.tipo,
      icono: data.icono,
      color: data.color,
      es_predefinida: false,
      activa: data.activa ?? true,
    })
    .returning()
  if (!categoria) {
    throw httpError(500, 'No se pudo crear la categoría')
  }
  return categoria
}

export async function editarCategoria(userId: number, id: number, data: DatosCategoria) {
  const [categoria] = await db.select().from(categorias).where(and(eq(categorias.id, id), eq(categorias.user_id, userId))).limit(1)
  if (!categoria) {
    throw httpError(404, 'Categoría no encontrada')
  }
  const [update] = await db
    .update(categorias)
    .set({
      nombre: data.nombre ?? categoria.nombre,
      tipo: data.tipo ?? (categoria.tipo as TipoCategoria),
      icono: data.icono == null ? categoria.icono : data.icono,
      color: data.color == null ? categoria.color : data.color,
      activa: data.activa ?? categoria.activa,
    })
    .where(and(eq(categorias.id, id), eq(categorias.user_id, userId)))
    .returning()
  return update ? categoriaPublica(update) : null
}

// Ocultar: válido para predefinidas y propias; conserva histórico.
export async function ocultarCategoria(userId: number, id: number) {
  const [update] = await db
    .update(categorias)
    .set({ activa: false })
    .where(and(eq(categorias.id, id), eq(categorias.user_id, userId)))
    .returning()
  return update ? categoriaPublica(update) : null
}

// Borrar: solo propias sin transacciones. El mensaje sugiere ocultar si tiene usos.
export async function borrarCategoria(userId: number, id: number) {
  const [categoria] = await db.select().from(categorias).where(and(eq(categorias.id, id), eq(categorias.user_id, userId))).limit(1)
  if (!categoria) {
    throw httpError(404, 'Categoría no encontrada')
  }
  if (categoria.es_predefinida) {
    throw httpError(400, 'Las categorías predefinidas no se borran; puedes ocultarlas')
  }
  const [uso] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(transacciones)
    .where(eq(transacciones.categoria_id, id))
  if (Number(uso?.n ?? 0) > 0) {
    throw httpError(400, 'La categoría tiene transacciones; ocúltala en vez de borrarla')
  }
  await db.delete(categorias).where(and(eq(categorias.id, id), eq(categorias.user_id, userId)))
  return categoriaPublica(categoria)
}