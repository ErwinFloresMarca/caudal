import { and, eq, sql } from 'drizzle-orm'
import { db } from './db'
import { cuentas, transacciones } from '../db/schema'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

export const TIPOS_CUENTA = ['efectivo', 'banco', 'tarjeta', 'ahorro'] as const
export type TipoCuenta = (typeof TIPOS_CUENTA)[number]

export const MONEDAS_CUENTA = ['BOB', 'USD'] as const
export type MonedaCuenta = (typeof MONEDAS_CUENTA)[number]

export interface DatosCuenta {
  nombre?: string
  tipo?: TipoCuenta
  moneda?: MonedaCuenta
  saldo_inicial_centavos?: number
  activa?: boolean
}

type FilaCuenta = typeof cuentas.$inferSelect

function cuentaPublica(c: { id: number; nombre: string; tipo: string; moneda: string; activa: boolean }) {
  return {
    id: c.id,
    nombre: c.nombre,
    tipo: c.tipo,
    moneda: c.moneda,
    activa: c.activa,
  }
}

export function parseCuenta(body: Record<string, unknown>): DatosCuenta {
  let nombre: string | undefined
  if (body.nombre != null) {
    nombre = String(body.nombre).trim()
    if (!nombre) {
      throw httpError(400, 'El nombre es obligatorio')
    }
  }

  let tipo: TipoCuenta | undefined
  if (body.tipo != null) {
    tipo = String(body.tipo).trim() as TipoCuenta
    if (!TIPOS_CUENTA.includes(tipo)) {
      throw httpError(400, `tipo debe ser ${TIPOS_CUENTA.join(', ')}`)
    }
  }

  let moneda: MonedaCuenta | undefined
  if (body.moneda != null) {
    moneda = String(body.moneda).trim() as MonedaCuenta
    if (!MONEDAS_CUENTA.includes(moneda)) {
      throw httpError(400, 'moneda debe ser BOB o USD')
    }
  }

  let saldo: number | undefined
  if (body.saldo_inicial_centavos != null) {
    saldo = Number(body.saldo_inicial_centavos)
    if (!Number.isInteger(saldo) || saldo < 0) {
      throw httpError(400, 'saldo_inicial_centavos debe ser un entero >= 0')
    }
  }

  return {
    nombre,
    tipo,
    moneda,
    saldo_inicial_centavos: saldo,
    activa: body.activa == null ? undefined : Boolean(body.activa),
  }
}

// Datos completos para creación (mínimos: nombre y tipo).
export function parseCuentaCompleta(body: Record<string, unknown>): DatosCuenta {
  const data = parseCuenta(body)
  if (!data.nombre) {
    throw httpError(400, 'El nombre es obligatorio')
  }
  if (!data.tipo) {
    throw httpError(400, `tipo debe ser ${TIPOS_CUENTA.join(', ')}`)
  }
  return data
}

// Movimiento conjunto: ingreso suma, gasto resta. El saldo vivo nunca se almacena.
const movimientoSql = sql<number>`COALESCE(SUM(
  CASE WHEN ${transacciones.tipo} = 'ingreso' THEN ${transacciones.monto_centavos}
       WHEN ${transacciones.tipo} = 'gasto' THEN -${transacciones.monto_centavos}
       ELSE 0 END), 0)`

type SaldoRow = { id: number; nombre: string; tipo: string; moneda: string; activa: boolean; saldo_inicial_centavos: number; movimientos: number }

const saldoQuery = db
  .select({
    id: cuentas.id,
    nombre: cuentas.nombre,
    tipo: cuentas.tipo,
    moneda: cuentas.moneda,
    activa: cuentas.activa,
    saldo_inicial_centavos: cuentas.saldo_inicial_centavos,
    movimientos: movimientoSql,
  })
  .from(cuentas)
  .leftJoin(transacciones, eq(transacciones.cuenta_id, cuentas.id))
  .groupBy(cuentas.id)

function toPublica(row: SaldoRow) {
  const mov = Number(row.movimientos)
  return {
    ...cuentaPublica(row),
    saldo_inicial_centavos: row.saldo_inicial_centavos,
    saldo_actual_centavos: row.saldo_inicial_centavos + mov,
  }
}

export async function listarCuentas(userId: number, fondoId: number, { incluirInactivas = false } = {}) {
  const rows = await saldoQuery
    .where(
      and(
        eq(cuentas.user_id, userId),
        eq(cuentas.fondo_id, fondoId),
        incluirInactivas ? undefined : eq(cuentas.activa, true),
      ),
    )
    .orderBy(cuentas.nombre)
  return rows.map(toPublica)
}

export async function getCuenta(userId: number, cuentaId: number) {
  const [row] = await saldoQuery
    .where(and(eq(cuentas.id, cuentaId), eq(cuentas.user_id, userId)))
    .limit(1)
  return row ? toPublica(row) : null
}

export async function crearCuenta(userId: number, fondoId: number, data: DatosCuenta): Promise<FilaCuenta> {
  if (!data.nombre || !data.tipo) {
    throw httpError(400, 'nombre y tipo son obligatorios')
  }
  const [cuenta] = await db
    .insert(cuentas)
    .values({
      user_id: userId,
      fondo_id: fondoId,
      nombre: data.nombre,
      tipo: data.tipo,
      moneda: data.moneda ?? 'BOB',
      saldo_inicial_centavos: data.saldo_inicial_centavos ?? 0,
      activa: data.activa ?? true,
    })
    .returning()
  if (!cuenta) {
    throw httpError(500, 'No se pudo crear la cuenta')
  }
  return cuenta
}

// Número de transacciones ligadas a la cuenta (regla de integridad de moneda/saldo inicial).
export async function contarMovimientos(cuentaId: number) {
  const [row] = await db
    .select({ n: sql<number>`COUNT(*)` })
    .from(transacciones)
    .where(eq(transacciones.cuenta_id, cuentaId))
  return Number(row?.n ?? 0)
}

export async function editarCuenta(userId: number, cuentaId: number, data: DatosCuenta) {
  const [cuenta] = await db
    .select()
    .from(cuentas)
    .where(and(eq(cuentas.id, cuentaId), eq(cuentas.user_id, userId)))
    .limit(1)
  if (!cuenta) {
    throw httpError(404, 'Cuenta no encontrada')
  }

  const movimientos = await contarMovimientos(cuentaId)
  if (data.moneda && data.moneda !== cuenta.moneda && movimientos > 0) {
    throw httpError(400, 'No se puede cambiar la moneda de una cuenta con movimientos')
  }
  if (data.saldo_inicial_centavos != null && data.saldo_inicial_centavos !== cuenta.saldo_inicial_centavos && movimientos > 0) {
    throw httpError(400, 'No se puede cambiar el saldo inicial de una cuenta con movimientos; ajusta con transacciones')
  }

  const [update] = await db
    .update(cuentas)
    .set({
      nombre: data.nombre ?? cuenta.nombre,
      tipo: data.tipo ?? cuenta.tipo,
      moneda: data.moneda ?? cuenta.moneda,
      saldo_inicial_centavos: data.saldo_inicial_centavos ?? cuenta.saldo_inicial_centavos,
      activa: data.activa ?? cuenta.activa,
    })
    .where(and(eq(cuentas.id, cuentaId), eq(cuentas.user_id, userId)))
    .returning()
  return update ? cuentaPublica(update) : null
}

// El ocultado conserva el histórico (reportes lo leen por fila, sin importar activa).
export async function ocultarCuenta(userId: number, cuentaId: number) {
  const [cuenta] = await db
    .select()
    .from(cuentas)
    .where(and(eq(cuentas.id, cuentaId), eq(cuentas.user_id, userId)))
    .limit(1)
  if (!cuenta) {
    throw httpError(404, 'Cuenta no encontrada')
  }
  const [update] = await db
    .update(cuentas)
    .set({ activa: false })
    .where(and(eq(cuentas.id, cuentaId), eq(cuentas.user_id, userId)))
    .returning()
  return update ? cuentaPublica(update) : null
}