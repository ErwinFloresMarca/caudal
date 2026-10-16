import { and, eq } from 'drizzle-orm'
import { db } from './db'
import { settings } from '../db/schema'

// Ajustes por usuario en la tabla `settings` (key/value jsonb).

export async function getSetting<T>(userId: number, key: string): Promise<T | null> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.user_id, userId), eq(settings.key, key)))
    .limit(1)
  return (row?.value as T | undefined) ?? null
}

export async function setSetting(userId: number, key: string, value: unknown): Promise<void> {
  await db
    .insert(settings)
    .values({ user_id: userId, key, value })
    .onConflictDoUpdate({ target: [settings.user_id, settings.key], set: { value } })
}

// `value` es jsonb NOT NULL: para "sin valor" hay que borrar la fila, no guardar null.
export async function borrarSetting(userId: number, key: string): Promise<void> {
  await db.delete(settings).where(and(eq(settings.user_id, userId), eq(settings.key, key)))
}
