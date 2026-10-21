import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, deudas, cuotas, metasAhorro, aportesMeta, presupuestos, settings, apiKeys } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { crearTransaccion } from '../server/utils/transacciones'
import { crearDeuda } from '../server/utils/deudas'
import { crearMeta } from '../server/utils/metas'
import { crearPresupuesto } from '../server/utils/presupuestos'
import { setSetting } from '../server/utils/settings'
import { exportarDatos, VERSION_EXPORTACION } from '../server/utils/exportar'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let otroId: number
let fondoId: number
let catComidaId: number
let cuentaId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `exp-${randomUUID()}@test.dev`, name: 'Export', password_hash: 'hash-secreto' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `exp-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  otroId = o.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo Export', tipo: 'personal', moneda_base: 'BOB' })
  fondoId = fondo.id
  cuentaId = (await crearCuenta(userId, fondoId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB' })).id
  catComidaId = (await listarCategorias(userId, fondoId)).find((c) => c.nombre === 'Comida')!.id

  await crearTransaccion(userId, fondoId, { cuenta_id: cuentaId, categoria_id: catComidaId, tipo: 'gasto', monto_centavos: 1234 })
  await crearDeuda(userId, fondoId, { contraparte: 'Deuda export', direccion: 'por_pagar', monto_total_centavos: 10000, moneda: 'BOB', num_cuotas: 2 })
  await crearMeta(userId, fondoId, { nombre: 'Meta export', monto_objetivo_centavos: 50000, moneda: 'BOB' })
  await crearPresupuesto(userId, fondoId, { categoria_id: catComidaId, mes: new Date().toISOString().slice(0, 7), monto_limite_centavos: 20000 })
  await setSetting(userId, 'moneda_base', 'BOB')
  await db.insert(apiKeys).values({ user_id: userId, nombre: 'key export', key_hash: 'sha256-secreto' })

  // datos de otro usuario, que no deben salir
  const otroFondo = await crearFondo(otroId, { nombre: 'Fondo Ajeno', tipo: 'personal', moneda_base: 'BOB' })
  await crearCuenta(otroId, otroFondo.id, { nombre: 'Caja ajena', tipo: 'efectivo', moneda: 'BOB' })
})

afterAll(async () => {
  if (!hasDb) return
  for (const uid of [userId, otroId]) {
    const deudaIds = (await db.select({ id: deudas.id }).from(deudas).where(eq(deudas.user_id, uid))).map((d) => d.id)
    for (const id of deudaIds) await db.delete(cuotas).where(eq(cuotas.deuda_id, id))
    const metaIds = (await db.select({ id: metasAhorro.id }).from(metasAhorro).where(eq(metasAhorro.user_id, uid))).map((m) => m.id)
    for (const id of metaIds) await db.delete(aportesMeta).where(eq(aportesMeta.meta_id, id))
    await db.delete(transacciones).where(eq(transacciones.user_id, uid))
    await db.delete(presupuestos).where(eq(presupuestos.user_id, uid))
    await db.delete(deudas).where(eq(deudas.user_id, uid))
    await db.delete(metasAhorro).where(eq(metasAhorro.user_id, uid))
    await db.delete(apiKeys).where(eq(apiKeys.user_id, uid))
    await db.delete(settings).where(eq(settings.user_id, uid))
    await db.delete(cuentas).where(eq(cuentas.user_id, uid))
    await db.delete(categorias).where(eq(categorias.user_id, uid))
    await db.delete(fondos).where(eq(fondos.user_id, uid))
    await db.delete(users).where(eq(users.id, uid))
  }
})

describe('exportarDatos', () => {
  it('incluye todas las tablas del usuario con la versión del formato', async () => {
    if (!hasDb) return
    const r = await exportarDatos(userId)
    expect(r.version).toBe(VERSION_EXPORTACION)
    expect(r.usuario.email).toContain('@test.dev')
    expect(r.datos.fondos.length).toBeGreaterThan(0)
    expect(r.datos.cuentas.length).toBeGreaterThan(0)
    expect(r.datos.categorias.length).toBeGreaterThan(0)
    expect(r.datos.transacciones.length).toBe(1)
    expect(r.datos.deudas.length).toBe(1)
    expect(r.datos.cuotas.length).toBe(2)
    expect(r.datos.metas.length).toBe(1)
    expect(r.datos.presupuestos.length).toBe(1)
    expect(r.datos.ajustes.length).toBeGreaterThan(0)
    expect(r.datos.api_keys.length).toBe(1)
  })

  it('no exporta secretos', async () => {
    if (!hasDb) return
    const texto = JSON.stringify(await exportarDatos(userId))
    expect(texto).not.toContain('hash-secreto')
    expect(texto).not.toContain('sha256-secreto')
    expect(texto).not.toContain('password_hash')
    expect(texto).not.toContain('key_hash')
  })

  it('aislamiento: no incluye datos de otro usuario', async () => {
    if (!hasDb) return
    const r = await exportarDatos(userId)
    expect(r.datos.fondos.some((f) => f.nombre === 'Fondo Ajeno')).toBe(false)
    expect(r.datos.cuentas.some((c) => c.nombre === 'Caja ajena')).toBe(false)
    expect(r.datos.fondos.every((f) => f.user_id === userId)).toBe(true)
  })

  it('es serializable a JSON válido (respaldo)', async () => {
    if (!hasDb) return
    const json = JSON.stringify(await exportarDatos(userId), null, 2)
    const vuelta = JSON.parse(json)
    expect(vuelta.datos.fondos[0].id).toBe(fondoId)
    expect(vuelta.datos.transacciones[0].monto_centavos).toBe(1234)
    expect(vuelta.datos.transacciones[0].cuenta_id).toBe(cuentaId)
  })
})
