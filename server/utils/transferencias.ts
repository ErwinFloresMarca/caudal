import { aliasedTable, and, desc, eq } from 'drizzle-orm'
import { db } from './db'
import { transferencias, cuentas } from '../db/schema'
import { formatMoney, type Moneda } from '../../shared/money'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

export interface DatosTransferencia {
  cuenta_origen_id: number
  cuenta_destino_id: number
  monto_origen_centavos: number
  monto_destino_centavos?: number
  tasa_ref?: number | string | null
  fecha?: string
  nota?: string | null
}

type FilaTransferencia = typeof transferencias.$inferSelect

export function parseTransferencia(body: Record<string, unknown>): DatosTransferencia {
  const cuenta_origen_id = Number(body.cuenta_origen_id)
  if (!Number.isInteger(cuenta_origen_id) || cuenta_origen_id <= 0) {
    throw httpError(400, 'cuenta_origen_id es obligatorio')
  }
  const cuenta_destino_id = Number(body.cuenta_destino_id)
  if (!Number.isInteger(cuenta_destino_id) || cuenta_destino_id <= 0) {
    throw httpError(400, 'cuenta_destino_id es obligatorio')
  }

  const monto_origen_centavos = Number(body.monto_origen_centavos)
  if (!Number.isInteger(monto_origen_centavos) || monto_origen_centavos <= 0) {
    throw httpError(400, 'monto_origen_centavos debe ser un entero positivo')
  }

  let monto_destino_centavos: number | undefined
  if (body.monto_destino_centavos != null) {
    monto_destino_centavos = Number(body.monto_destino_centavos)
    if (!Number.isInteger(monto_destino_centavos) || monto_destino_centavos <= 0) {
      throw httpError(400, 'monto_destino_centavos debe ser un entero positivo')
    }
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

  const fecha = body.fecha == null ? undefined : String(body.fecha)
  if (fecha != null && !FECHA_RE.test(fecha)) {
    throw httpError(400, 'fecha debe usar formato YYYY-MM-DD')
  }

  let nota: string | null = null
  if (body.nota != null && String(body.nota).trim()) {
    nota = String(body.nota).trim()
  }

  return { cuenta_origen_id, cuenta_destino_id, monto_origen_centavos, monto_destino_centavos, tasa_ref, fecha, nota }
}

// Resuelve el monto destino: misma moneda → igual al origen; distinta moneda → requiere
// monto_destino o tasa para calcularlo. Valida que ambas cuentas sean del usuario y el mismo fondo.
export async function resolverMontos(userId: number, fondoId: number, data: DatosTransferencia) {
  const [resOrigen, resDestino] = await Promise.all([
    db.select({ id: cuentas.id, moneda: cuentas.moneda, fondo_id: cuentas.fondo_id }).from(cuentas).where(and(eq(cuentas.id, data.cuenta_origen_id), eq(cuentas.user_id, userId))).limit(1),
    db.select({ id: cuentas.id, moneda: cuentas.moneda, fondo_id: cuentas.fondo_id }).from(cuentas).where(and(eq(cuentas.id, data.cuenta_destino_id), eq(cuentas.user_id, userId))).limit(1),
  ])
  const origen = resOrigen[0]
  const destino = resDestino[0]

  if (!origen) {
    throw httpError(400, 'Cuenta origen no encontrada')
  }
  if (!destino) {
    throw httpError(400, 'Cuenta destino no encontrada')
  }
  if (origen.fondo_id !== fondoId || destino.fondo_id !== fondoId) {
    throw httpError(400, 'Las cuentas de la transferencia deben pertenecer al mismo fondo')
  }
  if (origen.id === destino.id) {
    throw httpError(400, 'No se puede transferir a la misma cuenta')
  }

  const monOrigen = origen.moneda as Moneda
  const monDestino = destino.moneda as Moneda
  const tasa = data.tasa_ref == null ? null : Number(data.tasa_ref)
  if (tasa != null && (!Number.isFinite(tasa) || tasa <= 0)) {
    throw httpError(400, 'tasa_ref debe ser un número positivo')
  }
  let montoDestino: number
  if (monOrigen === monDestino) {
    montoDestino = data.monto_origen_centavos
  } else if (data.monto_destino_centavos != null) {
    montoDestino = data.monto_destino_centavos
  } else if (tasa != null) {
    montoDestino = Math.round(data.monto_origen_centavos * tasa)
  } else {
    throw httpError(400, 'Para monedas distintas indica monto_destino_centavos o tasa_ref')
  }

  return {
    monto_destino_centavos: montoDestino,
    moneda_origen: monOrigen,
    moneda_destino: monDestino,
    tasa_ref: monOrigen !== monDestino ? (tasa ?? montoDestino / data.monto_origen_centavos) : null,
  }
}

export function transferenciaPublica(t: FilaTransferencia, ctx?: { monOrigen: string; monDestino: string }) {
  return {
    id: t.id,
    fondo_id: t.fondo_id,
    cuenta_origen_id: t.cuenta_origen_id,
    cuenta_destino_id: t.cuenta_destino_id,
    monto_origen_centavos: t.monto_origen_centavos,
    monto_destino_centavos: t.monto_destino_centavos,
    tasa_ref: t.tasa_ref ?? null,
    fecha: t.fecha,
    nota: t.nota ?? null,
    moneda_origen: ctx?.monOrigen ?? null,
    moneda_destino: ctx?.monDestino ?? null,
    monto_origen_formateado: ctx?.monOrigen ? formatMoney({ centavos: t.monto_origen_centavos, moneda: ctx.monOrigen as Moneda }) : null,
    monto_destino_formateado: ctx?.monDestino ? formatMoney({ centavos: t.monto_destino_centavos, moneda: ctx.monDestino as Moneda }) : null,
  }
}

export async function crearTransferencia(userId: number, fondoId: number, data: DatosTransferencia) {
  const resuelto = await resolverMontos(userId, fondoId, data)
  const [trx] = await db
    .insert(transferencias)
    .values({
      user_id: userId,
      fondo_id: fondoId,
      cuenta_origen_id: data.cuenta_origen_id,
      cuenta_destino_id: data.cuenta_destino_id,
      monto_origen_centavos: data.monto_origen_centavos,
      monto_destino_centavos: resuelto.monto_destino_centavos,
      tasa_ref: resuelto.tasa_ref,
      fecha: data.fecha ?? new Date().toISOString().slice(0, 10),
      nota: data.nota,
    })
    .returning()
  if (!trx) {
    throw httpError(500, 'No se pudo registrar la transferencia')
  }
  return transferenciaPublica(trx, { monOrigen: resuelto.moneda_origen, monDestino: resuelto.moneda_destino })
}

const destinoCuenta = aliasedTable(cuentas, 'destino')

export async function listarTransferencias(userId: number, fondoId: number) {
  const filas = await db
    .select({
      trx: transferencias,
      co: cuentas.moneda,
      cd: destinoCuenta.moneda,
    })
    .from(transferencias)
    .innerJoin(cuentas, eq(cuentas.id, transferencias.cuenta_origen_id))
    .innerJoin(destinoCuenta, eq(destinoCuenta.id, transferencias.cuenta_destino_id))
    .where(and(eq(transferencias.user_id, userId), eq(transferencias.fondo_id, fondoId)))
    .orderBy(desc(transferencias.fecha), desc(transferencias.id))
  return filas.map((f) => transferenciaPublica(f.trx, { monOrigen: f.co, monDestino: f.cd }))
}

export async function getTransferencia(userId: number, id: number) {
  const [fila] = await db
    .select({
      trx: transferencias,
      co: cuentas.moneda,
      cd: destinoCuenta.moneda,
    })
    .from(transferencias)
    .innerJoin(cuentas, eq(cuentas.id, transferencias.cuenta_origen_id))
    .innerJoin(destinoCuenta, eq(destinoCuenta.id, transferencias.cuenta_destino_id))
    .where(and(eq(transferencias.id, id), eq(transferencias.user_id, userId)))
    .limit(1)
  if (!fila) return null
  return transferenciaPublica(fila.trx, { monOrigen: fila.co, monDestino: fila.cd })
}

export async function editarTransferencia(userId: number, id: number, data: DatosTransferencia) {
  const [trx] = await db
    .select()
    .from(transferencias)
    .where(and(eq(transferencias.id, id), eq(transferencias.user_id, userId)))
    .limit(1)
  if (!trx) {
    throw httpError(404, 'Transferencia no encontrada')
  }
  if (data.cuenta_origen_id !== trx.cuenta_origen_id || data.cuenta_destino_id !== trx.cuenta_destino_id) {
    throw httpError(400, 'No se pueden cambiar las cuentas de una transferencia')
  }
  const resuelto = await resolverMontos(userId, trx.fondo_id, data)
  const [update] = await db
    .update(transferencias)
    .set({
      monto_origen_centavos: data.monto_origen_centavos,
      monto_destino_centavos: resuelto.monto_destino_centavos,
      tasa_ref: resuelto.tasa_ref,
      fecha: data.fecha ?? trx.fecha,
      nota: data.nota ?? trx.nota,
    })
    .where(and(eq(transferencias.id, id), eq(transferencias.user_id, userId)))
    .returning()
  if (!update) return null
  return transferenciaPublica(update, { monOrigen: resuelto.moneda_origen, monDestino: resuelto.moneda_destino })
}

export async function borrarTransferencia(userId: number, id: number) {
  const [trx] = await db
    .select()
    .from(transferencias)
    .where(and(eq(transferencias.id, id), eq(transferencias.user_id, userId)))
    .limit(1)
  if (!trx) {
    throw httpError(404, 'Transferencia no encontrada')
  }
  await db.delete(transferencias).where(and(eq(transferencias.id, id), eq(transferencias.user_id, userId)))
  return trx
}