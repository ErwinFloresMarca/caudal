import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm'
import { db } from './db'
import { transacciones, cuentas, categorias } from '../db/schema'
import { registrarTasaUsada } from './ajustes'
import { formatMoney, type Moneda } from '../../shared/money'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

export type TipoTransaccion = 'ingreso' | 'gasto'

export interface DatosTransaccion {
  cuenta_id: number
  categoria_id?: number | null
  tipo: TipoTransaccion
  monto_centavos: number
  fecha?: string
  nota?: string | null
  tasa_ref?: number | null
  fuente?: string | null
}

type FilaTransaccion = typeof transacciones.$inferSelect

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

export function hoyLocal(): string {
  return new Date().toISOString().slice(0, 10)
}

// Solo valida el formato; la moneda la hereda la cuenta (se resuelve en crear/editar).
export function parseTransaccion(body: Record<string, unknown>): DatosTransaccion {
  const cuenta_id = Number(body.cuenta_id)
  if (!Number.isInteger(cuenta_id) || cuenta_id <= 0) {
    throw httpError(400, 'cuenta_id es obligatorio')
  }

  const tipo = String(body.tipo ?? '').trim()
  if (tipo !== 'ingreso' && tipo !== 'gasto') {
    throw httpError(400, 'tipo debe ser ingreso o gasto')
  }

  const monto = Number(body.monto_centavos)
  if (!Number.isInteger(monto) || monto <= 0) {
    throw httpError(400, 'monto_centavos debe ser un entero positivo')
  }

  const fecha = body.fecha == null ? undefined : String(body.fecha)
  if (fecha != null && !FECHA_RE.test(fecha)) {
    throw httpError(400, 'fecha debe usar formato YYYY-MM-DD')
  }

  let categoria_id: number | undefined | null
  if (body.categoria_id != null && body.categoria_id !== '') {
    categoria_id = Number(body.categoria_id)
    if (!Number.isInteger(categoria_id) || categoria_id <= 0) {
      throw httpError(400, 'categoria_id inválido')
    }
  } else {
    categoria_id = null
  }

  let nota: string | null = null
  if (body.nota != null && String(body.nota).trim()) {
    nota = String(body.nota).trim()
  }

  let tasa_ref: number | undefined | null
  if (body.tasa_ref != null && String(body.tasa_ref).trim() !== '') {
    tasa_ref = Number(String(body.tasa_ref).replace(',', '.'))
    if (!Number.isFinite(tasa_ref) || tasa_ref <= 0) {
      throw httpError(400, 'tasa_ref debe ser un número positivo')
    }
  } else {
    tasa_ref = null
  }

  return { cuenta_id, categoria_id, tipo, monto_centavos: monto, fecha, nota, tasa_ref }
}

// La cuenta determina la moneda; la categoría debe ser del MISMO fondo (validación server).
export async function validarOrigen(userId: number, fondoId: number, data: DatosTransaccion) {
  const [cuenta] = await db
    .select({ id: cuentas.id, moneda: cuentas.moneda })
    .from(cuentas)
    .where(and(eq(cuentas.id, data.cuenta_id), eq(cuentas.user_id, userId), eq(cuentas.fondo_id, fondoId)))
    .limit(1)
  if (!cuenta) {
    throw httpError(400, 'Cuenta no encontrada en este fondo')
  }

  let categoria: { id: number; nombre: string; icono: string | null; color: string | null } | null = null
  if (data.categoria_id != null) {
    const [cat] = await db
      .select({ id: categorias.id, nombre: categorias.nombre, icono: categorias.icono, color: categorias.color })
      .from(categorias)
      .where(and(eq(categorias.id, data.categoria_id), eq(categorias.user_id, userId), eq(categorias.fondo_id, fondoId)))
      .limit(1)
    if (!cat) {
      throw httpError(400, 'Categoría no encontrada en este fondo')
    }
    categoria = cat
  }

  if (cuenta.moneda === 'USD' && (data.tasa_ref == null || data.tasa_ref <= 0)) {
    throw httpError(400, 'tasa_ref es obligatoria para cuentas USD')
  }

  return { moneda: cuenta.moneda as Moneda, categoria }
}

function transaccionPublica(t: FilaTransaccion, extra?: { moneda: Moneda; categoria: { id: number; nombre: string; icono: string | null; color: string | null } | null }) {
  return {
    id: t.id,
    fecha: t.fecha,
    tipo: t.tipo,
    monto_centavos: t.monto_centavos,
    moneda: extra?.moneda ?? t.moneda,
    tasa_ref: t.tasa_ref ?? null,
    nota: t.nota ?? null,
    fuente: t.fuente ?? null,
    cuenta_id: t.cuenta_id,
    fondo_id: t.fondo_id,
    monto_formateado: formatMoney({ centavos: t.monto_centavos, moneda: (extra?.moneda ?? t.moneda) as Moneda }),
    categoria: extra?.categoria ?? null,
  }
}

export async function crearTransaccion(userId: number, fondoId: number, data: DatosTransaccion) {
  const { moneda, categoria } = await validarOrigen(userId, fondoId, data)
  const [trx] = await db
    .insert(transacciones)
    .values({
      user_id: userId,
      fondo_id: fondoId,
      cuenta_id: data.cuenta_id,
      categoria_id: data.categoria_id ?? null,
      tipo: data.tipo,
      monto_centavos: data.monto_centavos,
      moneda,
      tasa_ref: moneda === 'USD' ? (data.tasa_ref ?? null) : null,
      fecha: data.fecha ?? hoyLocal(),
      nota: data.nota,
      fuente: data.fuente ?? null,
    })
    .returning()
  if (!trx) {
    throw httpError(500, 'No se pudo registrar la transacción')
  }
  // Recuerda la última tasa USD usada para auto-sugerirla (0002).
  if (moneda === 'USD' && data.tasa_ref != null) {
    await registrarTasaUsada(userId, data.tasa_ref, trx.fecha)
  }
  return transaccionPublica(trx, { moneda, categoria })
}

// Listado construido por llamada: el builder de Drizzle es mutable y no soporta
// ejecución concurrente compartiendo la misma instancia.
function listadoQuery() {
  return db
    .select({
      trx: transacciones,
      cuenta_moneda: cuentas.moneda,
      categoria_id: categorias.id,
      categoria_nombre: categorias.nombre,
      categoria_icono: categorias.icono,
      categoria_color: categorias.color,
    })
    .from(transacciones)
    .leftJoin(cuentas, eq(cuentas.id, transacciones.cuenta_id))
    .leftJoin(categorias, eq(categorias.id, transacciones.categoria_id))
}

export async function listarTransacciones(userId: number, fondoId: number, { desde, hasta }: { desde?: string; hasta?: string } = {}) {
  const filas = await listadoQuery()
    .where(
      and(
        eq(transacciones.user_id, userId),
        eq(transacciones.fondo_id, fondoId),
        desde ? sql`${transacciones.fecha} >= ${desde}` : undefined,
        hasta ? sql`${transacciones.fecha} <= ${hasta}` : undefined,
      ),
    )
    .orderBy(desc(transacciones.fecha), desc(transacciones.id))
  return filas.map((f) =>
    transaccionPublica(f.trx, {
      moneda: f.cuenta_moneda as Moneda,
      categoria: f.categoria_id ? { id: f.categoria_id, nombre: f.categoria_nombre!, icono: f.categoria_icono, color: f.categoria_color } : null,
    }),
  )
}

export interface FiltrosBusqueda {
  fondoIds?: number[]
  cuenta_id?: number
  categoria_id?: number
  tipo?: TipoTransaccion
  moneda?: Moneda
  fuente?: string
  q?: string
  desde?: string
  hasta?: string
  monto_min?: number
  monto_max?: number
  orden?: 'fecha' | 'monto'
  limite?: number
  cursor?: { valor: string | number; id: number }
}

// Búsqueda con filtros combinables + paginación por cursor. El cursor es
// `fecha|id` (orden fecha) o `monto|id` (orden monto): no pierde ni repite filas.
export async function buscarTransacciones(userId: number, filtros: FiltrosBusqueda) {
  const limite = Math.min(Math.max(filtros.limite ?? 50, 1), 200)
  const orden = filtros.orden ?? 'fecha'

  const conds = [eq(transacciones.user_id, userId)]
  if (filtros.fondoIds?.length) conds.push(inArray(transacciones.fondo_id, filtros.fondoIds))
  if (filtros.cuenta_id) conds.push(eq(transacciones.cuenta_id, filtros.cuenta_id))
  if (filtros.categoria_id) conds.push(eq(transacciones.categoria_id, filtros.categoria_id))
  if (filtros.tipo) conds.push(eq(transacciones.tipo, filtros.tipo))
  if (filtros.moneda) conds.push(eq(transacciones.moneda, filtros.moneda))
  if (filtros.fuente) conds.push(eq(transacciones.fuente, filtros.fuente))
  if (filtros.desde) conds.push(sql`${transacciones.fecha} >= ${filtros.desde}`)
  if (filtros.hasta) conds.push(sql`${transacciones.fecha} <= ${filtros.hasta}`)
  if (filtros.monto_min != null) conds.push(gte(transacciones.monto_centavos, filtros.monto_min))
  if (filtros.monto_max != null) conds.push(lte(transacciones.monto_centavos, filtros.monto_max))
  if (filtros.q) {
    const like = `%${filtros.q}%`
    conds.push(or(ilike(transacciones.nota, like), ilike(categorias.nombre, like))!)
  }
  if (filtros.cursor) {
    const { valor, id } = filtros.cursor
    if (orden === 'monto') {
      const v = Number(valor)
      conds.push(or(sql`${transacciones.monto_centavos} < ${v}`, and(eq(transacciones.monto_centavos, v), sql`${transacciones.id} < ${id}`))!)
    } else {
      const v = String(valor)
      conds.push(or(sql`${transacciones.fecha} < ${v}`, and(eq(transacciones.fecha, v), sql`${transacciones.id} < ${id}`))!)
    }
  }

  const filas = await listadoQuery()
    .where(and(...conds))
    .orderBy(...(orden === 'monto' ? [desc(transacciones.monto_centavos), desc(transacciones.id)] : [desc(transacciones.fecha), desc(transacciones.id)]))
    .limit(limite + 1)

  const hayMas = filas.length > limite
  const pagina = filas.slice(0, limite)
  const transaccionesPagina = pagina.map((f) =>
    transaccionPublica(f.trx, {
      moneda: f.cuenta_moneda as Moneda,
      categoria: f.categoria_id ? { id: f.categoria_id, nombre: f.categoria_nombre!, icono: f.categoria_icono, color: f.categoria_color } : null,
    }),
  )
  const ultimo = pagina.at(-1)
  const siguiente_cursor =
    hayMas && ultimo ? (orden === 'monto' ? `${ultimo.trx.monto_centavos}|${ultimo.trx.id}` : `${ultimo.trx.fecha}|${ultimo.trx.id}`) : null

  return { transacciones: transaccionesPagina, siguiente_cursor }
}

export async function getTransaccion(userId: number, id: number) {
  const [fila] = await listadoQuery()
    .where(and(eq(transacciones.id, id), eq(transacciones.user_id, userId)))
    .limit(1)
  if (!fila) return null
  return transaccionPublica(fila.trx, {
    moneda: fila.cuenta_moneda as Moneda,
    categoria: fila.categoria_id ? { id: fila.categoria_id, nombre: fila.categoria_nombre!, icono: fila.categoria_icono, color: fila.categoria_color } : null,
  })
}

// Edición: no permite cambiar de cuenta (la moneda la fija la cuenta); sí monto, fecha,
// categoría, nota, tasa y tipo. La validación de origen corre igual que en la creación.
export async function editarTransaccion(userId: number, id: number, data: DatosTransaccion) {
  const [trx] = await db
    .select()
    .from(transacciones)
    .where(and(eq(transacciones.id, id), eq(transacciones.user_id, userId)))
    .limit(1)
  if (!trx) {
    throw httpError(404, 'Transacción no encontrada')
  }
  if (data.cuenta_id !== trx.cuenta_id) {
    throw httpError(400, 'No se puede cambiar la cuenta de una transacción')
  }
  const fondoId = trx.fondo_id
  const { moneda, categoria } = await validarOrigen(userId, fondoId, { ...data, cuenta_id: trx.cuenta_id })

  const [update] = await db
    .update(transacciones)
    .set({
      categoria_id: data.categoria_id ?? trx.categoria_id,
      tipo: data.tipo,
      monto_centavos: data.monto_centavos,
      tasa_ref: moneda === 'USD' ? (data.tasa_ref ?? trx.tasa_ref) : null,
      fecha: data.fecha ?? trx.fecha,
      nota: data.nota ?? trx.nota,
    })
    .where(and(eq(transacciones.id, id), eq(transacciones.user_id, userId)))
    .returning()
  if (!update) return null
  return transaccionPublica(update, { moneda, categoria })
}

export async function borrarTransaccion(userId: number, id: number) {
  const [trx] = await db
    .select()
    .from(transacciones)
    .where(and(eq(transacciones.id, id), eq(transacciones.user_id, userId)))
    .limit(1)
  if (!trx) {
    throw httpError(404, 'Transacción no encontrada')
  }
  await db.delete(transacciones).where(and(eq(transacciones.id, id), eq(transacciones.user_id, userId)))
  return trx
}