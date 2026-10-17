import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, deudas, cuotas, settings } from '../server/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta, getCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { listarTransacciones, getTransaccion } from '../server/utils/transacciones'
import {
  parseDeuda,
  parsePago,
  crearDeuda,
  listarDeudas,
  getDeuda,
  editarDeuda,
  editarCuota,
  pagarCuota,
  borrarDeuda,
} from '../server/utils/deudas'
import { repartirMonto, fechasCuotas, generarCuotas } from '#shared/cuotas'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let fondoId: number
let cuentaBobId: number
let cuentaUsdId: number
let fondoOtroId: number
let cuentaOtroBobId: number
let cuentaOtroUsdId: number
let cuentaAjenaId: number
let catGastoId: number
let catIngresoId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `deuda-${randomUUID()}@test.dev`, name: 'Deudas' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `deuda-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id

  const fondo = await crearFondo(userId, { nombre: 'Fondo Deudas', tipo: 'personal', moneda_base: 'BOB' })
  fondoId = fondo.id
  cuentaBobId = (await crearCuenta(userId, fondoId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 100000 })).id
  cuentaUsdId = (await crearCuenta(userId, fondoId, { nombre: 'Ahorro USD', tipo: 'ahorro', moneda: 'USD', saldo_inicial_centavos: 0 })).id

  // Segundo fondo del usuario (SPC-035: la otra pata) y una cuenta de otro usuario.
  fondoOtroId = (await crearFondo(userId, { nombre: 'Fondo Otro', tipo: 'negocio', moneda_base: 'BOB' })).id
  cuentaOtroBobId = (await crearCuenta(userId, fondoOtroId, { nombre: 'Caja negocio', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 50000 })).id
  cuentaOtroUsdId = (await crearCuenta(userId, fondoOtroId, { nombre: 'Banco USD', tipo: 'banco', moneda: 'USD', saldo_inicial_centavos: 0 })).id
  const fondoAjenoId = (await crearFondo(userIdOtro, { nombre: 'Fondo ajeno', tipo: 'personal', moneda_base: 'BOB' })).id
  cuentaAjenaId = (await crearCuenta(userIdOtro, fondoAjenoId, { nombre: 'Caja ajena', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 0 })).id

  const cats = await listarCategorias(userId, fondoId)
  catGastoId = cats.find((c) => c.tipo === 'gasto')!.id
  catIngresoId = cats.find((c) => c.tipo === 'ingreso')!.id
})

afterAll(async () => {
  if (!hasDb) return
  const deudasDe = async (uid: number) => (await db.select({ id: deudas.id }).from(deudas).where(eq(deudas.user_id, uid))).map((d) => d.id)
  for (const uid of [userId, userIdOtro]) {
    const ids = await deudasDe(uid)
    if (ids.length) await db.delete(cuotas).where(inArray(cuotas.deuda_id, ids))
  }
  await db.delete(transacciones).where(eq(transacciones.user_id, userId))
  await db.delete(transacciones).where(eq(transacciones.user_id, userIdOtro))
  await db.delete(deudas).where(eq(deudas.user_id, userId))
  await db.delete(deudas).where(eq(deudas.user_id, userIdOtro))
  await db.delete(cuentas).where(eq(cuentas.user_id, userId))
  await db.delete(cuentas).where(eq(cuentas.user_id, userIdOtro))
  await db.delete(categorias).where(eq(categorias.user_id, userId))
  await db.delete(categorias).where(eq(categorias.user_id, userIdOtro))
  await db.delete(fondos).where(eq(fondos.user_id, userId))
  await db.delete(fondos).where(eq(fondos.user_id, userIdOtro))
  // El pago en USD recuerda la tasa usada (ajustes).
  await db.delete(settings).where(eq(settings.user_id, userId))
  await db.delete(settings).where(eq(settings.user_id, userIdOtro))
  await db.delete(users).where(eq(users.id, userId))
  await db.delete(users).where(eq(users.id, userIdOtro))
})

describe('cuotas (puro)', () => {
  it('reparte exacto con ajuste de centavos en las primeras cuotas', () => {
    expect(repartirMonto(30000, 3)).toEqual([10000, 10000, 10000])
    expect(repartirMonto(10000, 3)).toEqual([3334, 3333, 3333])
    expect(repartirMonto(10000, 3).reduce((a, b) => a + b, 0)).toBe(10000)
  })

  it('fechas mensuales desde el inicio con recorte de fin de mes', () => {
    expect(fechasCuotas('2026-01-31', 3)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
    const cs = generarCuotas(10000, 3, '2026-01-31')
    expect(cs.map((c) => c.monto_centavos)).toEqual([3334, 3333, 3333])
    expect(cs.map((c) => c.numero)).toEqual([1, 2, 3])
  })
})

describe.skipIf(!hasDb)('deudas (repositorio)', () => {
  it('crea deuda de Bs 300 en 3 cuotas exactas de 10000', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      concepto: 'Préstamo',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    expect(d!.estado).toBe('activa')
    expect(d!.cuotas!.map((c) => c.monto_centavos)).toEqual([10000, 10000, 10000])
    expect(d!.progreso).toEqual({ pagadas: 0, total: 3 })
    expect(d!.saldo_pendiente_centavos).toBe(30000)
    await borrarDeuda(userId, d!.id)
  })

  it('crea deuda de Bs 100 en 3 cuotas que suman 10000', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Tienda',
      direccion: 'por_pagar',
      monto_total_centavos: 10000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    expect(d!.cuotas!.map((c) => c.monto_centavos)).toEqual([3334, 3333, 3333])
    expect(d!.cuotas!.reduce((s, c) => s + c.monto_centavos, 0)).toBe(10000)
    await borrarDeuda(userId, d!.id)
  })

  it('pagar cuota crea un gasto en la cuenta y sube el progreso a 1/3', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    const antes = (await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos

    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId, fecha: '2026-09-05' })
    expect(res.transaccion.tipo).toBe('gasto')
    expect(res.transaccion.monto_centavos).toBe(10000)
    expect(res.cuota!.pagada).toBe(true)
    expect(res.cuota!.fecha_pago).toBe('2026-09-05')
    expect(res.deuda!.progreso).toEqual({ pagadas: 1, total: 3 })
    expect(res.deuda!.saldo_pendiente_centavos).toBe(20000)
    expect((await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos).toBe(antes - 10000)

    const movs = await listarTransacciones(userId, fondoId, { desde: '2026-09-05', hasta: '2026-09-05' })
    expect(movs.some((m) => m.id === res.transaccion.id)).toBe(true)

    await expect(pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId })).rejects.toMatchObject({ statusCode: 400, message: /ya está pagada/ })
    await borrarDeuda(userId, d!.id)
  })

  it('pagadas todas las cuotas la deuda queda saldada', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 20000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 2,
    })
    await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId })
    const res = await pagarCuota(userId, d!.id, d!.cuotas![1]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId })
    expect(res.deuda!.estado).toBe('saldada')
    expect(res.deuda!.saldo_pendiente_centavos).toBe(0)
    await borrarDeuda(userId, d!.id)
  })

  it('una deuda por_cobrar genera un ingreso al pagar su cuota', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Cliente',
      direccion: 'por_cobrar',
      monto_total_centavos: 15000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catIngresoId })
    expect(res.transaccion.tipo).toBe('ingreso')
    expect(res.transaccion.monto_centavos).toBe(15000)
    await borrarDeuda(userId, d!.id)
  })

  it('editar num_cuotas recalcula las no pagadas sin tocar las pagadas', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId })

    const editada = await editarDeuda(userId, d!.id, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 4,
    })
    expect(editada!.cuotas!.length).toBe(4)
    const pagada = editada!.cuotas!.find((c) => c.numero === 1)!
    expect(pagada.pagada).toBe(true)
    expect(pagada.monto_centavos).toBe(10000)
    const noPagadas = editada!.cuotas!.filter((c) => !c.pagada)
    expect(noPagadas.length).toBe(3)
    expect(noPagadas.reduce((s, c) => s + c.monto_centavos, 0)).toBe(20000)

    await borrarDeuda(userId, d!.id)
  })

  it('edita una cuota no pagada y rechaza las pagadas', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 30000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 3,
    })
    const editada = await editarCuota(userId, d!.id, d!.cuotas![1]!.id, { monto_centavos: 12000 })
    expect(editada!.monto_centavos).toBe(12000)

    await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId })
    await expect(editarCuota(userId, d!.id, d!.cuotas![0]!.id, { monto_centavos: 1 })).rejects.toMatchObject({ statusCode: 400, message: /pagada/ })
    await borrarDeuda(userId, d!.id)
  })

  it('aislamiento: otro usuario no ve ni borra mis deudas', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 10000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    expect(await getDeuda(userIdOtro, d!.id)).toBeNull()
    await expect(borrarDeuda(userIdOtro, d!.id)).rejects.toMatchObject({ statusCode: 404 })
    expect((await listarDeudas(userIdOtro, fondoId)).length).toBe(0)
    expect(Number((await db.select({ n: sql<number>`COUNT(*)` }).from(transacciones).where(and(eq(transacciones.user_id, userIdOtro))))[0]!.n)).toBe(0)
    await borrarDeuda(userId, d!.id)
  })

  it('pago con dos patas: gasto en el fondo de la deuda, ingreso en el otro, ligados por grupo_id', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 20000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 2,
    })
    const antesDeuda = (await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos
    const antesOtra = (await getCuenta(userId, cuentaOtroBobId))!.saldo_actual_centavos

    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, {
      cuenta_id: cuentaBobId,
      categoria_id: catGastoId,
      otra_cuenta_id: cuentaOtroBobId,
      fecha: '2026-09-05',
    })

    expect(res.transaccion.tipo).toBe('gasto')
    expect(res.transaccion.monto_centavos).toBe(10000)
    expect(res.transaccion.fondo_id).toBe(fondoId)
    expect(res.transaccion_otra!.tipo).toBe('ingreso')
    expect(res.transaccion_otra!.monto_centavos).toBe(10000)
    expect(res.transaccion_otra!.cuenta_id).toBe(cuentaOtroBobId)
    expect(res.transaccion_otra!.fondo_id).toBe(fondoOtroId)

    const grupoDe = async (id: number) =>
      (await db.select({ grupo_id: transacciones.grupo_id }).from(transacciones).where(eq(transacciones.id, id)))[0]!.grupo_id
    expect(await grupoDe(res.transaccion.id)).toBe(res.transaccion.id)
    expect(await grupoDe(res.transaccion_otra!.id)).toBe(res.transaccion.id)

    expect((await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos).toBe(antesDeuda - 10000)
    expect((await getCuenta(userId, cuentaOtroBobId))!.saldo_actual_centavos).toBe(antesOtra + 10000)
    await borrarDeuda(userId, d!.id)
  })

  it('pago con dos patas: rechaza el mismo fondo, una cuenta ajena y una cuenta USD sin tasa', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 10000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const cuotaId = d!.cuotas![0]!.id
    const otrasAntes = (await listarTransacciones(userId, fondoOtroId)).length

    await expect(pagarCuota(userId, d!.id, cuotaId, { cuenta_id: cuentaBobId, otra_cuenta_id: cuentaBobId })).rejects.toMatchObject({
      statusCode: 400,
      message: /fondo distinto/,
    })
    await expect(pagarCuota(userId, d!.id, cuotaId, { cuenta_id: cuentaBobId, otra_cuenta_id: cuentaAjenaId })).rejects.toMatchObject({ statusCode: 404 })
    await expect(pagarCuota(userId, d!.id, cuotaId, { cuenta_id: cuentaBobId, otra_cuenta_id: cuentaOtroUsdId })).rejects.toMatchObject({
      statusCode: 400,
      message: /tasa_ref es obligatoria/,
    })

    // Ningún intento falló a medias: sin transacciones y con la cuota pendiente.
    expect((await listarTransacciones(userId, fondoOtroId)).length).toBe(otrasAntes)
    expect((await getDeuda(userId, d!.id))!.cuotas![0]!.pagada).toBe(false)
    await borrarDeuda(userId, d!.id)
  })

  it('pago con dos patas en deuda por_cobrar: ingreso en el fondo de la deuda y gasto en el otro', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Cliente',
      direccion: 'por_cobrar',
      monto_total_centavos: 15000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const antesOtra = (await getCuenta(userId, cuentaOtroBobId))!.saldo_actual_centavos

    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, {
      cuenta_id: cuentaBobId,
      categoria_id: catIngresoId,
      otra_cuenta_id: cuentaOtroBobId,
    })

    expect(res.transaccion.tipo).toBe('ingreso')
    expect(res.transaccion.monto_centavos).toBe(15000)
    expect(res.transaccion_otra!.tipo).toBe('gasto')
    expect(res.transaccion_otra!.monto_centavos).toBe(15000)
    expect((await getCuenta(userId, cuentaOtroBobId))!.saldo_actual_centavos).toBe(antesOtra - 15000)
    await borrarDeuda(userId, d!.id)
  })

  it('pago con dos patas multimoneda: convierte el importe de la segunda pata con la tasa', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 20000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 2,
    })

    // Pata de la deuda en BOB → segunda pata en USD: 10000 centavos / 8
    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, otra_cuenta_id: cuentaOtroUsdId, tasa_ref: 8, fecha: '2026-09-05' })
    expect(res.transaccion_otra!.moneda).toBe('USD')
    expect(res.transaccion_otra!.monto_centavos).toBe(1250)
    expect(res.transaccion_otra!.tasa_ref).toBe(8)

    // Pata de la deuda en USD → primera pata en BOB (10000 / 8 = 1250 USD) y
    // segunda pata en BOB (1250 * 8 = 10000).
    const res2 = await pagarCuota(userId, d!.id, d!.cuotas![1]!.id, { cuenta_id: cuentaUsdId, otra_cuenta_id: cuentaOtroBobId, tasa_ref: 8, fecha: '2026-09-06' })
    expect(res2.transaccion.moneda).toBe('USD')
    expect(res2.transaccion.monto_centavos).toBe(1250)
    expect(res2.transaccion.tasa_ref).toBe(8)
    expect(res2.transaccion_otra!.moneda).toBe('BOB')
    expect(res2.transaccion_otra!.monto_centavos).toBe(10000)
    await borrarDeuda(userId, d!.id)
  })

  it('SPC-037: deuda BOB pagada desde una cuenta USD → pata 1 convertida y cuota en BOB', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 3000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const antes = (await getCuenta(userId, cuentaUsdId))!.saldo_actual_centavos

    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaUsdId, categoria_id: catGastoId, tasa_ref: 6.96, fecha: '2026-09-05' })

    // 30,00 BOB a 6,96 → 431 centavos de USD
    expect(res.transaccion.moneda).toBe('USD')
    expect(res.transaccion.monto_centavos).toBe(431)
    expect(res.transaccion.tasa_ref).toBe(6.96)
    expect(res.transaccion_otra).toBeNull()
    // La cuota sigue en la moneda de la deuda con su importe original
    expect(res.cuota!.monto_centavos).toBe(3000)
    expect(res.deuda!.saldo_pendiente_centavos).toBe(0)
    expect((await getCuenta(userId, cuentaUsdId))!.saldo_actual_centavos).toBe(antes - 431)
    await borrarDeuda(userId, d!.id)
  })

  it('SPC-037: deuda USD pagada desde una cuenta BOB → pata 1 en BOB convertida', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 431,
      moneda: 'USD',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const antes = (await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos

    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId, tasa_ref: 6.96, fecha: '2026-09-05' })

    // 4,31 USD a 6,96 → 3000 centavos de BOB (la tasa no se guarda fuera de USD)
    expect(res.transaccion.moneda).toBe('BOB')
    expect(res.transaccion.monto_centavos).toBe(3000)
    expect(res.transaccion.tasa_ref).toBeNull()
    expect(res.cuota!.monto_centavos).toBe(431)
    expect((await getCuenta(userId, cuentaBobId))!.saldo_actual_centavos).toBe(antes - 3000)
    await borrarDeuda(userId, d!.id)
  })

  it('SPC-037: monedas distintas sin tasa → error y ninguna pata creada', async () => {
    const bobs = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 3000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const usds = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 431,
      moneda: 'USD',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const antes = (await listarTransacciones(userId, fondoId)).length

    // Deuda BOB desde una cuenta USD y deuda USD desde una cuenta BOB: las dos piden tasa.
    await expect(pagarCuota(userId, bobs!.id, bobs!.cuotas![0]!.id, { cuenta_id: cuentaUsdId })).rejects.toMatchObject({
      statusCode: 400,
      message: /cuenta de pago está en otra moneda/,
    })
    await expect(pagarCuota(userId, usds!.id, usds!.cuotas![0]!.id, { cuenta_id: cuentaBobId })).rejects.toMatchObject({
      statusCode: 400,
      message: /cuenta de pago está en otra moneda/,
    })

    expect((await listarTransacciones(userId, fondoId)).length).toBe(antes)
    expect((await getDeuda(userId, bobs!.id))!.cuotas![0]!.pagada).toBe(false)
    expect((await getDeuda(userId, usds!.id))!.cuotas![0]!.pagada).toBe(false)
    await borrarDeuda(userId, bobs!.id)
    await borrarDeuda(userId, usds!.id)
  })

  it('SPC-037: misma moneda en deuda y cuenta de pago → pata idéntica a hoy (sin regresión)', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 3000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, categoria_id: catGastoId, fecha: '2026-09-05' })

    expect(res.transaccion.moneda).toBe('BOB')
    expect(res.transaccion.monto_centavos).toBe(3000)
    expect(res.transaccion.tasa_ref).toBeNull()
    expect(res.cuota!.monto_centavos).toBe(3000)
    await borrarDeuda(userId, d!.id)
  })

  it('SPC-037: dos patas con conversión en la primera (deuda USD, pago BOB, otra cuenta USD)', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 431,
      moneda: 'USD',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, {
      cuenta_id: cuentaBobId,
      categoria_id: catGastoId,
      otra_cuenta_id: cuentaOtroUsdId,
      tasa_ref: 6.96,
      fecha: '2026-09-05',
    })

    expect(res.transaccion.moneda).toBe('BOB')
    expect(res.transaccion.monto_centavos).toBe(3000)
    expect(res.transaccion_otra!.moneda).toBe('USD')
    expect(res.transaccion_otra!.monto_centavos).toBe(431)
    expect(res.transaccion_otra!.tasa_ref).toBe(6.96)
    expect(res.cuota!.monto_centavos).toBe(431)
    await borrarDeuda(userId, d!.id)
  })

  it('aislamiento: la segunda pata del pago solo la ve su dueño', async () => {
    const d = await crearDeuda(userId, fondoId, {
      contraparte: 'Banco',
      direccion: 'por_pagar',
      monto_total_centavos: 10000,
      moneda: 'BOB',
      fecha_inicio: '2026-09-01',
      num_cuotas: 1,
    })
    const res = await pagarCuota(userId, d!.id, d!.cuotas![0]!.id, { cuenta_id: cuentaBobId, otra_cuenta_id: cuentaOtroBobId })
    const otraId = res.transaccion_otra!.id

    expect(await getTransaccion(userIdOtro, otraId)).toBeNull()
    expect((await listarTransacciones(userIdOtro, fondoOtroId)).length).toBe(0)
    expect(await getTransaccion(userId, otraId)).not.toBeNull()
    await borrarDeuda(userId, d!.id)
  })
})

describe('parseDeuda / parsePago (puro)', () => {
  it('valida dirección, monto y cuotas', () => {
    expect(() => parseDeuda({ contraparte: '', direccion: 'por_pagar', monto_total_centavos: 100, num_cuotas: 1, moneda: 'BOB' })).toThrow(/contraparte/)
    expect(() => parseDeuda({ contraparte: 'X', direccion: 'otro', monto_total_centavos: 100, num_cuotas: 1, moneda: 'BOB' })).toThrow(/direccion/)
    expect(() => parseDeuda({ contraparte: 'X', direccion: 'por_pagar', monto_total_centavos: 0, num_cuotas: 1, moneda: 'BOB' })).toThrow(/monto_total/)
    expect(() => parseDeuda({ contraparte: 'X', direccion: 'por_pagar', monto_total_centavos: 100, num_cuotas: 0, moneda: 'BOB' })).toThrow(/num_cuotas/)
    const d = parseDeuda({ contraparte: '  Banco  ', direccion: 'por_pagar', monto_total_centavos: 10000, num_cuotas: 3, moneda: 'BOB', fecha_inicio: '2026-09-01' })
    expect(d.contraparte).toBe('Banco')
  })

  it('parsePago exige cuenta y valida tasa', () => {
    expect(() => parsePago({})).toThrow(/cuenta_id/)
    expect(() => parsePago({ cuenta_id: 1, monto_centavos: 0 })).toThrow(/monto_centavos/)
    expect(parsePago({ cuenta_id: 1, tasa_ref: '6,96' }).tasa_ref).toBe(6.96)
    expect(parsePago({ cuenta_id: 1 }).otra_cuenta_id).toBeNull()
    expect(parsePago({ cuenta_id: 1, otra_cuenta_id: '2' }).otra_cuenta_id).toBe(2)
    expect(() => parsePago({ cuenta_id: 1, otra_cuenta_id: 0 })).toThrow(/otra_cuenta_id/)
  })
})
