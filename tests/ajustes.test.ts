import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, apiKeys, settings } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { hashPasswordScrypt, verifyPasswordScrypt } from '../shared/password'
import { generateApiKey, hashApiKey } from '../shared/api-keys'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { crearTransaccion } from '../server/utils/transacciones'
import { generarReporte } from '../server/utils/reportes'
import {
  getPerfil,
  actualizarPerfil,
  cambiarPassword,
  getMonedaBase,
  setMonedaBase,
  getTasa,
  setTasa,
  borrarCuenta,
} from '../server/utils/ajustes'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let userIdBorrar: number
let fondoId: number
let catGastoId: number
const passOriginal = 'clave-segura-123'

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db
    .insert(users)
    .values({ email: `aju-${randomUUID()}@test.dev`, name: 'Ajustes', password_hash: await hashPasswordScrypt(passOriginal) })
    .returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `aju-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  const [b] = await db.insert(users).values({ email: `aju-borrar-${randomUUID()}@test.dev`, name: 'Borrar' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id
  userIdBorrar = b.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo Ajustes', tipo: 'personal', moneda_base: 'BOB' })
  fondoId = fondo.id
  catGastoId = (await listarCategorias(userId, fondoId)).find((c) => c.tipo === 'gasto')!.id

  const fondoBorrar = await crearFondo(userIdBorrar, { nombre: 'Temp', tipo: 'personal', moneda_base: 'BOB' })
  const cuentaBorrar = await crearCuenta(userIdBorrar, fondoBorrar.id, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB' })
  await crearTransaccion(userIdBorrar, fondoBorrar.id, { cuenta_id: cuentaBorrar.id, tipo: 'gasto', monto_centavos: 100 })
  await db.insert(apiKeys).values({ user_id: userIdBorrar, nombre: 'k', key_hash: hashApiKey(generateApiKey()) })
  await db.insert(settings).values({ user_id: userIdBorrar, key: 'x', value: { a: 1 } })
})

afterAll(async () => {
  if (!hasDb) return
  for (const uid of [userId, userIdOtro]) {
    await db.delete(transacciones).where(eq(transacciones.user_id, uid))
    await db.delete(settings).where(eq(settings.user_id, uid))
    await db.delete(apiKeys).where(eq(apiKeys.user_id, uid))
    await db.delete(cuentas).where(eq(cuentas.user_id, uid))
    await db.delete(categorias).where(eq(categorias.user_id, uid))
    await db.delete(fondos).where(eq(fondos.user_id, uid))
    await db.delete(users).where(eq(users.id, uid))
  }
})

describe.skipIf(!hasDb)('ajustes (SPC-017)', () => {
  it('perfil: actualiza nombre y timezone, valida email y rechaza duplicado', async () => {
    const p = await getPerfil(userId)
    expect(p.nombre).toBe('Ajustes')

    const editado = await actualizarPerfil(userId, { nombre: '  Erwin  ', timezone: 'America/La_Paz' })
    expect(editado.nombre).toBe('Erwin')
    expect(editado.timezone).toBe('America/La_Paz')

    await expect(actualizarPerfil(userId, { email: 'no-es-email' })).rejects.toMatchObject({ statusCode: 400 })

    const otroEmail = (await db.select({ email: users.email }).from(users).where(eq(users.id, userIdOtro)))[0]!.email
    await expect(actualizarPerfil(userId, { email: otroEmail })).rejects.toMatchObject({ statusCode: 409 })
  })

  it('cambiar contraseña exige la actual y actualiza el hash', async () => {
    await expect(cambiarPassword(userId, { actual: 'incorrecta', nueva: 'otra-clave-123' })).rejects.toMatchObject({ statusCode: 400 })
    await expect(cambiarPassword(userId, { actual: passOriginal, nueva: 'corta' })).rejects.toMatchObject({ statusCode: 400 })

    const res = await cambiarPassword(userId, { actual: passOriginal, nueva: 'nueva-clave-456' })
    expect(res.cambio).toBe(true)

    const hash = (await db.select({ h: users.password_hash }).from(users).where(eq(users.id, userId)))[0]!.h!
    expect(await verifyPasswordScrypt(hash, 'nueva-clave-456')).toBe(true)
    expect(await verifyPasswordScrypt(hash, passOriginal)).toBe(false)
  })

  it('la tasa guardada y la usada en una transacción USD quedan como auto-sugerencia', async () => {
    expect((await getTasa(userId)).actual).toBeNull()

    await setTasa(userId, { valor: '6,96', fecha: '2026-09-20' })
    expect((await getTasa(userId)).actual).toEqual({ valor: 6.96, fecha: '2026-09-20' })

    const cuentaUsd = await crearCuenta(userId, fondoId, { nombre: 'USD', tipo: 'ahorro', moneda: 'USD' })
    await crearTransaccion(userId, fondoId, { cuenta_id: cuentaUsd.id, categoria_id: catGastoId, tipo: 'gasto', monto_centavos: 10000, tasa_ref: 7.1 })
    const t = await getTasa(userId)
    expect(t.actual!.valor).toBe(7.1)
    expect(t.historial.length).toBeGreaterThanOrEqual(2)
  })

  it('la moneda base por defecto cambia la base de los reportes nuevos', async () => {
    expect(await getMonedaBase(userId)).toBe('BOB')
    await setTasa(userId, { valor: 7, fecha: '2026-09-20' })
    await setMonedaBase(userId, 'USD')
    expect(await getMonedaBase(userId)).toBe('USD')

    const r = await generarReporte(userId, { fondoIds: [fondoId], desde: '2026-09-01', hasta: '2026-09-30' })
    expect(r.filtros.base).toBe('USD')

    await setMonedaBase(userId, 'BOB')
  })

  it('revocar una API key la elimina (Bearer deja de resolver)', async () => {
    const key = generateApiKey()
    const [k] = await db.insert(apiKeys).values({ user_id: userId, nombre: 'mcp', key_hash: hashApiKey(key) }).returning({ id: apiKeys.id })
    const buscar = async () => (await db.select({ id: apiKeys.id }).from(apiKeys).where(eq(apiKeys.key_hash, hashApiKey(key))).limit(1))[0]
    expect(await buscar()).toBeTruthy()
    await db.delete(apiKeys).where(eq(apiKeys.id, k!.id))
    expect(await buscar()).toBeUndefined()
  })

  it('borrar cuenta exige confirmación y elimina todos los datos', async () => {
    await expect(borrarCuenta(userIdBorrar, 'si')).rejects.toMatchObject({ statusCode: 400 })
    await borrarCuenta(userIdBorrar, 'BORRAR')

    await expect(getPerfil(userIdBorrar)).rejects.toMatchObject({ statusCode: 404 })
    expect((await db.select().from(fondos).where(eq(fondos.user_id, userIdBorrar))).length).toBe(0)
    expect((await db.select().from(apiKeys).where(eq(apiKeys.user_id, userIdBorrar))).length).toBe(0)
    expect((await db.select().from(settings).where(eq(settings.user_id, userIdBorrar))).length).toBe(0)
  })
})
