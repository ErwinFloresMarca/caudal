import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, transferencias } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { crearFondo, getFondo } from '../server/utils/fondos'
import { crearCuenta, getCuenta } from '../server/utils/cuentas'
import {
  parseTransferencia,
  crearTransferencia,
  listarTransferencias,
  getTransferencia,
  editarTransferencia,
  borrarTransferencia,
} from '../server/utils/transferencias'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let fondoId: number
let cuentaBobAId: number
let cuentaBobBId: number
let cuentaUsdId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `trxfer-${randomUUID()}@test.dev`, name: 'Transferencias' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `trxfer-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo Trxfer', tipo: 'personal', moneda_base: 'BOB' })
  const fondoRow = await getFondo(userId, fondo.id)
  fondoId = fondoRow!.id

  const cuentaA = await crearCuenta(userId, fondoId, { nombre: 'Efectivo', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 10000 })
  const cuentaB = await crearCuenta(userId, fondoId, { nombre: 'Banco', tipo: 'banco', moneda: 'BOB', saldo_inicial_centavos: 0 })
  const cuentaUsd = await crearCuenta(userId, fondoId, { nombre: 'Ahorros', tipo: 'ahorro', moneda: 'USD', saldo_inicial_centavos: 0 })
  cuentaBobAId = cuentaA.id
  cuentaBobBId = cuentaB.id
  cuentaUsdId = cuentaUsd.id
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(transferencias).where(eq(transferencias.user_id, userId))
  await db.delete(transferencias).where(eq(transferencias.user_id, userIdOtro))
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

describe.skipIf(!hasDb)('transferencias', () => {
  it('transferir Bs 100 de Efectivo a Banco mueve 10000 centavos y deja el total del fondo igual', async () => {
    const [a, b] = await Promise.all([getCuenta(userId, cuentaBobAId), getCuenta(userId, cuentaBobBId)])
    const totalAntes = a!.saldo_actual_centavos + b!.saldo_actual_centavos

    const t = await crearTransferencia(userId, fondoId, {
      cuenta_origen_id: cuentaBobAId,
      cuenta_destino_id: cuentaBobBId,
      monto_origen_centavos: 10000,
      fecha: '2026-09-19',
      nota: 'Traslado',
    })
    expect(t.monto_destino_centavos).toBe(10000)
    expect(t.monto_destino_formateado).toBe('Bs 100,00')

    const [a2, b2] = await Promise.all([getCuenta(userId, cuentaBobAId), getCuenta(userId, cuentaBobBId)])
    expect(a2!.saldo_actual_centavos).toBe(a!.saldo_actual_centavos - 10000)
    expect(b2!.saldo_actual_centavos).toBe(b!.saldo_actual_centavos + 10000)
    expect(a2!.saldo_actual_centavos + b2!.saldo_actual_centavos).toBe(totalAntes)
  })

  it('transferir Bs 300 a cuenta USD pide tasa/monto destino; destino sube el equivalente', async () => {
    await expect(
      crearTransferencia(userId, fondoId, {
        cuenta_origen_id: cuentaBobAId,
        cuenta_destino_id: cuentaUsdId,
        monto_origen_centavos: 30000,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /monto_destino_centavos o tasa_ref/ })

    await expect(
      crearTransferencia(userId, fondoId, {
        cuenta_origen_id: cuentaBobAId,
        cuenta_destino_id: cuentaUsdId,
        monto_origen_centavos: 30000,
        tasa_ref: '6,96',
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /tasa_ref debe ser un número positivo/ })

    const t = await crearTransferencia(userId, fondoId, {
      cuenta_origen_id: cuentaBobAId,
      cuenta_destino_id: cuentaUsdId,
      monto_origen_centavos: 30000,
      monto_destino_centavos: 4310,
      tasa_ref: 6.96,
      fecha: '2026-09-19',
    })
    expect(t.tasa_ref).toBe(6.96)
    expect(t.monto_origen_centavos).toBe(30000)
    expect(t.monto_destino_centavos).toBe(4310)
  })

  it('con tasa (sin monto destino), BOB→USD divide y USD→BOB multiplica', async () => {
    const bobAUsd = await crearTransferencia(userId, fondoId, {
      cuenta_origen_id: cuentaBobAId,
      cuenta_destino_id: cuentaUsdId,
      monto_origen_centavos: 6960,
      tasa_ref: 6.96,
      fecha: '2026-09-19',
    })
    expect(bobAUsd.monto_destino_centavos).toBe(1000)

    const usdABob = await crearTransferencia(userId, fondoId, {
      cuenta_origen_id: cuentaUsdId,
      cuenta_destino_id: cuentaBobAId,
      monto_origen_centavos: 1000,
      tasa_ref: 6.96,
      fecha: '2026-09-19',
    })
    expect(usdABob.monto_destino_centavos).toBe(6960)
  })

  it('no permite transferir a la misma cuenta', async () => {
    await expect(
      crearTransferencia(userId, fondoId, {
        cuenta_origen_id: cuentaBobAId,
        cuenta_destino_id: cuentaBobAId,
        monto_origen_centavos: 1000,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /misma cuenta/ })
  })

  it('origen y destino deben pertenecer al mismo fondo', async () => {
    const fondoOtro = await crearFondo(userId, { nombre: 'Otro Fondo Trxfer', tipo: 'personal', moneda_base: 'BOB' })
    const cuentaOtro = await crearCuenta(userId, fondoOtro.id, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB' })
    const saldoAntes = (await getCuenta(userId, cuentaOtro.id))!.saldo_actual_centavos
    await expect(
      crearTransferencia(userId, fondoId, {
        cuenta_origen_id: cuentaOtro.id,
        cuenta_destino_id: cuentaBobBId,
        monto_origen_centavos: 1000,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /mismo fondo/ })
    expect((await getCuenta(userId, cuentaOtro.id))!.saldo_actual_centavos).toBe(saldoAntes)
  })

  it('borrar restaura ambos saldos y recalc por id', async () => {
    const a = await getCuenta(userId, cuentaBobAId)
    const b = await getCuenta(userId, cuentaBobBId)
    const t = await crearTransferencia(userId, fondoId, {
      cuenta_origen_id: cuentaBobAId,
      cuenta_destino_id: cuentaBobBId,
      monto_origen_centavos: 5000,
      fecha: '2026-09-18',
    })
    await borrarTransferencia(userId, t.id)
    const [a2, b2] = await Promise.all([getCuenta(userId, cuentaBobAId), getCuenta(userId, cuentaBobBId)])
    expect(a2!.saldo_actual_centavos).toBe(a!.saldo_actual_centavos)
    expect(b2!.saldo_actual_centavos).toBe(b!.saldo_actual_centavos)
    expect(await getTransferencia(userId, t.id)).toBeNull()
  })

  it('aislamiento: otro usuario no ve ni borra mis transferencias', async () => {
    const t = await crearTransferencia(userId, fondoId, {
      cuenta_origen_id: cuentaBobAId,
      cuenta_destino_id: cuentaBobBId,
      monto_origen_centavos: 1000,
      fecha: '2026-09-17',
    })
    expect(await getTransferencia(userIdOtro, t.id)).toBeNull()
    await expect(borrarTransferencia(userIdOtro, t.id)).rejects.toMatchObject({ statusCode: 404 })
    const listaOtro = await listarTransferencias(userIdOtro, fondoId)
    expect(listaOtro.length).toBe(0)
  })

  it('listado filtra por fondo activo y las cuentas no cambian en edición', async () => {
    const t = await crearTransferencia(userId, fondoId, {
      cuenta_origen_id: cuentaBobAId,
      cuenta_destino_id: cuentaBobBId,
      monto_origen_centavos: 2000,
      fecha: '2026-09-15',
    })
    const lista = await listarTransferencias(userId, fondoId)
    expect(lista.some((x) => x.id === t.id)).toBe(true)

    await expect(
      editarTransferencia(userId, t.id, {
        cuenta_origen_id: cuentaBobBId,
        cuenta_destino_id: cuentaBobAId,
        monto_origen_centavos: 2000,
      }),
    ).rejects.toMatchObject({ statusCode: 400, message: /No se pueden cambiar las cuentas/ })

    const editada = await editarTransferencia(userId, t.id, {
      cuenta_origen_id: cuentaBobAId,
      cuenta_destino_id: cuentaBobBId,
      monto_origen_centavos: 2500,
      fecha: '2026-09-14',
      nota: 'actualizado',
    })
    expect(editada!.monto_origen_centavos).toBe(2500)
    expect(editada!.nota).toBe('actualizado')
  })
})

describe('parseTransferencia (puro)', () => {
  it('valida formato del body', () => {
    const data = parseTransferencia({ cuenta_origen_id: 1, cuenta_destino_id: 2, monto_origen_centavos: 1250, nota: '  traslado  ' })
    expect(data.nota).toBe('traslado')
    expect(data.tasa_ref).toBeNull()
  })

  it('rechaza montos no positivos y fecha inválida', () => {
    expect(() => parseTransferencia({ cuenta_origen_id: 1, cuenta_destino_id: 2, monto_origen_centavos: 0 })).toThrow(/monto_origen_centavos/)
    expect(() => parseTransferencia({ cuenta_origen_id: 1, cuenta_destino_id: 2, monto_origen_centavos: 100, fecha: '19/09/2026' })).toThrow(/fecha/)
  })
})