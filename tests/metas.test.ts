import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, metasAhorro, aportesMeta, transacciones } from '../server/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import {
  parseMeta,
  parseAporteMeta,
  crearMeta,
  listarMetas,
  getMeta,
  editarMeta,
  borrarMeta,
  crearAporteMeta,
  editarAporteMeta,
  borrarAporteMeta,
} from '../server/utils/metas'
import { calcularProgreso } from '#shared/metas'
import { editarTransaccion, borrarTransaccion } from '../server/utils/transacciones'
import { crearCuenta, getCuenta } from '../server/utils/cuentas'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let fondoId: number
let otroFondoId: number
let cuentaId: number
let cuentaOtroFondoId: number
let cuentaUsdId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `meta-${randomUUID()}@test.dev`, name: 'Metas' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `meta-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo Metas', tipo: 'personal', moneda_base: 'BOB' })
  fondoId = fondo.id
  const otroFondo = await crearFondo(userId, { nombre: 'Fondo 2', tipo: 'personal', moneda_base: 'BOB' })
  otroFondoId = otroFondo.id

  cuentaId = (await crearCuenta(userId, fondoId, { nombre: 'Ahorro', tipo: 'ahorro', moneda: 'BOB', saldo_inicial_centavos: 0 })).id
  cuentaOtroFondoId = (await crearCuenta(userId, otroFondoId, { nombre: 'Otra', tipo: 'efectivo', moneda: 'BOB' })).id
  cuentaUsdId = (await crearCuenta(userId, fondoId, { nombre: 'Ahorro USD', tipo: 'ahorro', moneda: 'USD' })).id
})

afterAll(async () => {
  if (!hasDb) return
  for (const uid of [userId, userIdOtro]) {
    const ids = (await db.select({ id: metasAhorro.id }).from(metasAhorro).where(eq(metasAhorro.user_id, uid))).map((m) => m.id)
    if (ids.length) await db.delete(aportesMeta).where(inArray(aportesMeta.meta_id, ids))
  }
  await db.delete(metasAhorro).where(eq(metasAhorro.user_id, userId))
  await db.delete(metasAhorro).where(eq(metasAhorro.user_id, userIdOtro))
  await db.delete(transacciones).where(eq(transacciones.user_id, userId))
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdOtro))
  await db.delete(cuentas).where(eq(cuentas.user_id, userId))
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdOtro))
  await db.delete(categorias).where(eq(categorias.user_id, userId))
  await db.delete(categorias).where(eq(categorias.user_id, userIdOtro))
  await db.delete(fondos).where(eq(fondos.user_id, userId))
  await db.delete(fondos).where(eq(fondos.user_id, userIdOtro))
  await db.delete(users).where(eq(users.id, userId))
  await db.delete(users).where(eq(users.id, userIdOtro))
})

describe('calcularProgreso (puro)', () => {
  it('Bs 1200 sobre Bs 5000 = 24% y Bs 3800 restantes', () => {
    const p = calcularProgreso([120000], 500000)
    expect(p.porcentaje).toBe(24)
    expect(p.restante_centavos).toBe(380000)
    expect(p.acumulado_centavos).toBe(120000)
    expect(p.alcanzada).toBe(false)
  })

  it('superar el objetivo marca alcanzada con 100% tope y 0 restante', () => {
    const p = calcularProgreso([600000], 500000)
    expect(p.alcanzada).toBe(true)
    expect(p.porcentaje).toBe(100)
    expect(p.restante_centavos).toBe(0)
  })

  it('los aportes negativos (retiros) restan al progreso', () => {
    const p = calcularProgreso([120000, -20000], 500000)
    expect(p.acumulado_centavos).toBe(100000)
    expect(p.porcentaje).toBe(20)
  })
})

describe.skipIf(!hasDb)('metas (repositorio)', () => {
  it('crea meta de Bs 5000 y un aporte de Bs 1200 muestra 24% y Bs 3800 restantes', async () => {
    const meta = await crearMeta(userId, fondoId, {
      nombre: 'Impresora 3D',
      monto_objetivo_centavos: 500000,
      moneda: 'BOB',
      fecha_objetivo: '2026-12-31',
    })
    expect(meta!.progreso.porcentaje).toBe(0)

    const res = await crearAporteMeta(userId, meta!.id, { monto_centavos: 120000, fecha: '2026-09-10', nota: 'primer ahorro' })
    expect(res.meta!.progreso.porcentaje).toBe(24)
    expect(res.meta!.progreso.restante_centavos).toBe(380000)
    expect(res.meta!.progreso.restante_formateado).toBe('Bs 3.800,00')
    await borrarMeta(userId, meta!.id)
  })

  it('sumar aportes que superan el objetivo marca alcanzada', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Emergencia', monto_objetivo_centavos: 300000, moneda: 'BOB' })
    await crearAporteMeta(userId, meta!.id, { monto_centavos: 200000 })
    const res = await crearAporteMeta(userId, meta!.id, { monto_centavos: 150000 })
    expect(res.meta!.progreso.alcanzada).toBe(true)
    expect(res.meta!.progreso.porcentaje).toBe(100)
    await borrarMeta(userId, meta!.id)
  })

  it('editar y borrar un aporte recalcula el progreso', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Viaje', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    const creado = await crearAporteMeta(userId, meta!.id, { monto_centavos: 25000 })
    expect(creado.meta!.progreso.porcentaje).toBe(25)

    const editado = await editarAporteMeta(userId, meta!.id, creado.aporte!.id, { monto_centavos: 50000 })
    expect(editado.meta!.progreso.porcentaje).toBe(50)

    const borrado = await borrarAporteMeta(userId, meta!.id, creado.aporte!.id)
    expect(borrado.meta!.progreso.porcentaje).toBe(0)
    await borrarMeta(userId, meta!.id)
  })

  it('permite aporte con cuenta opcional y valida que sea del mismo fondo', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Cuenta', monto_objetivo_centavos: 100000, moneda: 'BOB' })

    const sinCuenta = await crearAporteMeta(userId, meta!.id, { monto_centavos: 10000 })
    expect(sinCuenta.aporte!.cuenta_id).toBeNull()

    const conCuenta = await crearAporteMeta(userId, meta!.id, { monto_centavos: 10000, cuenta_id: cuentaId })
    expect(conCuenta.aporte!.cuenta_id).toBe(cuentaId)

    await expect(crearAporteMeta(userId, meta!.id, { monto_centavos: 10000, cuenta_id: cuentaOtroFondoId })).rejects.toMatchObject({
      statusCode: 400,
      message: /Cuenta no encontrada/,
    })

    // un retiro negativo resta
    const retiro = await crearAporteMeta(userId, meta!.id, { monto_centavos: -5000 })
    expect(retiro.meta!.progreso.acumulado_centavos).toBe(15000)
    await borrarMeta(userId, meta!.id)
  })

  it('aporte con cuenta descuenta del saldo y crea el gasto de Ahorro', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Con descuento', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    const antes = (await getCuenta(userId, cuentaId))!.saldo_actual_centavos

    const res = await crearAporteMeta(userId, meta!.id, { monto_centavos: 30000, cuenta_id: cuentaId })
    expect(res.aporte!.transaccion_id).toBeTruthy()

    const despues = (await getCuenta(userId, cuentaId))!.saldo_actual_centavos
    expect(despues).toBe(antes - 30000)

    const [trx] = await db.select().from(transacciones).where(eq(transacciones.id, res.aporte!.transaccion_id!))
    expect(trx).toMatchObject({ tipo: 'gasto', monto_centavos: 30000, fuente: 'meta' })
    const [cat] = await db.select().from(categorias).where(eq(categorias.id, trx!.categoria_id!))
    expect(cat!.nombre).toBe('Ahorro')

    await borrarMeta(userId, meta!.id)
  })

  it('un retiro con cuenta devuelve la plata (ingreso)', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Retiro con cuenta', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    await crearAporteMeta(userId, meta!.id, { monto_centavos: 30000, cuenta_id: cuentaId })
    const antes = (await getCuenta(userId, cuentaId))!.saldo_actual_centavos

    const retiro = await crearAporteMeta(userId, meta!.id, { monto_centavos: -12000, cuenta_id: cuentaId })
    expect((await getCuenta(userId, cuentaId))!.saldo_actual_centavos).toBe(antes + 12000)

    const [trx] = await db.select().from(transacciones).where(eq(transacciones.id, retiro.aporte!.transaccion_id!))
    expect(trx).toMatchObject({ tipo: 'ingreso', monto_centavos: 12000, fuente: 'meta' })

    await borrarMeta(userId, meta!.id)
  })

  it('editar el aporte actualiza la misma transacción', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Editar con cuenta', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    const creado = await crearAporteMeta(userId, meta!.id, { monto_centavos: 20000, cuenta_id: cuentaId })
    const trxId = creado.aporte!.transaccion_id!

    const editado = await editarAporteMeta(userId, meta!.id, creado.aporte!.id, { monto_centavos: 45000 })
    expect(editado.aporte!.transaccion_id).toBe(trxId)
    const [trx] = await db.select().from(transacciones).where(eq(transacciones.id, trxId))
    expect(trx!.monto_centavos).toBe(45000)

    await expect(
      editarAporteMeta(userId, meta!.id, creado.aporte!.id, { monto_centavos: 45000, cuenta_id: cuentaOtroFondoId }),
    ).rejects.toMatchObject({ statusCode: 400, message: /No se puede cambiar la cuenta/ })

    await borrarMeta(userId, meta!.id)
  })

  it('borrar el aporte borra su transacción', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Borrar con cuenta', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    const creado = await crearAporteMeta(userId, meta!.id, { monto_centavos: 15000, cuenta_id: cuentaId })
    const trxId = creado.aporte!.transaccion_id!

    await borrarAporteMeta(userId, meta!.id, creado.aporte!.id)
    expect((await db.select().from(transacciones).where(eq(transacciones.id, trxId))).length).toBe(0)

    await borrarMeta(userId, meta!.id)
  })

  it('borrar la meta conserva las transacciones de sus aportes', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Historia', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    const creado = await crearAporteMeta(userId, meta!.id, { monto_centavos: 25000, cuenta_id: cuentaId })
    const trxId = creado.aporte!.transaccion_id!

    await borrarMeta(userId, meta!.id)
    expect((await db.select().from(transacciones).where(eq(transacciones.id, trxId))).length).toBe(1)
  })

  it('rechaza la cuenta de otra moneda que la meta', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Solo BOB', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    await expect(crearAporteMeta(userId, meta!.id, { monto_centavos: 10000, cuenta_id: cuentaUsdId })).rejects.toMatchObject({
      statusCode: 400,
      message: /debe estar en BOB/,
    })
    await borrarMeta(userId, meta!.id)
  })

  it('la transacción de un aporte no se edita ni borra desde Movimientos', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Una puerta', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    const creado = await crearAporteMeta(userId, meta!.id, { monto_centavos: 10000, cuenta_id: cuentaId })
    const trxId = creado.aporte!.transaccion_id!

    await expect(
      editarTransaccion(userId, trxId, { cuenta_id: cuentaId, tipo: 'gasto', monto_centavos: 9999 }),
    ).rejects.toMatchObject({ statusCode: 409 })
    await expect(borrarTransaccion(userId, trxId)).rejects.toMatchObject({ statusCode: 409 })

    await borrarMeta(userId, meta!.id)
  })

  it('lista las metas por fondo activo', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Meta del fondo', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    const delFondo = await listarMetas(userId, fondoId)
    const delOtro = await listarMetas(userId, otroFondoId)
    expect(delFondo.some((m) => m.id === meta!.id)).toBe(true)
    expect(delOtro.some((m) => m.id === meta!.id)).toBe(false)
    await borrarMeta(userId, meta!.id)
  })

  it('borrar la meta elimina sus aportes', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Temporal', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    await crearAporteMeta(userId, meta!.id, { monto_centavos: 10000 })
    await borrarMeta(userId, meta!.id)
    const quedan = await db.select().from(aportesMeta).where(eq(aportesMeta.meta_id, meta!.id))
    expect(quedan.length).toBe(0)
  })

  it('aislamiento: otro usuario no ve ni borra mis metas', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Privada', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    expect(await getMeta(userIdOtro, meta!.id)).toBeNull()
    await expect(borrarMeta(userIdOtro, meta!.id)).rejects.toMatchObject({ statusCode: 404 })
    await expect(crearAporteMeta(userIdOtro, meta!.id, { monto_centavos: 100 })).rejects.toMatchObject({ statusCode: 404 })
    expect((await listarMetas(userIdOtro, fondoId)).length).toBe(0)
    await borrarMeta(userId, meta!.id)
  })

  it('editar meta cambia objetivo y recalcula', async () => {
    const meta = await crearMeta(userId, fondoId, { nombre: 'Ajustable', monto_objetivo_centavos: 100000, moneda: 'BOB' })
    await crearAporteMeta(userId, meta!.id, { monto_centavos: 25000 })
    const editada = await editarMeta(userId, meta!.id, { nombre: 'Ajustable', monto_objetivo_centavos: 50000, moneda: 'BOB' })
    expect(editada!.progreso.porcentaje).toBe(50)
    await borrarMeta(userId, meta!.id)
  })
})

describe('parseMeta / parseAporteMeta (puro)', () => {
  it('valida los campos de la meta', () => {
    expect(() => parseMeta({ nombre: '', monto_objetivo_centavos: 100, moneda: 'BOB' })).toThrow(/nombre/)
    expect(() => parseMeta({ nombre: 'X', monto_objetivo_centavos: 0, moneda: 'BOB' })).toThrow(/monto_objetivo/)
    expect(() => parseMeta({ nombre: 'X', monto_objetivo_centavos: 100, moneda: 'EUR' })).toThrow(/moneda/)
    expect(() => parseMeta({ nombre: 'X', monto_objetivo_centavos: 100, moneda: 'BOB', fecha_objetivo: '31/12/2026' })).toThrow(/fecha_objetivo/)
  })

  it('acepta aporte negativo y rechaza cero', () => {
    expect(parseAporteMeta({ monto_centavos: -500 }).monto_centavos).toBe(-500)
    expect(() => parseAporteMeta({ monto_centavos: 0 })).toThrow(/monto_centavos/)
    expect(() => parseAporteMeta({ monto_centavos: 10.5 })).toThrow(/monto_centavos/)
  })
})
