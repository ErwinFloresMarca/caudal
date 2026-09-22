import { and, eq, inArray, ne } from 'drizzle-orm'
import { db } from './db'
import {
  users,
  transacciones,
  transferencias,
  recurrentes,
  deudas,
  cuotas,
  metasAhorro,
  aportesMeta,
  categorias,
  cuentas,
  fondos,
  apiKeys,
  oauthAccounts,
  settings,
} from '../db/schema'
import { getSetting, setSetting } from './settings'
import { hashPasswordScrypt, verifyPasswordScrypt } from '../../shared/password'
import type { Moneda } from '../../shared/money'

function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/
const CLAVE_MONEDA = 'moneda_base'
const CLAVE_TASA = 'tasa'
const MAX_HISTORIAL = 20

type FilaUsuario = typeof users.$inferSelect

export function perfilPublico(u: FilaUsuario) {
  return { id: u.id, nombre: u.name, email: u.email, timezone: u.timezone, tiene_password: u.password_hash != null }
}

export async function getPerfil(userId: number) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!u) throw httpError(404, 'Usuario no encontrado')
  return perfilPublico(u)
}

export async function actualizarPerfil(userId: number, data: { nombre?: string; email?: string; timezone?: string }) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!u) throw httpError(404, 'Usuario no encontrado')

  let nombre = u.name
  if (data.nombre != null) {
    nombre = data.nombre.trim()
    if (!nombre) throw httpError(400, 'El nombre es obligatorio')
  }

  let email = u.email
  if (data.email != null) {
    email = data.email.trim().toLowerCase()
    if (!EMAIL_RE.test(email)) throw httpError(400, 'Email no válido')
    const [otro] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), ne(users.id, userId)))
      .limit(1)
    if (otro) throw httpError(409, 'Ese email ya está registrado')
  }

  const timezone = data.timezone?.trim() || u.timezone
  const [update] = await db.update(users).set({ name: nombre, email, timezone }).where(eq(users.id, userId)).returning()
  return perfilPublico(update!)
}

// Cambiar contraseña exige la actual. La sesión (cookie) sigue válida porque no se rota.
export async function cambiarPassword(userId: number, data: { actual?: string; nueva?: string }) {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!u) throw httpError(404, 'Usuario no encontrado')
  if (!u.password_hash) throw httpError(400, 'Tu cuenta no tiene contraseña (inicia con Google)')
  if (!data.actual || !(await verifyPasswordScrypt(u.password_hash, data.actual))) {
    throw httpError(400, 'La contraseña actual no es correcta')
  }
  if (!data.nueva || data.nueva.length < 8) {
    throw httpError(400, 'La nueva contraseña debe tener al menos 8 caracteres')
  }
  await db.update(users).set({ password_hash: await hashPasswordScrypt(data.nueva) }).where(eq(users.id, userId))
  return { cambio: true }
}

export async function getMonedaBase(userId: number): Promise<Moneda> {
  const v = await getSetting<string>(userId, CLAVE_MONEDA)
  return v === 'USD' ? 'USD' : 'BOB'
}

export async function setMonedaBase(userId: number, moneda: unknown) {
  if (moneda !== 'BOB' && moneda !== 'USD') throw httpError(400, 'moneda base debe ser BOB o USD')
  await setSetting(userId, CLAVE_MONEDA, moneda)
}

export interface TasaAjuste {
  valor: number
  fecha: string
}

export async function getTasa(userId: number): Promise<{ actual: TasaAjuste | null; historial: TasaAjuste[] }> {
  const v = await getSetting<{ actual: TasaAjuste | null; historial: TasaAjuste[] }>(userId, CLAVE_TASA)
  return { actual: v?.actual ?? null, historial: v?.historial ?? [] }
}

async function guardarTasa(userId: number, entrada: TasaAjuste) {
  const { historial } = await getTasa(userId)
  const historialNuevo = [entrada, ...historial].slice(0, MAX_HISTORIAL)
  await setSetting(userId, CLAVE_TASA, { actual: entrada, historial: historialNuevo })
  return { actual: entrada, historial: historialNuevo }
}

// Guarda la tasa paralelo actual (y su historial) desde Ajustes.
export async function setTasa(userId: number, data: { valor?: number | string; fecha?: string }) {
  const valor = Number(String(data.valor ?? '').replace(',', '.'))
  if (!Number.isFinite(valor) || valor <= 0) throw httpError(400, 'La tasa debe ser un número positivo')
  const fecha = data.fecha ?? new Date().toISOString().slice(0, 10)
  if (!FECHA_RE.test(fecha)) throw httpError(400, 'La fecha debe usar formato YYYY-MM-DD')
  return guardarTasa(userId, { valor, fecha })
}

// Auto-sugerencia: al registrar un movimiento USD se recuerda la última tasa usada (0002).
// No bloquea el registro si falla la escritura del ajuste.
export async function registrarTasaUsada(userId: number, valor: number, fecha: string) {
  if (!Number.isFinite(valor) || valor <= 0) return
  try {
    await guardarTasa(userId, { valor, fecha })
  } catch {
    // ponytail: la tasa es una sugerencia; no debe tumbar el registro del movimiento.
  }
}

// Borra la cuenta y todos sus datos (confirmación explícita obligatoria).
export async function borrarCuenta(userId: number, confirmacion: string) {
  if (confirmacion !== 'BORRAR') {
    throw httpError(400, 'Confirmación inválida: escribe BORRAR')
  }
  await db.transaction(async (tx) => {
    const deudaIds = (await tx.select({ id: deudas.id }).from(deudas).where(eq(deudas.user_id, userId))).map((d) => d.id)
    if (deudaIds.length) await tx.delete(cuotas).where(inArray(cuotas.deuda_id, deudaIds))

    const metaIds = (await tx.select({ id: metasAhorro.id }).from(metasAhorro).where(eq(metasAhorro.user_id, userId))).map((m) => m.id)
    if (metaIds.length) await tx.delete(aportesMeta).where(inArray(aportesMeta.meta_id, metaIds))

    await tx.delete(transacciones).where(eq(transacciones.user_id, userId))
    await tx.delete(transferencias).where(eq(transferencias.user_id, userId))
    await tx.delete(recurrentes).where(eq(recurrentes.user_id, userId))
    await tx.delete(deudas).where(eq(deudas.user_id, userId))
    await tx.delete(metasAhorro).where(eq(metasAhorro.user_id, userId))
    await tx.delete(categorias).where(eq(categorias.user_id, userId))
    await tx.delete(cuentas).where(eq(cuentas.user_id, userId))
    await tx.delete(fondos).where(eq(fondos.user_id, userId))
    await tx.delete(apiKeys).where(eq(apiKeys.user_id, userId))
    await tx.delete(oauthAccounts).where(eq(oauthAccounts.user_id, userId))
    await tx.delete(settings).where(eq(settings.user_id, userId))
    await tx.delete(users).where(eq(users.id, userId))
  })
  return { eliminada: true }
}
