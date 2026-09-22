import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { db } from '../server/utils/db'
import { users, fondos, cuentas, categorias, transacciones, presupuestos, settings } from '../server/db/schema'
import { eq } from 'drizzle-orm'
import { crearFondo } from '../server/utils/fondos'
import { crearCuenta } from '../server/utils/cuentas'
import { listarCategorias } from '../server/utils/categorias'
import { crearTransaccion, hoyLocal } from '../server/utils/transacciones'
import {
  parsePresupuesto,
  crearPresupuesto,
  listarPresupuestos,
  editarPresupuesto,
  borrarPresupuesto,
  compensarPresupuesto,
} from '../server/utils/presupuestos'
import { estadoPresupuesto, disponible, disponiblePorDia, compensar, diasRestantesDelMes } from '#shared/presupuestos'

const hasDb = Boolean(process.env.DATABASE_URL)

let userId: number
let fondoId: number
let cuentaId: number
let catComidaId: number
let catTransporteId: number
let catIngresoId: number

const hoy = hoyLocal()
const mes = hoy.slice(0, 7)

beforeAll(async () => {
  if (!hasDb) return
  const [u] = await db.insert(users).values({ email: `presu-${randomUUID()}@test.dev`, name: 'Presupuestos' }).returning({ id: users.id })
  userId = u.id
  const fondo = await crearFondo(userId, { nombre: 'Fondo Presu', tipo: 'personal', moneda_base: 'BOB' })
  fondoId = fondo.id
  cuentaId = (await crearCuenta(userId, fondoId, { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB' })).id

  const cats = await listarCategorias(userId, fondoId)
  catComidaId = cats.find((c) => c.nombre === 'Comida')!.id
  catTransporteId = cats.find((c) => c.nombre === 'Transporte')!.id
  catIngresoId = cats.find((c) => c.tipo === 'ingreso')!.id
})

afterAll(async () => {
  if (!hasDb) return
  await db.delete(presupuestos).where(eq(presupuestos.user_id, userId))
  await db.delete(transacciones).where(eq(transacciones.user_id, userId))
  await db.delete(cuentas).where(eq(cuentas.user_id, userId))
  await db.delete(categorias).where(eq(categorias.user_id, userId))
  await db.delete(fondos).where(eq(fondos.user_id, userId))
  await db.delete(settings).where(eq(settings.user_id, userId))
  await db.delete(users).where(eq(users.id, userId))
})

describe('presupuestos (puro)', () => {
  it('estadoPresupuesto: alerta exactamente desde 80%, sobregiro desde >100%', () => {
    expect(estadoPresupuesto(79999, 100000)).toBe('en_ritmo')
    expect(estadoPresupuesto(80000, 100000)).toBe('alerta')
    expect(estadoPresupuesto(100000, 100000)).toBe('alerta')
    expect(estadoPresupuesto(100001, 100000)).toBe('sobregiro')
  })

  it('disponiblePorDia protege días=0 y límite alcanzado', () => {
    expect(disponible(30000, 100000)).toBe(70000)
    expect(disponible(30000, 30000)).toBe(0)
    expect(disponiblePorDia(0, 30000, 10)).toBe(3000)
    expect(disponiblePorDia(0, 30000, 0)).toBe(0)
    expect(disponiblePorDia(30000, 30000, 5)).toBe(0)
  })

  it('compensar mueve monto y no permite dejar negativo ni bajo lo consumido', () => {
    expect(compensar({ limite: 100000, consumido: 20000 }, { limite: 50000, consumido: 0 }, 30000)).toEqual({
      limite_origen: 70000,
      limite_destino: 80000,
    })
    expect(() => compensar({ limite: 100000, consumido: 90000 }, { limite: 50000, consumido: 0 }, 20000)).toThrow(/consumido/)
    expect(() => compensar({ limite: 10000, consumido: 0 }, { limite: 50000, consumido: 0 }, 20000)).toThrow(/negativo/)
    expect(() => compensar({ limite: 100000, consumido: 0 }, { limite: 50000, consumido: 0 }, 0)).toThrow(/positivo/)
  })

  it('diasRestantesDelMes incluye hoy y maneja meses pasados/futuros', () => {
    expect(diasRestantesDelMes('2026-09', '2026-09-28')).toBe(3)
    expect(diasRestantesDelMes('2026-08', '2026-09-15')).toBe(0)
    expect(diasRestantesDelMes('2026-10', '2026-09-15')).toBe(31)
  })
})

describe.skipIf(!hasDb)('presupuestos (repositorio)', () => {
  it('asigna un presupuesto a una categoría de gasto y aparece con progreso 0', async () => {
    const p = await crearPresupuesto(userId, fondoId, { categoria_id: catComidaId, mes, monto_limite_centavos: 100000 })
    expect(p!.porcentaje).toBe(0)
    expect(p!.estado).toBe('en_ritmo')
    expect(p!.monto_limite_formateado).toBe('Bs 1.000,00')

    const lista = await listarPresupuestos(userId, fondoId, mes)
    expect(lista.presupuestos.some((x) => x.id === p!.id)).toBe(true)

    await expect(
      crearPresupuesto(userId, fondoId, { categoria_id: catIngresoId, mes, monto_limite_centavos: 1000 }),
    ).rejects.toMatchObject({ statusCode: 400, message: /gasto/ })
  })

  it('se consume con transacciones del fondo y mes; 80% marca alerta y el exceso sobregiro', async () => {
    await crearTransaccion(userId, fondoId, { cuenta_id: cuentaId, categoria_id: catComidaId, tipo: 'gasto', monto_centavos: 79000, fecha: hoy })
    let comida = (await listarPresupuestos(userId, fondoId, mes)).presupuestos.find((x) => x.categoria_id === catComidaId)!
    expect(comida.estado).toBe('en_ritmo')
    expect(comida.consumido_centavos).toBe(79000)

    await crearTransaccion(userId, fondoId, { cuenta_id: cuentaId, categoria_id: catComidaId, tipo: 'gasto', monto_centavos: 1000, fecha: hoy })
    comida = (await listarPresupuestos(userId, fondoId, mes)).presupuestos.find((x) => x.categoria_id === catComidaId)!
    expect(comida.porcentaje).toBe(80)
    expect(comida.estado).toBe('alerta')

    await crearTransaccion(userId, fondoId, { cuenta_id: cuentaId, categoria_id: catComidaId, tipo: 'gasto', monto_centavos: 30000, fecha: hoy })
    comida = (await listarPresupuestos(userId, fondoId, mes)).presupuestos.find((x) => x.categoria_id === catComidaId)!
    expect(comida.estado).toBe('sobregiro')
    expect(comida.excedido_centavos).toBe(10000)
  })

  it('los KPIs cuadran: asignado, consumido y disponible', async () => {
    const p = await listarPresupuestos(userId, fondoId, mes)
    expect(p.kpis.asignado_centavos).toBe(100000)
    expect(p.kpis.consumido_centavos).toBe(110000)
    expect(p.kpis.disponible_centavos).toBe(0)
    expect(p.historial.length).toBe(6)
    expect(p.historial.at(-1)!.mes).toBe(mes)
  })

  it('compensar mueve monto entre categorías sin cambiar el total asignado', async () => {
    const transporte = await crearPresupuesto(userId, fondoId, { categoria_id: catTransporteId, mes, monto_limite_centavos: 50000 })
    const res = await compensarPresupuesto(userId, { origen_id: transporte!.id, destino_id: (await listarPresupuestos(userId, fondoId, mes)).presupuestos.find((x) => x.categoria_id === catComidaId)!.id, monto: 20000 })

    const comida = res.presupuestos.find((x) => x.categoria_id === catComidaId)!
    const transp = res.presupuestos.find((x) => x.categoria_id === catTransporteId)!
    expect(comida.monto_limite_centavos).toBe(120000)
    expect(transp.monto_limite_centavos).toBe(30000)
    expect(res.kpis.asignado_centavos).toBe(150000)

    await expect(
      compensarPresupuesto(userId, { origen_id: transp.id, destino_id: comida.id, monto: 40000 }),
    ).rejects.toMatchObject({ statusCode: 400, message: /consumido/ })
  })

  it('editar y borrar', async () => {
    const p = await crearPresupuesto(userId, fondoId, { categoria_id: catTransporteId, mes, monto_limite_centavos: 50000 })
    const editado = await editarPresupuesto(userId, p!.id, { monto_limite_centavos: 80000 })
    expect(editado!.monto_limite_centavos).toBe(80000)
    await borrarPresupuesto(userId, p!.id)
    const lista = await listarPresupuestos(userId, fondoId, mes)
    expect(lista.presupuestos.some((x) => x.id === p!.id)).toBe(false)
  })
})

describe('parsePresupuesto (puro)', () => {
  it('valida mes, categoría y límite', () => {
    expect(() => parsePresupuesto({ categoria_id: 1, mes: '2026-9', monto_limite_centavos: 100 })).toThrow(/mes/)
    expect(() => parsePresupuesto({ categoria_id: 0, mes: '2026-09', monto_limite_centavos: 100 })).toThrow(/categoria_id/)
    expect(() => parsePresupuesto({ categoria_id: 1, mes: '2026-09', monto_limite_centavos: 0 })).toThrow(/monto_limite/)
  })
})
