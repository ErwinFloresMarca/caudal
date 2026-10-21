import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from './db'
import { metasAhorro, aportesMeta, cuentas, categorias, transacciones } from '../db/schema'
import { crearTransaccion } from './transacciones'
import { getTasa } from './ajustes'
import { calcularProgreso } from '../../shared/metas'
import { formatMoney, type Moneda } from '../../shared/money'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

export interface DatosMeta {
  nombre: string
  monto_objetivo_centavos: number
  moneda: Moneda
  fecha_objetivo?: string | null
  activa?: boolean
}

export interface DatosAporteMeta {
  monto_centavos: number
  cuenta_id?: number | null
  fecha?: string
  nota?: string | null
}

type FilaMeta = typeof metasAhorro.$inferSelect
type FilaAporte = typeof aportesMeta.$inferSelect

function texto(body: Record<string, unknown>, key: string): string | null {
  return body[key] != null && String(body[key]).trim() ? String(body[key]).trim() : null
}

export function parseMeta(body: Record<string, unknown>): DatosMeta {
  const nombre = String(body.nombre ?? '').trim()
  if (!nombre) {
    throw httpError(400, 'El nombre es obligatorio')
  }
  const monto_objetivo_centavos = Number(body.monto_objetivo_centavos)
  if (!Number.isInteger(monto_objetivo_centavos) || monto_objetivo_centavos <= 0) {
    throw httpError(400, 'monto_objetivo_centavos debe ser un entero positivo')
  }
  const moneda = String(body.moneda ?? 'BOB').trim() as Moneda
  if (moneda !== 'BOB' && moneda !== 'USD') {
    throw httpError(400, 'moneda debe ser BOB o USD')
  }
  const fecha_objetivo = body.fecha_objetivo == null || body.fecha_objetivo === '' ? null : String(body.fecha_objetivo)
  if (fecha_objetivo != null && !FECHA_RE.test(fecha_objetivo)) {
    throw httpError(400, 'fecha_objetivo debe usar formato YYYY-MM-DD')
  }
  return {
    nombre,
    monto_objetivo_centavos,
    moneda,
    fecha_objetivo,
    activa: body.activa == null ? undefined : Boolean(body.activa),
  }
}

// Un aporte puede ser negativo (retiro); no se admite 0.
export function parseAporteMeta(body: Record<string, unknown>): DatosAporteMeta {
  const monto_centavos = Number(body.monto_centavos)
  if (!Number.isInteger(monto_centavos) || monto_centavos === 0) {
    throw httpError(400, 'monto_centavos debe ser un entero distinto de 0')
  }
  let cuenta_id: number | null = null
  if (body.cuenta_id != null && body.cuenta_id !== '') {
    cuenta_id = Number(body.cuenta_id)
    if (!Number.isInteger(cuenta_id) || cuenta_id <= 0) {
      throw httpError(400, 'cuenta_id inválido')
    }
  }
  const fecha = body.fecha == null || body.fecha === '' ? undefined : String(body.fecha)
  if (fecha != null && !FECHA_RE.test(fecha)) {
    throw httpError(400, 'fecha debe usar formato YYYY-MM-DD')
  }
  return { monto_centavos, cuenta_id, fecha, nota: texto(body, 'nota') }
}

function aportePublico(a: FilaAporte, moneda: Moneda) {
  return {
    id: a.id,
    monto_centavos: a.monto_centavos,
    monto_formateado: formatMoney({ centavos: a.monto_centavos, moneda }),
    fecha: a.fecha,
    cuenta_id: a.cuenta_id ?? null,
    transaccion_id: a.transaccion_id ?? null,
    nota: a.nota ?? null,
  }
}

function metaPublica(m: FilaMeta, aportes: FilaAporte[], conAportes = false) {
  const moneda = m.moneda as Moneda
  const progreso = calcularProgreso(aportes.map((a) => a.monto_centavos), m.monto_objetivo_centavos)
  return {
    id: m.id,
    fondo_id: m.fondo_id,
    nombre: m.nombre,
    monto_objetivo_centavos: m.monto_objetivo_centavos,
    moneda,
    monto_objetivo_formateado: formatMoney({ centavos: m.monto_objetivo_centavos, moneda }),
    fecha_objetivo: m.fecha_objetivo ?? null,
    activa: m.activa,
    progreso: {
      ...progreso,
      acumulado_formateado: formatMoney({ centavos: progreso.acumulado_centavos, moneda }),
      restante_formateado: formatMoney({ centavos: progreso.restante_centavos, moneda }),
    },
    ...(conAportes ? { aportes: aportes.map((a) => aportePublico(a, moneda)) } : {}),
  }
}

async function aportesDe(metaIds: number[]) {
  if (metaIds.length === 0) return new Map<number, FilaAporte[]>()
  const filas = await db.select().from(aportesMeta).where(inArray(aportesMeta.meta_id, metaIds)).orderBy(asc(aportesMeta.fecha), asc(aportesMeta.id))
  const map = new Map<number, FilaAporte[]>()
  for (const a of filas) {
    const arr = map.get(a.meta_id)
    if (arr) arr.push(a)
    else map.set(a.meta_id, [a])
  }
  return map
}

export async function crearMeta(userId: number, fondoId: number, data: DatosMeta) {
  const [meta] = await db
    .insert(metasAhorro)
    .values({
      user_id: userId,
      fondo_id: fondoId,
      nombre: data.nombre,
      monto_objetivo_centavos: data.monto_objetivo_centavos,
      moneda: data.moneda,
      fecha_objetivo: data.fecha_objetivo,
      activa: data.activa ?? true,
    })
    .returning()
  if (!meta) {
    throw httpError(500, 'No se pudo crear la meta')
  }
  return getMeta(userId, meta.id)
}

export async function listarMetas(userId: number, fondoId: number) {
  const filas = await db
    .select()
    .from(metasAhorro)
    .where(and(eq(metasAhorro.user_id, userId), eq(metasAhorro.fondo_id, fondoId)))
    .orderBy(desc(metasAhorro.created_at), desc(metasAhorro.id))
  const map = await aportesDe(filas.map((m) => m.id))
  return filas.map((m) => metaPublica(m, map.get(m.id) ?? []))
}

export async function getMeta(userId: number, id: number) {
  const [meta] = await db
    .select()
    .from(metasAhorro)
    .where(and(eq(metasAhorro.id, id), eq(metasAhorro.user_id, userId)))
    .limit(1)
  if (!meta) return null
  const aportes = await db
    .select()
    .from(aportesMeta)
    .where(eq(aportesMeta.meta_id, id))
    .orderBy(asc(aportesMeta.fecha), asc(aportesMeta.id))
  return metaPublica(meta, aportes, true)
}

export async function editarMeta(userId: number, id: number, data: DatosMeta) {
  const [meta] = await db
    .select()
    .from(metasAhorro)
    .where(and(eq(metasAhorro.id, id), eq(metasAhorro.user_id, userId)))
    .limit(1)
  if (!meta) {
    throw httpError(404, 'Meta no encontrada')
  }
  await db
    .update(metasAhorro)
    .set({
      nombre: data.nombre,
      monto_objetivo_centavos: data.monto_objetivo_centavos,
      moneda: data.moneda,
      fecha_objetivo: data.fecha_objetivo,
      activa: data.activa ?? meta.activa,
    })
    .where(and(eq(metasAhorro.id, id), eq(metasAhorro.user_id, userId)))
  return getMeta(userId, id)
}

export async function borrarMeta(userId: number, id: number) {
  const meta = await getMeta(userId, id)
  if (!meta) {
    throw httpError(404, 'Meta no encontrada')
  }
  await db.transaction(async (tx) => {
    await tx.delete(aportesMeta).where(eq(aportesMeta.meta_id, id))
    await tx.delete(metasAhorro).where(and(eq(metasAhorro.id, id), eq(metasAhorro.user_id, userId)))
  })
  return meta
}

async function metaPropia(userId: number, metaId: number) {
  const [meta] = await db
    .select({ id: metasAhorro.id, fondo_id: metasAhorro.fondo_id, moneda: metasAhorro.moneda, nombre: metasAhorro.nombre })
    .from(metasAhorro)
    .where(and(eq(metasAhorro.id, metaId), eq(metasAhorro.user_id, userId)))
    .limit(1)
  if (!meta) {
    throw httpError(404, 'Meta no encontrada')
  }
  return meta
}

// La cuenta, si viene, debe ser del usuario, del mismo fondo y de la moneda de la meta.
// Convertir el aporte con tasa queda fuera de alcance (SPC-044).
async function validarCuenta(userId: number, fondoId: number, cuentaId: number, moneda: Moneda) {
  const [cuenta] = await db
    .select({ id: cuentas.id, moneda: cuentas.moneda })
    .from(cuentas)
    .where(and(eq(cuentas.id, cuentaId), eq(cuentas.user_id, userId), eq(cuentas.fondo_id, fondoId)))
    .limit(1)
  if (!cuenta) {
    throw httpError(400, 'Cuenta no encontrada en este fondo')
  }
  if (cuenta.moneda !== moneda) {
    throw httpError(400, `La cuenta debe estar en ${moneda}, como la meta`)
  }
}

// El gasto del aporte se lee como "Ahorro" en reportes, no como "Otros".
// shortcut: sin unique (user, fondo, nombre, tipo); dos aportes simultáneos podrían
// crear la categoría dos veces. Se resuelve si aparece duplicada.
async function categoriaAhorro(userId: number, fondoId: number, ejecutor: Pick<typeof db, 'insert'>) {
  const [existente] = await db
    .select({ id: categorias.id })
    .from(categorias)
    .where(and(eq(categorias.user_id, userId), eq(categorias.fondo_id, fondoId), eq(categorias.nombre, 'Ahorro'), eq(categorias.tipo, 'gasto')))
    .limit(1)
  if (existente) return existente.id
  const [nueva] = await ejecutor
    .insert(categorias)
    .values({ user_id: userId, fondo_id: fondoId, nombre: 'Ahorro', tipo: 'gasto', icono: 'savings', color: '#0FA47F' })
    .returning({ id: categorias.id })
  if (!nueva) {
    throw httpError(500, 'No se pudo crear la categoría Ahorro')
  }
  return nueva.id
}

export async function crearAporteMeta(userId: number, metaId: number, data: DatosAporteMeta) {
  const meta = await metaPropia(userId, metaId)
  const moneda = meta.moneda as Moneda
  if (data.cuenta_id != null) {
    await validarCuenta(userId, meta.fondo_id, data.cuenta_id, moneda)
  }

  // La categoría se resuelve fuera de la transacción: `crearTransaccion` la valida
  // con `db` y no vería una fila sin commitear.
  let datosTrx: Parameters<typeof crearTransaccion>[2] | null = null
  if (data.cuenta_id != null) {
    // Las cuentas USD exigen tasa (0002) para consolidar reportes: se usa la vigente.
    const tasa = moneda === 'USD' ? (await getTasa(userId)).actual?.valor : undefined
    if (moneda === 'USD' && tasa == null) {
      throw httpError(400, 'Configurá la tasa del dólar para aportar desde una cuenta USD')
    }
    datosTrx = {
      cuenta_id: data.cuenta_id,
      categoria_id: await categoriaAhorro(userId, meta.fondo_id, db),
      tipo: data.monto_centavos > 0 ? 'gasto' : 'ingreso',
      monto_centavos: Math.abs(data.monto_centavos),
      fecha: data.fecha,
      nota: data.nota ?? `Aporte a ${meta.nombre}`,
      tasa_ref: tasa ?? null,
      fuente: 'meta',
    }
  }

  const aporte = await db.transaction(async (tx) => {
    // La transacción espejo y el aporte se escriben juntos o no se escribe ninguno.
    let transaccionId: number | null = null
    if (datosTrx) {
      const trx = await crearTransaccion(userId, meta.fondo_id, datosTrx, tx)
      transaccionId = trx.id
    }
    const [fila] = await tx
      .insert(aportesMeta)
      .values({
        meta_id: metaId,
        cuenta_id: data.cuenta_id ?? null,
        transaccion_id: transaccionId,
        monto_centavos: data.monto_centavos,
        fecha: data.fecha ?? new Date().toISOString().slice(0, 10),
        nota: data.nota,
      })
      .returning()
    if (!fila) {
      throw httpError(500, 'No se pudo registrar el aporte')
    }
    return fila
  })

  return { meta: await getMeta(userId, metaId), aporte: aportePublico(aporte, moneda) }
}

export async function editarAporteMeta(userId: number, metaId: number, aporteId: number, data: DatosAporteMeta) {
  const meta = await metaPropia(userId, metaId)
  const moneda = meta.moneda as Moneda
  const [aporte] = await db
    .select()
    .from(aportesMeta)
    .where(and(eq(aportesMeta.id, aporteId), eq(aportesMeta.meta_id, metaId)))
    .limit(1)
  if (!aporte) {
    throw httpError(404, 'Aporte no encontrado')
  }
  // Cambiar de cuenta obligaría a mover el gasto de cuenta: se resuelve borrando y creando.
  // `cuenta_id` ausente significa "no tocar la cuenta".
  if (data.cuenta_id !== undefined && (data.cuenta_id ?? null) !== (aporte.cuenta_id ?? null)) {
    throw httpError(400, 'No se puede cambiar la cuenta de un aporte: borralo y crealo de nuevo')
  }
  const fecha = data.fecha ?? aporte.fecha

  const update = await db.transaction(async (tx) => {
    if (aporte.transaccion_id != null) {
      await tx
        .update(transacciones)
        .set({
          tipo: data.monto_centavos > 0 ? 'gasto' : 'ingreso',
          monto_centavos: Math.abs(data.monto_centavos),
          fecha,
          nota: data.nota ?? null,
        })
        .where(eq(transacciones.id, aporte.transaccion_id))
    }
    const [fila] = await tx
      .update(aportesMeta)
      .set({ monto_centavos: data.monto_centavos, fecha, nota: data.nota })
      .where(eq(aportesMeta.id, aporteId))
      .returning()
    return fila
  })
  return { meta: await getMeta(userId, metaId), aporte: update ? aportePublico(update, moneda) : null }
}

export async function borrarAporteMeta(userId: number, metaId: number, aporteId: number) {
  await metaPropia(userId, metaId)
  const [aporte] = await db
    .select()
    .from(aportesMeta)
    .where(and(eq(aportesMeta.id, aporteId), eq(aportesMeta.meta_id, metaId)))
    .limit(1)
  if (!aporte) {
    throw httpError(404, 'Aporte no encontrado')
  }
  await db.transaction(async (tx) => {
    // Primero el aporte (es quien referencia la transacción), después el espejo.
    await tx.delete(aportesMeta).where(eq(aportesMeta.id, aporteId))
    if (aporte.transaccion_id != null) {
      await tx.delete(transacciones).where(eq(transacciones.id, aporte.transaccion_id))
    }
  })
  return { meta: await getMeta(userId, metaId), borrado: true }
}
