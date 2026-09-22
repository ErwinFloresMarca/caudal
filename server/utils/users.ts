import { and, eq } from 'drizzle-orm'
import { db } from './db'
import { users, oauthAccounts } from '../db/schema'

export interface PerfilOAuth {
  provider: string
  providerId: string
  email: string
  name?: string | null
  avatarUrl?: string | null
}

type FilaUsuario = typeof users.$inferSelect

// Vincula (o crea) el usuario de un proveedor OAuth. Tres casos, en una transacción:
// 1) ya existe la cuenta OAuth → actualiza avatar y usa ese usuario;
// 2) no hay cuenta pero el email ya existe → vincula la cuenta a ese usuario (sin duplicar);
// 3) ni cuenta ni email → crea usuario (sin contraseña) + cuenta OAuth.
// NUNCA se persisten tokens del proveedor: solo provider_id, email, name y avatar_url.
export async function findOrCreateOAuthUser(perfil: PerfilOAuth): Promise<FilaUsuario> {
  const email = perfil.email.trim().toLowerCase()
  const name = perfil.name?.trim() || email
  const avatarUrl = perfil.avatarUrl ?? null

  return db.transaction(async (tx) => {
    const [cuenta] = await tx
      .select()
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.provider, perfil.provider), eq(oauthAccounts.provider_id, perfil.providerId)))
      .limit(1)

    if (cuenta) {
      const [actualizado] = avatarUrl
        ? await tx.update(users).set({ avatar_url: avatarUrl }).where(eq(users.id, cuenta.user_id)).returning()
        : await tx.select().from(users).where(eq(users.id, cuenta.user_id)).limit(1)
      if (!actualizado) throw new Error('Usuario de la cuenta OAuth no encontrado')
      return actualizado
    }

    const [porEmail] = await tx.select().from(users).where(eq(users.email, email)).limit(1)

    if (porEmail) {
      await tx.insert(oauthAccounts).values({
        user_id: porEmail.id,
        provider: perfil.provider,
        provider_id: perfil.providerId,
        email,
        name,
        avatar_url: avatarUrl,
      })
      const [actualizado] = await tx
        .update(users)
        .set({ avatar_url: avatarUrl ?? porEmail.avatar_url ?? null })
        .where(eq(users.id, porEmail.id))
        .returning()
      if (!actualizado) throw new Error('Usuario no encontrado')
      return actualizado
    }

    const [nuevo] = await tx.insert(users).values({ email, name, avatar_url: avatarUrl }).returning()
    if (!nuevo) throw new Error('No se pudo crear el usuario OAuth')
    await tx.insert(oauthAccounts).values({
      user_id: nuevo.id,
      provider: perfil.provider,
      provider_id: perfil.providerId,
      email,
      name,
      avatar_url: avatarUrl,
    })
    return nuevo
  })
}
