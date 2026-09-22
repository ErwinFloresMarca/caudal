import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, settings } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { crearTransaccion, buscarTransacciones } from '../server/utils/transacciones'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let userIdOtro: number
let fondoAId: number
let fondoBId: number
let cuentaABobId: number
let cuentaAUsdId: number
let cuentaBBobId: number
let catComidaId: number
let catOcioId: number
let catSueldoId: number

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `bus-${randomUUID()}@test.dev`, name: 'Busqueda' }).returning({ id: users.id })
  const [o] = await db.insert(users).values({ email: `bus-otro-${randomUUID()}@test.dev`, name: 'Otro' }).returning({ id: users.id })
  userId = u.id
  userIdOtro = o.id

  const a = await crearFondo(userId, { nombre: 'Personal', tipo: 'personal', moneda_base: 'BOB' })
  const b = await crearFondo(userId, { nombre: 'Negocio', tipo: 'negocio', moneda_base: 'BOB' })
  fondoAId = a.id
  fondoBId = b.id

  cuentaABobId = (await crearCuenta(userId, fondoAId, { nombre: 'Efectivo', tipo: 'efectivo', moneda: 'BOB' })).id
  cuentaAUsdId = (await crearCuenta(userId, fondoAId, { nombre: 'USD', tipo: 'ahorro', moneda: 'USD' })).id
  cuentaBBobId = (await crearCuenta(userId, fondoBId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB' })).id

  const catsA = await listarCategorias(userId, fondoAId)
  catComidaId = catsA.find((c) => c.nombre === 'Comida')!.id
  catOcioId = catsA.find((c) => c.nombre === 'Ocio')!.id
  catSueldoId = catsA.find((c) => c.nombre === 'Sueldo')!.id

  await crearTransaccion(userId, fondoAId, { cuenta_id: cuentaABobId, categoria_id: catComidaId, tipo: 'gasto', monto_centavos: 80000, fecha: '2026-09-10', nota: 'Pago a la imprenta' })
  await crearTransaccion(userId, fondoAId, { cuenta_id: cuentaABobId, categoria_id: catComidaId, tipo: 'gasto', monto_centavos: 1250, fecha: '2026-09-12', nota: 'Almuerzo' })
  await crearTransaccion(userId, fondoAId, { cuenta_id: cuentaABobId, categoria_id: catSueldoId, tipo: 'ingreso', monto_centavos: 450000, fecha: '2026-09-01', nota: 'Sueldo septiembre' })
  await crearTransaccion(userId, fondoAId, { cuenta_id: cuentaAUsdId, categoria_id: catOcioId, tipo: 'gasto', monto_centavos: 3500, tasa_ref: 6.96, fecha: '2026-09-05', nota: 'Streaming' })
  await crearTransaccion(userId, fondoAId, { cuenta_id: cuentaABobId, categoria_id: catComidaId, tipo: 'gasto', monto_centavos: 25000, fecha: '2026-09-20', nota: 'Mercado', fuente: 'recurrente' })
  await crearTransaccion(userId, fondoBId, { cuenta_id: cuentaBBobId, tipo: 'gasto', monto_centavos: 30000, fecha: '2026-09-15', nota: 'Insumos taller' })

  // 5 movimientos para el test de paginación
  for (let i = 0; i < 5; i++) {
    await crearTransaccion(userId, fondoAId, { cuenta_id: cuentaABobId, categoria_id: catComidaId, tipo: 'gasto', monto_centavos: 1000 + i, fecha: `2026-08-0${i + 1}`, nota: `pag-${i}` })
  }
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

describe.skipIf(!hasDb)('búsqueda y filtros (SPC-016)', () => {
  it('busca por nota parcial (insensible a mayúsculas)', async () => {
    const r = await buscarTransacciones(userId, { fondoIds: [fondoAId, fondoBId], q: 'imprenta' })
    expect(r.transacciones.length).toBe(1)
    expect(r.transacciones[0]!.nota).toBe('Pago a la imprenta')
  })

  it('busca por nombre de categoría', async () => {
    const r = await buscarTransacciones(userId, { fondoIds: [fondoAId], q: 'comida', tipo: 'gasto' })
    expect(r.transacciones.length).toBeGreaterThanOrEqual(2)
    expect(r.transacciones.every((t) => t.categoria?.nombre === 'Comida')).toBe(true)
  })

  it('combina fondo + categoría + rango de fechas', async () => {
    const r = await buscarTransacciones(userId, { fondoIds: [fondoAId], categoria_id: catComidaId, desde: '2026-09-01', hasta: '2026-09-30' })
    expect(r.transacciones.every((t) => t.fondo_id === fondoAId && t.categoria?.id === catComidaId)).toBe(true)
    expect(r.transacciones.every((t) => t.fecha >= '2026-09-01' && t.fecha <= '2026-09-30')).toBe(true)
    expect(r.transacciones.some((t) => t.nota === 'Insumos taller')).toBe(false)
  })

  it('filtra por tipo, moneda, monto y fuente', async () => {
    const ingreso = await buscarTransacciones(userId, { fondoIds: [fondoAId], tipo: 'ingreso' })
    expect(ingreso.transacciones.every((t) => t.tipo === 'ingreso')).toBe(true)

    const usd = await buscarTransacciones(userId, { fondoIds: [fondoAId], moneda: 'USD' })
    expect(usd.transacciones.every((t) => t.moneda === 'USD')).toBe(true)

    const rango = await buscarTransacciones(userId, { fondoIds: [fondoAId], monto_min: 10000, monto_max: 50000 })
    expect(rango.transacciones.every((t) => t.monto_centavos >= 10000 && t.monto_centavos <= 50000)).toBe(true)
    expect(rango.transacciones.some((t) => t.nota === 'Pago a la imprenta')).toBe(false)

    const recurrente = await buscarTransacciones(userId, { fondoIds: [fondoAId], fuente: 'recurrente' })
    expect(recurrente.transacciones.length).toBe(1)
    expect(recurrente.transacciones[0]!.nota).toBe('Mercado')
  })

  it('ordena por monto cuando se pide', async () => {
    const r = await buscarTransacciones(userId, { fondoIds: [fondoAId], orden: 'monto', limite: 100 })
    const montos = r.transacciones.map((t) => t.monto_centavos)
    expect(montos).toEqual([...montos].sort((a, b) => b - a))
  })

  it('pagina por cursor sin perder ni repetir filas', async () => {
    const vistos: number[] = []
    let cursor: { valor: string | number; id: number } | undefined
    for (let i = 0; i < 10; i++) {
      const r = await buscarTransacciones(userId, { fondoIds: [fondoAId], q: 'pag-', limite: 2, cursor })
      vistos.push(...r.transacciones.map((t) => t.id))
      if (!r.siguiente_cursor) break
      const [valor, id] = r.siguiente_cursor.split('|')
      cursor = { valor: valor!, id: Number(id) }
    }
    expect(vistos.length).toBe(5)
    expect(new Set(vistos).size).toBe(5)
  })

  it('aísla por usuario', async () => {
    const r = await buscarTransacciones(userIdOtro, { q: 'imprenta' })
    expect(r.transacciones.length).toBe(0)
  })
})
