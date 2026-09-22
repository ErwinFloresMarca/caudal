import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, settings } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { crearFondo, getFondo } from '../server/utils/fondos'
import { crearCuenta, getCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import {
  parseTransaccion,
  crearTransaccion,
  listarTransacciones,
  getTransaccion,
  editarTransaccion,
  borrarTransaccion,
} from '../server/utils/transacciones'
import { convertToBase } from '#shared/money'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let fondoId: number
let cuentaBobId: number
let cuentaUsdId: number
let catComidaId: number
let catSueldoId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `trx-${randomUUID()}@test.dev`, name: 'Transacciones' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `trx-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo Trx', tipo: 'personal', moneda_base: 'BOB' })
  const fondoRow = await getFondo(userId, fondo.id)
  fondoId = fondoRow!.id

  const cuentaBob = await crearCuenta(userId, fondoId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 10000 })
  const cuentaUsd = await crearCuenta(userId, fondoId, { nombre: 'Ahorros', tipo: 'ahorro', moneda: 'USD', saldo_inicial_centavos: 0 })
  cuentaBobId = cuentaBob.id
  cuentaUsdId = cuentaUsd.id

  const cats = await listarCategorias(userId, fondoId)
  const comida = cats.find((c) => c.nombre === 'Comida')
  const sueldo = cats.find((c) => c.nombre === 'Sueldo')
  catComidaId = comida!.id
  catSueldoId = sueldo!.id
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(transacciones).where(eq(transacciones.user_id, userId))
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdOtro))
  await db.delete(cuentas).where(eq(cuentas.user_id, userId))
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdOtro))
  await db.delete(categorias).where(eq(categorias.user_id, userId))
  await db.delete(categorias).where(eq(categorias.user_id, userIdOtro))
  await db.delete(fondos).where(eq(fondos.user_id, userId))
  await db.delete(fondos).where(eq(fondos.user_id, userIdOtro))
  await db.delete(settings).where(eq(settings.user_id, userId))
  await db.delete(settings).where(eq(settings.user_id, userIdOtro))
  await db.delete(users).where(eq(users.id, userId))
  await db.delete(users).where(eq(users.id, userIdOtro))
})

describe.skipIf(!hasDb)('transacciones', () => {
  it('un gasto BOB de 12,50 baja el saldo de la cuenta exactamente 1250 centavos', async () => {
    const antes = await getCuenta(userId, cuentaBobId)
    await crearTransaccion(userId, fondoId, {
      cuenta_id: cuentaBobId,
      categoria_id: catComidaId,
      tipo: 'gasto',
      monto_centavos: 1250,
      fecha: '2026-09-19',
      nota: 'Almuerzo',
    })
    const despues = await getCuenta(userId, cuentaBobId)
    expect(despues!.saldo_actual_centavos).toBe(antes!.saldo_actual_centavos - 1250)
  })

  it('un ingreso USD con tasa_ref=6,96 consolida a Bs 313,20 en la base', async () => {
    await crearTransaccion(userId, fondoId, {
      cuenta_id: cuentaUsdId,
      categoria_id: catSueldoId,
      tipo: 'ingreso',
      monto_centavos: 4500,
      tasa_ref: 6.96,
      fecha: '2026-09-19',
    })
    const base = convertToBase({ centavos: 4500, moneda: 'USD' }, 6.96)
    expect(base).toEqual({ centavos: 31320, moneda: 'BOB' })
  })

  it('las BOB no piden tasa y la tasa USD es obligatoria', async () => {
    await expect(
      crearTransaccion(userId, fondoId, {
        cuenta_id: cuentaUsdId,
        tipo: 'gasto',
        monto_centavos: 1000,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /tasa_ref/ })
  })

  it('una transacción con fecha pasada aparece en su día, no en el de hoy', async () => {
    await crearTransaccion(userId, fondoId, {
      cuenta_id: cuentaBobId,
      categoria_id: catComidaId,
      tipo: 'gasto',
      monto_centavos: 500,
      fecha: '2026-09-01',
    })
    const lista = await listarTransacciones(userId, fondoId, { desde: '2026-09-01', hasta: '2026-09-01' })
    expect(lista.some((t) => t.fecha === '2026-09-01' && t.monto_centavos === 500)).toBe(true)
  })

  it('valida en el servidor: no permite cuenta de otro fondo ni categoría de otro fondo', async () => {
    const fondoOtro = await crearFondo(userId, { nombre: 'Otro Fondo', tipo: 'personal', moneda_base: 'BOB' })
    const cuentaOtroFondo = await crearCuenta(userId, fondoOtro.id, { nombre: 'Caja 2', tipo: 'efectivo', moneda: 'BOB' })

    await expect(
      crearTransaccion(userId, fondoId, {
        cuenta_id: cuentaOtroFondo.id,
        tipo: 'gasto',
        monto_centavos: 100,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /Cuenta no encontrada/ })

    const catsOtro = await listarCategorias(userId, fondoOtro.id)
    await expect(
      crearTransaccion(userId, fondoId, {
        cuenta_id: cuentaBobId,
        categoria_id: catsOtro[0].id,
        tipo: 'gasto',
        monto_centavos: 100,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /Categoría no encontrada/ })
  })

  it('editar cambia monto/fecha/categoría; borrar elimina la fila', async () => {
    const creada = await crearTransaccion(userId, fondoId, {
      cuenta_id: cuentaBobId,
      categoria_id: catComidaId,
      tipo: 'gasto',
      monto_centavos: 1000,
      fecha: '2026-09-18',
    })
    const editada = await editarTransaccion(userId, creada.id, {
      cuenta_id: cuentaBobId,
      categoria_id: catSueldoId,
      tipo: 'gasto',
      monto_centavos: 2000,
      fecha: '2026-09-17',
    })
    expect(editada!.monto_centavos).toBe(2000)
    expect(editada!.fecha).toBe('2026-09-17')
    expect(editada!.categoria!.nombre).toBe('Sueldo')

    await expect(
      editarTransaccion(userId, creada.id, {
        cuenta_id: cuentaUsdId,
        tipo: 'gasto',
        monto_centavos: 2000,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /No se puede cambiar la cuenta/ })

    const borrada = await borrarTransaccion(userId, creada.id)
    expect(borrada.id).toBe(creada.id)
    expect(await getTransaccion(userId, creada.id)).toBeNull()
  })

  it('aislamiento: otro usuario no ve ni borra mis transacciones', async () => {
    const creada = await crearTransaccion(userId, fondoId, {
      cuenta_id: cuentaBobId,
      categoria_id: catComidaId,
      tipo: 'gasto',
      monto_centavos: 999,
      fecha: '2026-09-16',
    })
    expect(await getTransaccion(userIdOtro, creada.id)).toBeNull()
    await expect(borrarTransaccion(userIdOtro, creada.id)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('parseTransaccion (puro)', () => {
  it('valida formato del body', () => {
    const data = parseTransaccion({ cuenta_id: 1, tipo: 'gasto', monto_centavos: 1250, fecha: '2026-09-19', nota: '  café  ' })
    expect(data.nota).toBe('café')
  })

  it('rechaza monto no entero y tipo inválido', () => {
    expect(() => parseTransaccion({ cuenta_id: 1, tipo: 'gasto', monto_centavos: 12.5 })).toThrow(/monto_centavos/)
    expect(() => parseTransaccion({ cuenta_id: 1, tipo: 'robado', monto_centavos: 10 })).toThrow(/tipo/)
    expect(() => parseTransaccion({ cuenta_id: 0, tipo: 'gasto', monto_centavos: 10 })).toThrow(/cuenta_id/)
  })
})