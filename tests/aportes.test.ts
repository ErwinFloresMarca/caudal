import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones } from '../server/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta, getCuenta } from '../server/utils/cuentas'
import { listarTransacciones } from '../server/utils/transacciones'
import { parseAporte, crearAporte, getAporte, listarAportes, editarAporte, borrarAporte } from '../server/utils/aportes'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let fondoPersonalId: number
let fondoNegocioId: number
let personalEfectivoId: number
let personalBancoId: number
let negocioCajaId: number
let negocioUsdId: number
let cuentaOtroId: number

async function saldo(userIdArg: number, cuentaId: number) {
  return (await getCuenta(userIdArg, cuentaId))!.saldo_actual_centavos
}

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `aporte-${randomUUID()}@test.dev`, name: 'Aportes' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `aporte-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id

  const personal = await crearFondo(userId, { nombre: 'Personal', tipo: 'personal', moneda_base: 'BOB' })
  const negocio = await crearFondo(userId, { nombre: 'Negocio', tipo: 'negocio', moneda_base: 'BOB' })
  fondoPersonalId = personal.id
  fondoNegocioId = negocio.id

  personalEfectivoId = (await crearCuenta(userId, fondoPersonalId, { nombre: 'Efectivo', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 500000 })).id
  personalBancoId = (await crearCuenta(userId, fondoPersonalId, { nombre: 'Banco', tipo: 'banco', moneda: 'BOB', saldo_inicial_centavos: 0 })).id
  negocioCajaId = (await crearCuenta(userId, fondoNegocioId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 0 })).id
  negocioUsdId = (await crearCuenta(userId, fondoNegocioId, { nombre: 'Ahorro USD', tipo: 'ahorro', moneda: 'USD', saldo_inicial_centavos: 0 })).id

  const fondoOtro = await crearFondo(userIdOtro, { nombre: 'Ajeno', tipo: 'personal', moneda_base: 'BOB' })
  cuentaOtroId = (await crearCuenta(userIdOtro, fondoOtro.id, { nombre: 'Caja ajena', tipo: 'efectivo', moneda: 'BOB' })).id
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
  await db.delete(users).where(eq(users.id, userId))
  await db.delete(users).where(eq(users.id, userIdOtro))
})

describe.skipIf(!hasDb)('aportes/retiros entre fondos', () => {
  it('aporte personal → negocio de Bs 500: ingreso en destino, gasto en origen, mismo grupo_id', async () => {
    const persAntes = await saldo(userId, personalEfectivoId)
    const negAntes = await saldo(userId, negocioCajaId)

    const a = await crearAporte(userId, {
      cuenta_destino_id: negocioCajaId,
      monto_destino_centavos: 50000,
      cuenta_origen_id: personalEfectivoId,
      fecha: '2026-09-20',
      nota: 'Aporte inicial',
    })

    expect(a.destino!.monto_centavos).toBe(50000)
    expect(a.destino!.moneda).toBe('BOB')
    expect(a.destino!.monto_formateado).toBe('Bs 500,00')
    expect(a.origen!.monto_centavos).toBe(50000)
    expect(a.origen!.monto_formateado).toBe('Bs 500,00')

    const legs = await db
      .select()
      .from(transacciones)
      .where(and(eq(transacciones.user_id, userId), eq(transacciones.grupo_id, a.grupo_id)))
    expect(legs.length).toBe(2)
    expect(new Set(legs.map((l) => l.grupo_id)).size).toBe(1)

    expect(await saldo(userId, negocioCajaId)).toBe(negAntes + 50000)
    expect(await saldo(userId, personalEfectivoId)).toBe(persAntes - 50000)

    // Se puede leer el aporte por cualquiera de sus patas.
    const porPata = await getAporte(userId, a.origen!.transaccion_id)
    expect(porPata!.grupo_id).toBe(a.grupo_id)
  })

  it('retiro negocio → personal hace el efecto simétrico', async () => {
    const persAntes = await saldo(userId, personalBancoId)
    const negAntes = await saldo(userId, negocioCajaId)

    const a = await crearAporte(userId, {
      cuenta_destino_id: personalBancoId,
      monto_destino_centavos: 20000,
      cuenta_origen_id: negocioCajaId,
      fecha: '2026-09-20',
    })

    expect(a.destino!.monto_centavos).toBe(20000)
    expect(await saldo(userId, personalBancoId)).toBe(persAntes + 20000)
    expect(await saldo(userId, negocioCajaId)).toBe(negAntes - 20000)
  })

  it('en el reporte el destino cuenta como ingreso y el origen como gasto (no transferencia neutral)', async () => {
    const a = await crearAporte(userId, {
      cuenta_destino_id: negocioCajaId,
      monto_destino_centavos: 30000,
      cuenta_origen_id: personalEfectivoId,
      fecha: '2026-09-15',
    })

    const destino = await listarTransacciones(userId, fondoNegocioId, { desde: '2026-09-15', hasta: '2026-09-15' })
    const origen = await listarTransacciones(userId, fondoPersonalId, { desde: '2026-09-15', hasta: '2026-09-15' })
    expect(destino.find((t) => t.id === a.destino!.transaccion_id)?.tipo).toBe('ingreso')
    expect(origen.find((t) => t.id === a.origen!.transaccion_id)?.tipo).toBe('gasto')
  })

  it('borrar la operación elimina ambas patas y restaura ambos fondos', async () => {
    const persAntes = await saldo(userId, personalEfectivoId)
    const negAntes = await saldo(userId, negocioCajaId)

    const a = await crearAporte(userId, {
      cuenta_destino_id: negocioCajaId,
      monto_destino_centavos: 40000,
      cuenta_origen_id: personalEfectivoId,
      fecha: '2026-09-14',
    })
    await borrarAporte(userId, a.grupo_id)

    expect(await saldo(userId, personalEfectivoId)).toBe(persAntes)
    expect(await saldo(userId, negocioCajaId)).toBe(negAntes)
    expect(await getAporte(userId, a.grupo_id)).toBeNull()
    const legs = await db
      .select()
      .from(transacciones)
      .where(and(eq(transacciones.user_id, userId), eq(transacciones.grupo_id, a.grupo_id)))
    expect(legs.length).toBe(0)
  })

  it('aporte externo (sin fondo origen) solo crea la pata de ingreso', async () => {
    const negAntes = await saldo(userId, negocioCajaId)
    const a = await crearAporte(userId, {
      cuenta_destino_id: negocioCajaId,
      monto_destino_centavos: 15000,
      fecha: '2026-09-13',
    })

    expect(a.origen).toBeNull()
    expect(a.destino!.monto_centavos).toBe(15000)
    expect(await saldo(userId, negocioCajaId)).toBe(negAntes + 15000)

    const legs = await db
      .select()
      .from(transacciones)
      .where(and(eq(transacciones.user_id, userId), eq(transacciones.grupo_id, a.grupo_id)))
    expect(legs.length).toBe(1)
    expect(legs[0]!.tipo).toBe('ingreso')
  })

  it('multimoneda: pata destino USD guarda tasa_ref y deriva el monto BOB de origen', async () => {
    const a = await crearAporte(userId, {
      cuenta_destino_id: negocioUsdId,
      monto_destino_centavos: 10000,
      cuenta_origen_id: personalEfectivoId,
      tasa_ref: 6.96,
      fecha: '2026-09-12',
    })

    expect(a.destino!.moneda).toBe('USD')
    expect(a.destino!.tasa_ref).toBe(6.96)
    expect(a.destino!.monto_formateado).toBe('US$ 100,00')
    expect(a.origen!.moneda).toBe('BOB')
    expect(a.origen!.monto_centavos).toBe(69600)
    expect(a.origen!.tasa_ref).toBeNull()

    await expect(
      crearAporte(userId, { cuenta_destino_id: negocioUsdId, monto_destino_centavos: 10000 }),
    ).rejects.toMatchObject({ statusCode: 400, message: /tasa_ref/ })
  })

  it('valida en el servidor: fondos distintos, cuentas distintas y cuenta ajena', async () => {
    await expect(
      crearAporte(userId, { cuenta_destino_id: personalBancoId, monto_destino_centavos: 100, cuenta_origen_id: personalEfectivoId }),
    ).rejects.toMatchObject({ statusCode: 400, message: /fondos distintos/ })

    await expect(
      crearAporte(userId, { cuenta_destino_id: negocioCajaId, monto_destino_centavos: 100, cuenta_origen_id: negocioCajaId }),
    ).rejects.toMatchObject({ statusCode: 400, message: /misma/ })

    await expect(
      crearAporte(userId, { cuenta_destino_id: cuentaOtroId, monto_destino_centavos: 100 }),
    ).rejects.toMatchObject({ statusCode: 400, message: /Cuenta destino no encontrada/ })
  })

  it('editar actualiza ambas patas y no permite cambiar de cuentas', async () => {
    const a = await crearAporte(userId, {
      cuenta_destino_id: negocioCajaId,
      monto_destino_centavos: 10000,
      cuenta_origen_id: personalEfectivoId,
      fecha: '2026-09-11',
    })

    const editada = await editarAporte(userId, a.grupo_id, {
      cuenta_destino_id: negocioCajaId,
      monto_destino_centavos: 25000,
      cuenta_origen_id: personalEfectivoId,
      fecha: '2026-09-10',
      nota: 'corregido',
    })
    expect(editada!.destino!.monto_centavos).toBe(25000)
    expect(editada!.origen!.monto_centavos).toBe(25000)
    expect(editada!.fecha).toBe('2026-09-10')
    expect(editada!.nota).toBe('corregido')

    await expect(
      editarAporte(userId, a.grupo_id, { cuenta_destino_id: personalEfectivoId, monto_destino_centavos: 100, cuenta_origen_id: negocioCajaId }),
    ).rejects.toMatchObject({ statusCode: 400, message: /No se pueden cambiar/ })

    await borrarAporte(userId, a.grupo_id)
  })

  it('aislamiento: otro usuario no ve ni borra mis aportes', async () => {
    const a = await crearAporte(userId, {
      cuenta_destino_id: negocioCajaId,
      monto_destino_centavos: 5000,
      cuenta_origen_id: personalEfectivoId,
      fecha: '2026-09-09',
    })
    expect(await getAporte(userIdOtro, a.grupo_id)).toBeNull()
    await expect(borrarAporte(userIdOtro, a.grupo_id)).rejects.toMatchObject({ statusCode: 404 })
    expect((await listarAportes(userIdOtro, fondoNegocioId)).length).toBe(0)
    await borrarAporte(userId, a.grupo_id)
  })

  it('el listado del fondo activo incluye las operaciones que lo tocan', async () => {
    const a = await crearAporte(userId, {
      cuenta_destino_id: negocioCajaId,
      monto_destino_centavos: 7000,
      cuenta_origen_id: personalEfectivoId,
      fecha: '2026-09-08',
    })
    const enPersonal = await listarAportes(userId, fondoPersonalId)
    const enNegocio = await listarAportes(userId, fondoNegocioId)
    expect(enPersonal.some((x) => x.grupo_id === a.grupo_id)).toBe(true)
    expect(enNegocio.some((x) => x.grupo_id === a.grupo_id)).toBe(true)
    await borrarAporte(userId, a.grupo_id)
  })

  it('crea la categoría de sistema "Aporte recibido" una sola vez por fondo', async () => {
    await crearAporte(userId, { cuenta_destino_id: negocioUsdId, monto_destino_centavos: 100, tasa_ref: 7, fecha: '2026-09-07' })
    await crearAporte(userId, { cuenta_destino_id: negocioUsdId, monto_destino_centavos: 200, tasa_ref: 7, fecha: '2026-09-07' })
    const [n] = await db
      .select({ n: sql<number>`COUNT(*)` })
      .from(categorias)
      .where(and(eq(categorias.user_id, userId), eq(categorias.fondo_id, fondoNegocioId), eq(categorias.nombre, 'Aporte recibido')))
    expect(Number(n?.n)).toBe(1)
  })
})

describe('parseAporte (puro)', () => {
  it('normaliza nota y tasa, y valida montos/cuentas', () => {
    const data = parseAporte({ cuenta_destino_id: 2, monto_destino_centavos: 50000, cuenta_origen_id: 1, tasa_ref: '6,96', nota: '  aporte  ' })
    expect(data.nota).toBe('aporte')
    expect(data.tasa_ref).toBe(6.96)

    expect(() => parseAporte({ cuenta_destino_id: 0, monto_destino_centavos: 100 })).toThrow(/cuenta_destino_id/)
    expect(() => parseAporte({ cuenta_destino_id: 1, monto_destino_centavos: 0 })).toThrow(/monto_destino_centavos/)
    expect(() => parseAporte({ cuenta_destino_id: 1, monto_destino_centavos: 100, fecha: '20/09/2026' })).toThrow(/fecha/)
  })
})
