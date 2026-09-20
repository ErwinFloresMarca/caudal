import { and, asc, eq } from 'drizzle-orm'
import { db } from './db'
import { recurrentes, cuentas, categorias } from '../db/schema'
import { crearTransaccion, hoyLocal, type TipoTransaccion } from './transacciones'
import { esFrecuencia, esVencida, nextDate, normalizarCadencia, type Cadencia } from '../../shared/recurrentes'
import { formatMoney, type Moneda } from '../../shared/money'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/
const FUENTE = 'recurrente'

export interface DatosRecurrente {
  cuenta_id: number
  categoria_id?: number | null
  tipo: TipoTransaccion
  monto_centavos: number
  cadencia: Cadencia
  proxima_fecha?: string
  activo?: boolean
  nota?: string | null
}

type FilaRecurrente = typeof recurrentes.$inferSelect

export function parseCadencia(v: unknown): Cadencia {
  let obj: unknown = v
  if (typeof v === 'string') {
    try {
      obj = JSON.parse(v)
    } catch {
      throw httpError(400, 'cadencia inválida')
    }
  }
  if (!obj || typeof obj !== 'object') {
    throw httpError(400, 'cadencia es obligatoria')
  }
  const o = obj as Record<string, unknown>
  if (!esFrecuencia(o.frecuencia)) {
    throw httpError(400, 'frecuencia inválida')
  }

  let dia: number | undefined
  if (o.dia != null && o.dia !== '') {
    dia = Number(o.dia)
    if (!Number.isInteger(dia) || dia < 1 || dia > 31) {
      throw httpError(400, 'dia debe ser un entero entre 1 y 31')
    }
  }

  let dia_semana: number | undefined
  if (o.dia_semana != null && o.dia_semana !== '') {
    dia_semana = Number(o.dia_semana)
    if (!Number.isInteger(dia_semana) || dia_semana < 0 || dia_semana > 6) {
      throw httpError(400, 'dia_semana debe ser un entero entre 0 y 6')
    }
  }

  return { frecuencia: o.frecuencia, dia, dia_semana }
}

export function parseRecurrente(body: Record<string, unknown>): DatosRecurrente {
  const cuenta_id = Number(body.cuenta_id)
  if (!Number.isInteger(cuenta_id) || cuenta_id <= 0) {
    throw httpError(400, 'cuenta_id es obligatorio')
  }

  const tipo = String(body.tipo ?? '').trim()
  if (tipo !== 'ingreso' && tipo !== 'gasto') {
    throw httpError(400, 'tipo debe ser ingreso o gasto')
  }

  const monto_centavos = Number(body.monto_centavos)
  if (!Number.isInteger(monto_centavos) || monto_centavos <= 0) {
    throw httpError(400, 'monto_centavos debe ser un entero positivo')
  }

  let categoria_id: number | null = null
  if (body.categoria_id != null && body.categoria_id !== '') {
    categoria_id = Number(body.categoria_id)
    if (!Number.isInteger(categoria_id) || categoria_id <= 0) {
      throw httpError(400, 'categoria_id inválido')
    }
  }

  const proxima_fecha = body.proxima_fecha == null ? undefined : String(body.proxima_fecha)
  if (proxima_fecha != null && !FECHA_RE.test(proxima_fecha)) {
    throw httpError(400, 'proxima_fecha debe usar formato YYYY-MM-DD')
  }

  let nota: string | null = null
  if (body.nota != null && String(body.nota).trim()) {
    nota = String(body.nota).trim()
  }

  return {
    cuenta_id,
    categoria_id,
    tipo: tipo as TipoTransaccion,
    monto_centavos,
    cadencia: parseCadencia(body.cadencia),
    proxima_fecha,
    activo: body.activo == null ? undefined : Boolean(body.activo),
    nota,
  }
}

// La cuenta fija la moneda y debe pertenecer al fondo; la categoría, si viene, también.
async function validarOrigen(userId: number, fondoId: number, data: DatosRecurrente): Promise<Moneda> {
  const [cuenta] = await db
    .select({ id: cuentas.id, moneda: cuentas.moneda })
    .from(cuentas)
    .where(and(eq(cuentas.id, data.cuenta_id), eq(cuentas.user_id, userId), eq(cuentas.fondo_id, fondoId)))
    .limit(1)
  if (!cuenta) {
    throw httpError(400, 'Cuenta no encontrada en este fondo')
  }
  if (data.categoria_id != null) {
    const [cat] = await db
      .select({ id: categorias.id })
      .from(categorias)
      .where(and(eq(categorias.id, data.categoria_id), eq(categorias.user_id, userId), eq(categorias.fondo_id, fondoId)))
      .limit(1)
    if (!cat) {
      throw httpError(400, 'Categoría no encontrada en este fondo')
    }
  }
  return cuenta.moneda as Moneda
}

function recurrentePublica(
  r: FilaRecurrente,
  extra?: { categoria?: { id: number; nombre: string; icono: string | null; color: string | null } | null; hoy?: string },
) {
  const hoy = extra?.hoy ?? hoyLocal()
  return {
    id: r.id,
    fondo_id: r.fondo_id,
    cuenta_id: r.cuenta_id,
    categoria_id: r.categoria_id,
    tipo: r.tipo,
    monto_centavos: r.monto_centavos,
    moneda: r.moneda,
    monto_formateado: formatMoney({ centavos: r.monto_centavos, moneda: r.moneda as Moneda }),
    cadencia: r.cadencia,
    proxima_fecha: r.proxima_fecha,
    activo: r.activo,
    nota: r.nota ?? null,
    pendiente: r.activo && esVencida(r.proxima_fecha, hoy),
    categoria: extra?.categoria ?? null,
  }
}

// Query construida por llamada (el builder de Drizzle es mutable).
function listadoQuery() {
  return db
    .select({
      r: recurrentes,
      categoria_id: categorias.id,
      categoria_nombre: categorias.nombre,
      categoria_icono: categorias.icono,
      categoria_color: categorias.color,
    })
    .from(recurrentes)
    .leftJoin(categorias, eq(categorias.id, recurrentes.categoria_id))
}

function conCategoria(f: { r: FilaRecurrente; categoria_id: number | null; categoria_nombre: string | null; categoria_icono: string | null; categoria_color: string | null }) {
  return recurrentePublica(f.r, {
    categoria: f.categoria_id ? { id: f.categoria_id, nombre: f.categoria_nombre!, icono: f.categoria_icono, color: f.categoria_color } : null,
  })
}

export async function crearRecurrente(userId: number, fondoId: number, data: DatosRecurrente) {
  const moneda = await validarOrigen(userId, fondoId, data)
  const proxima = data.proxima_fecha ?? hoyLocal()
  const cadencia = normalizarCadencia(data.cadencia, proxima)

  const [row] = await db
    .insert(recurrentes)
    .values({
      user_id: userId,
      fondo_id: fondoId,
      cuenta_id: data.cuenta_id,
      categoria_id: data.categoria_id ?? null,
      tipo: data.tipo,
      monto_centavos: data.monto_centavos,
      moneda,
      cadencia,
      proxima_fecha: proxima,
      activo: data.activo ?? true,
      nota: data.nota,
    })
    .returning()
  if (!row) {
    throw httpError(500, 'No se pudo crear el recurrente')
  }
  return getRecurrente(userId, row.id)
}

export async function listarRecurrentes(userId: number, fondoId: number) {
  const filas = await listadoQuery()
    .where(and(eq(recurrentes.user_id, userId), eq(recurrentes.fondo_id, fondoId)))
    .orderBy(asc(recurrentes.proxima_fecha), asc(recurrentes.id))
  return filas.map(conCategoria)
}

export async function listarPendientes(userId: number, fondoId: number) {
  const todos = await listarRecurrentes(userId, fondoId)
  return todos.filter((r) => r.pendiente)
}

export async function getRecurrente(userId: number, id: number) {
  const [fila] = await listadoQuery()
    .where(and(eq(recurrentes.id, id), eq(recurrentes.user_id, userId)))
    .limit(1)
  return fila ? conCategoria(fila) : null
}

export async function editarRecurrente(userId: number, id: number, data: DatosRecurrente) {
  const [row] = await db
    .select()
    .from(recurrentes)
    .where(and(eq(recurrentes.id, id), eq(recurrentes.user_id, userId)))
    .limit(1)
  if (!row) {
    throw httpError(404, 'Recurrente no encontrado')
  }
  const moneda = await validarOrigen(userId, row.fondo_id, data)
  const proxima = data.proxima_fecha ?? row.proxima_fecha
  const cadencia = normalizarCadencia(data.cadencia, proxima)

  await db
    .update(recurrentes)
    .set({
      cuenta_id: data.cuenta_id,
      categoria_id: data.categoria_id ?? null,
      tipo: data.tipo,
      monto_centavos: data.monto_centavos,
      moneda,
      cadencia,
      proxima_fecha: proxima,
      activo: data.activo ?? row.activo,
      nota: data.nota,
    })
    .where(and(eq(recurrentes.id, id), eq(recurrentes.user_id, userId)))
  return getRecurrente(userId, id)
}

export async function borrarRecurrente(userId: number, id: number) {
  const [row] = await db
    .select()
    .from(recurrentes)
    .where(and(eq(recurrentes.id, id), eq(recurrentes.user_id, userId)))
    .limit(1)
  if (!row) {
    throw httpError(404, 'Recurrente no encontrado')
  }
  await db.delete(recurrentes).where(and(eq(recurrentes.id, id), eq(recurrentes.user_id, userId)))
  return recurrentePublica(row)
}

// Confirma un pendiente: crea la transacción (fuente='recurrente') en la fecha esperada
// y avanza `proxima_fecha` una ocurrencia. La tasa (cuentas USD) se pide al confirmar.
export async function confirmarRecurrente(userId: number, id: number, opts: { fecha?: string; tasa_ref?: number | null } = {}) {
  const [row] = await db
    .select()
    .from(recurrentes)
    .where(and(eq(recurrentes.id, id), eq(recurrentes.user_id, userId)))
    .limit(1)
  if (!row) {
    throw httpError(404, 'Recurrente no encontrado')
  }
  const fecha = opts.fecha ?? row.proxima_fecha
  if (!FECHA_RE.test(fecha)) {
    throw httpError(400, 'fecha debe usar formato YYYY-MM-DD')
  }

  const transaccion = await crearTransaccion(userId, row.fondo_id, {
    cuenta_id: row.cuenta_id,
    categoria_id: row.categoria_id,
    tipo: row.tipo as TipoTransaccion,
    monto_centavos: row.monto_centavos,
    fecha,
    nota: row.nota,
    tasa_ref: opts.tasa_ref ?? null,
    fuente: FUENTE,
  })

  // El avance se ancla en la fecha programada, no en un override de registro.
  const proxima = nextDate(row.proxima_fecha, row.cadencia as Cadencia)
  await db
    .update(recurrentes)
    .set({ proxima_fecha: proxima })
    .where(and(eq(recurrentes.id, id), eq(recurrentes.user_id, userId)))

  return { recurrente: await getRecurrente(userId, id), transaccion }
}

// Salta una ocurrencia sin crear movimiento.
export async function saltarRecurrente(userId: number, id: number) {
  const [row] = await db
    .select()
    .from(recurrentes)
    .where(and(eq(recurrentes.id, id), eq(recurrentes.user_id, userId)))
    .limit(1)
  if (!row) {
    throw httpError(404, 'Recurrente no encontrado')
  }
  const proxima = nextDate(row.proxima_fecha, row.cadencia as Cadencia)
  await db
    .update(recurrentes)
    .set({ proxima_fecha: proxima })
    .where(and(eq(recurrentes.id, id), eq(recurrentes.user_id, userId)))
  return getRecurrente(userId, id)
}
