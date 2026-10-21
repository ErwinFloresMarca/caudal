import { eq, inArray } from 'drizzle-orm'
import { db } from './db'
import {
  users,
  oauthAccounts,
  apiKeys,
  fondos,
  cuentas,
  categorias,
  transacciones,
  transferencias,
  recurrentes,
  deudas,
  cuotas,
  metasAhorro,
  aportesMeta,
  presupuestos,
  settings,
} from '../db/schema'

export const VERSION_EXPORTACION = 1

// Respaldo completo del usuario (SPC-046). Datos crudos y con ids para poder
// reconstruir relaciones. Sin secretos: no salen password_hash ni key_hash.
export async function exportarDatos(userId: number) {
  const [usuario] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatar_url: users.avatar_url,
      timezone: users.timezone,
      created_at: users.created_at,
    })
    .from(users)
    .where(eq(users.id, userId))
  if (!usuario) {
    throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 })
  }

  const [
    listaFondos,
    listaCuentas,
    listaCategorias,
    listaTransacciones,
    listaTransferencias,
    listaRecurrentes,
    listaDeudas,
    listaMetas,
    listaPresupuestos,
    listaAjustes,
    listaKeys,
    listaOauth,
  ] = await Promise.all([
    db.select().from(fondos).where(eq(fondos.user_id, userId)),
    db.select().from(cuentas).where(eq(cuentas.user_id, userId)),
    db.select().from(categorias).where(eq(categorias.user_id, userId)),
    db.select().from(transacciones).where(eq(transacciones.user_id, userId)),
    db.select().from(transferencias).where(eq(transferencias.user_id, userId)),
    db.select().from(recurrentes).where(eq(recurrentes.user_id, userId)),
    db.select().from(deudas).where(eq(deudas.user_id, userId)),
    db.select().from(metasAhorro).where(eq(metasAhorro.user_id, userId)),
    db.select().from(presupuestos).where(eq(presupuestos.user_id, userId)),
    db.select().from(settings).where(eq(settings.user_id, userId)),
    db
      .select({ id: apiKeys.id, nombre: apiKeys.nombre, created_at: apiKeys.created_at, last_used_at: apiKeys.last_used_at })
      .from(apiKeys)
      .where(eq(apiKeys.user_id, userId)),
    db
      .select({ provider: oauthAccounts.provider, email: oauthAccounts.email, name: oauthAccounts.name, avatar_url: oauthAccounts.avatar_url, created_at: oauthAccounts.created_at })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.user_id, userId)),
  ])

  // Cuotas y aportes no tienen user_id: se acotan por sus padres.
  const deudaIds = listaDeudas.map((d) => d.id)
  const metaIds = listaMetas.map((m) => m.id)
  const listaCuotas = deudaIds.length ? await db.select().from(cuotas).where(inArray(cuotas.deuda_id, deudaIds)) : []
  const listaAportes = metaIds.length ? await db.select().from(aportesMeta).where(inArray(aportesMeta.meta_id, metaIds)) : []

  return {
    version: VERSION_EXPORTACION,
    exportado_at: new Date().toISOString(),
    usuario,
    datos: {
      fondos: listaFondos,
      cuentas: listaCuentas,
      categorias: listaCategorias,
      transacciones: listaTransacciones,
      transferencias: listaTransferencias,
      recurrentes: listaRecurrentes,
      deudas: listaDeudas,
      cuotas: listaCuotas,
      metas: listaMetas,
      aportes_meta: listaAportes,
      presupuestos: listaPresupuestos,
      ajustes: listaAjustes,
      api_keys: listaKeys,
      oauth: listaOauth,
    },
  }
}
