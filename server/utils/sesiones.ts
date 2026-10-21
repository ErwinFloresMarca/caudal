import { eq, sql } from 'drizzle-orm'
import { db } from './db'
import { users } from '../db/schema'

// Versión de sesión por usuario (SPC-047). La cookie firmada no se puede revocar
// sola; cada sesión lleva la versión con la que se creó y se invalida cuando deja
// de coincidir. Incrementarla es "cerrar todas las sesiones".
export async function versionSesion(userId: number): Promise<number> {
  const [fila] = await db.select({ v: users.session_version }).from(users).where(eq(users.id, userId)).limit(1)
  return fila?.v ?? 0
}

// Una sesión sin versión (cookie anterior a la feature) cuenta como 0.
export async function sesionVigente(userId: number, version: number | undefined): Promise<boolean> {
  return (version ?? 0) === (await versionSesion(userId))
}

export async function cerrarTodasLasSesiones(userId: number): Promise<number> {
  const [fila] = await db
    .update(users)
    .set({ session_version: sql`${users.session_version} + 1` })
    .where(eq(users.id, userId))
    .returning({ v: users.session_version })
  return fila?.v ?? 1
}
