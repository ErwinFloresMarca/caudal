import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from './db'
import { transacciones, cuentas } from '../db/schema'
import { categoriaSistema, type TipoCategoria } from './categorias'
import { hoyLocal } from './transacciones'
import { formatMoney, type Moneda } from '../../shared/money'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

// Categorías de sistema (es_predefinida): una pata ingreso y una pata gasto.
const CATEGORIA_DESTINO = { nombre: 'Aporte recibido', tipo: 'ingreso' as TipoCategoria, icono: 'savings', color: '#0FA47F' }
const CATEGORIA_ORIGEN = { nombre: 'Retiro/Aporte entregado', tipo: 'gasto' as TipoCategoria, icono: 'payments', color: '#5B6B85' }

export interface DatosAporte {
  cuenta_destino_id: number
  monto_destino_centavos: number
  cuenta_origen_id?: number | null
  monto_origen_centavos?: number
  tasa_ref?: number | string | null
  fecha?: string
  nota?: string | null
}

type FilaTransaccion = typeof transacciones.$inferSelect

export function parseAporte(body: Record<string, unknown>): DatosAporte {
  const cuenta_destino_id = Number(body.cuenta_destino_id)
  if (!Number.isInteger(cuenta_destino_id) || cuenta_destino_id <= 0) {
    throw httpError(400, 'cuenta_destino_id es obligatorio')
  }

  const monto_destino_centavos = Number(body.monto_destino_centavos)
  if (!Number.isInteger(monto_destino_centavos) || monto_destino_centavos <= 0) {
    throw httpError(400, 'monto_destino_centavos debe ser un entero positivo')
  }

  let cuenta_origen_id: number | undefined
  if (body.cuenta_origen_id != null && body.cuenta_origen_id !== '') {
    cuenta_origen_id = Number(body.cuenta_origen_id)
    if (!Number.isInteger(cuenta_origen_id) || cuenta_origen_id <= 0) {
      throw httpError(400, 'cuenta_origen_id inválido')
    }
  }

  let monto_origen_centavos: number | undefined
  if (body.monto_origen_centavos != null && body.monto_origen_centavos !== '') {
    monto_origen_centavos = Number(body.monto_origen_centavos)
    if (!Number.isInteger(monto_origen_centavos) || monto_origen_centavos <= 0) {
      throw httpError(400, 'monto_origen_centavos debe ser un entero positivo')
    }
  }

  let tasa_ref: number | null
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

  return { cuenta_destino_id, monto_destino_centavos, cuenta_origen_id, monto_origen_centavos, tasa_ref, fecha, nota }
}

// Resuelve cuentas/fondos/monedas y el monto de la pata origen. Regla multimoneda (0002):
// cada pata tiene la moneda de su cuenta y toda pata USD exige tasa_ref.
export async function resolverAporte(userId: number, data: DatosAporte) {
  const [destino] = await db
    .select({ id: cuentas.id, fondo_id: cuentas.fondo_id, moneda: cuentas.moneda })
    .from(cuentas)
    .where(and(eq(cuentas.id, data.cuenta_destino_id), eq(cuentas.user_id, userId)))
    .limit(1)
  if (!destino) {
    throw httpError(400, 'Cuenta destino no encontrada')
  }

  let origen: typeof destino | null = null
  if (data.cuenta_origen_id != null) {
    const [o] = await db
      .select({ id: cuentas.id, fondo_id: cuentas.fondo_id, moneda: cuentas.moneda })
      .from(cuentas)
      .where(and(eq(cuentas.id, data.cuenta_origen_id), eq(cuentas.user_id, userId)))
      .limit(1)
    if (!o) {
      throw httpError(400, 'Cuenta origen no encontrada')
    }
    if (o.id === destino.id) {
      throw httpError(400, 'La cuenta de origen y destino no pueden ser la misma')
    }
    if (o.fondo_id === destino.fondo_id) {
      throw httpError(400, 'Origen y destino deben ser fondos distintos; usa una transferencia')
    }
    origen = o
  }

  const monDestino = destino.moneda as Moneda
  const monOrigen = (origen?.moneda ?? null) as Moneda | null
  let tasa = data.tasa_ref == null ? null : Number(data.tasa_ref)
  if (tasa != null && (!Number.isFinite(tasa) || tasa <= 0)) {
    throw httpError(400, 'tasa_ref debe ser un número positivo')
  }

  let montoOrigen: number | null = null
  if (origen) {
    if (monOrigen === monDestino) {
      montoOrigen = data.monto_destino_centavos
    } else if (data.monto_origen_centavos != null) {
      montoOrigen = data.monto_origen_centavos
    } else if (tasa != null) {
      montoOrigen = monDestino === 'USD'
        ? Math.round(data.monto_destino_centavos * tasa)
        : Math.round(data.monto_destino_centavos / tasa)
    } else {
      throw httpError(400, 'Para monedas distintas indica monto_origen_centavos o tasa_ref')
    }
  }

  // Pata USD sin tasa explícita: se deriva del monto de la otra pata si se dio.
  if (tasa == null && origen && monOrigen !== monDestino && data.monto_origen_centavos != null) {
    tasa = monDestino === 'USD'
      ? data.monto_origen_centavos / data.monto_destino_centavos
      : data.monto_destino_centavos / data.monto_origen_centavos
  }
  const hayUsd = monDestino === 'USD' || monOrigen === 'USD'
  if (hayUsd && tasa == null) {
    throw httpError(400, 'tasa_ref es obligatoria para cuentas USD')
  }

  return { destino, origen, monDestino, monOrigen, montoOrigen, tasa }
}

function pataPublica(t: FilaTransaccion) {
  return {
    transaccion_id: t.id,
    fondo_id: t.fondo_id,
    cuenta_id: t.cuenta_id,
    monto_centavos: t.monto_centavos,
    moneda: t.moneda,
    tasa_ref: t.tasa_ref ?? null,
    monto_formateado: formatMoney({ centavos: t.monto_centavos, moneda: t.moneda as Moneda }),
  }
}

// Un aporte = las dos patas (ingreso destino + gasto origen opcional) del mismo grupo_id.
export function agruparAporte(grupoId: number, legs: FilaTransaccion[]) {
  const destino = legs.find((l) => l.tipo === 'ingreso') ?? null
  const origen = legs.find((l) => l.tipo === 'gasto') ?? null
  const base = destino ?? origen
  return {
    grupo_id: grupoId,
    fecha: base?.fecha ?? null,
    nota: base?.nota ?? null,
    destino: destino ? pataPublica(destino) : null,
    origen: origen ? pataPublica(origen) : null,
  }
}

export async function crearAporte(userId: number, data: DatosAporte) {
  const r = await resolverAporte(userId, data)
  const fecha = data.fecha ?? hoyLocal()

  const catDestino = await categoriaSistema(userId, r.destino.fondo_id, CATEGORIA_DESTINO)
  const catOrigen = r.origen ? await categoriaSistema(userId, r.origen.fondo_id, CATEGORIA_ORIGEN) : null

  const legs = await db.transaction(async (tx) => {
    const [dest] = await tx
      .insert(transacciones)
      .values({
        user_id: userId,
        fondo_id: r.destino.fondo_id,
        cuenta_id: r.destino.id,
        categoria_id: catDestino,
        tipo: 'ingreso',
        monto_centavos: data.monto_destino_centavos,
        moneda: r.monDestino,
        tasa_ref: r.monDestino === 'USD' ? r.tasa : null,
        fecha,
        nota: data.nota,
      })
      .returning()
    if (!dest) {
      throw httpError(500, 'No se pudo registrar el aporte')
    }
    // grupo_id = id de la pata destino (clave única del grupo).
    await tx.update(transacciones).set({ grupo_id: dest.id }).where(eq(transacciones.id, dest.id))

    const created: FilaTransaccion[] = [{ ...dest, grupo_id: dest.id }]
    if (r.origen && r.montoOrigen != null) {
      const [orig] = await tx
        .insert(transacciones)
        .values({
          user_id: userId,
          fondo_id: r.origen.fondo_id,
          cuenta_id: r.origen.id,
          categoria_id: catOrigen,
          tipo: 'gasto',
          monto_centavos: r.montoOrigen,
          moneda: r.monOrigen as Moneda,
          tasa_ref: r.monOrigen === 'USD' ? r.tasa : null,
          fecha,
          nota: data.nota,
          grupo_id: dest.id,
        })
        .returning()
      if (orig) created.push(orig)
    }
    return created
  })

  return agruparAporte(legs[0]!.grupo_id!, legs)
}

// Todas las patas de un aporte. Acepta el id de una pata o el grupo_id.
async function obtenerLegs(userId: number, id: number): Promise<{ grupoId: number; legs: FilaTransaccion[] } | null> {
  const [leg] = await db
    .select()
    .from(transacciones)
    .where(and(eq(transacciones.id, id), eq(transacciones.user_id, userId)))
    .limit(1)

  // Una transacción normal (sin grupo) no es un aporte.
  if (leg && leg.grupo_id == null) return null

  const grupoId = leg?.grupo_id ?? id
  const legs = await db
    .select()
    .from(transacciones)
    .where(and(eq(transacciones.user_id, userId), eq(transacciones.grupo_id, grupoId)))
  if (legs.length === 0) return null
  return { grupoId, legs }
}

export async function getAporte(userId: number, id: number) {
  const res = await obtenerLegs(userId, id)
  return res ? agruparAporte(res.grupoId, res.legs) : null
}

// Aportes que tocan el fondo dado (cualquiera de sus patas).
export async function listarAportes(userId: number, fondoId: number) {
  const legs = await db
    .select()
    .from(transacciones)
    .where(and(eq(transacciones.user_id, userId), isNotNull(transacciones.grupo_id)))
    .orderBy(desc(transacciones.fecha), desc(transacciones.id))

  const grupos = new Map<number, FilaTransaccion[]>()
  for (const leg of legs) {
    const g = leg.grupo_id!
    const arr = grupos.get(g)
    if (arr) arr.push(leg)
    else grupos.set(g, [leg])
  }

  const out = []
  for (const [g, ls] of grupos) {
    if (!ls.some((l) => l.fondo_id === fondoId)) continue
    out.push(agruparAporte(g, ls))
  }
  return out
}

// Editar: las cuentas/fondos quedan fijos; cambian montos, tasa, fecha y nota de ambas patas.
export async function editarAporte(userId: number, id: number, data: DatosAporte) {
  const res = await obtenerLegs(userId, id)
  if (!res) {
    throw httpError(404, 'Aporte no encontrado')
  }
  const destino = res.legs.find((l) => l.tipo === 'ingreso')
  const origen = res.legs.find((l) => l.tipo === 'gasto')

  if (destino && data.cuenta_destino_id !== destino.cuenta_id) {
    throw httpError(400, 'No se pueden cambiar las cuentas de un aporte')
  }
  if (data.cuenta_origen_id != null && origen && data.cuenta_origen_id !== origen.cuenta_id) {
    throw httpError(400, 'No se pueden cambiar las cuentas de un aporte')
  }

  const r = await resolverAporte(userId, {
    ...data,
    cuenta_destino_id: destino?.cuenta_id ?? data.cuenta_destino_id,
    cuenta_origen_id: origen?.cuenta_id ?? null,
  })
  const fecha = data.fecha ?? destino?.fecha ?? hoyLocal()
  const nota = data.nota ?? destino?.nota ?? null

  await db.transaction(async (tx) => {
    if (destino) {
      await tx
        .update(transacciones)
        .set({
          monto_centavos: data.monto_destino_centavos,
          tasa_ref: r.monDestino === 'USD' ? r.tasa : null,
          fecha,
          nota,
        })
        .where(and(eq(transacciones.id, destino.id), eq(transacciones.user_id, userId)))
    }
    if (origen && r.montoOrigen != null) {
      await tx
        .update(transacciones)
        .set({
          monto_centavos: r.montoOrigen,
          tasa_ref: r.monOrigen === 'USD' ? r.tasa : null,
          fecha,
          nota,
        })
        .where(and(eq(transacciones.id, origen.id), eq(transacciones.user_id, userId)))
    }
  })

  return getAporte(userId, res.grupoId)
}

export async function borrarAporte(userId: number, id: number) {
  const res = await obtenerLegs(userId, id)
  if (!res) {
    throw httpError(404, 'Aporte no encontrado')
  }
  await db.delete(transacciones).where(and(eq(transacciones.user_id, userId), eq(transacciones.grupo_id, res.grupoId)))
  return agruparAporte(res.grupoId, res.legs)
}
