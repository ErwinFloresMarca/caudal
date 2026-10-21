import { and, eq, inArray, sql } from 'drizzle-orm'
import { db } from './db'
import { presupuestos, categorias, cuentas, transacciones } from '../db/schema'
import { getFondo } from './fondos'
import { hoyLocal } from './transacciones'
import { rangoMes } from '../../shared/resumen'
import { mesesAtras } from '../../shared/reportes'
import { compensar, diasRestantesDelMes, disponible, disponiblePorDia, distribucion503020, estadoPresupuesto } from '../../shared/presupuestos'
import { formatMoney, type Moneda } from '../../shared/money'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

const MES_RE = /^\d{4}-\d{2}$/

export interface DatosPresupuesto {
  categoria_id: number
  mes: string
  monto_limite_centavos: number
}

type FilaPresupuesto = typeof presupuestos.$inferSelect
type FilaCategoria = typeof categorias.$inferSelect

export function parsePresupuesto(body: Record<string, unknown>): DatosPresupuesto {
  const categoria_id = Number(body.categoria_id)
  if (!Number.isInteger(categoria_id) || categoria_id <= 0) {
    throw httpError(400, 'categoria_id es obligatorio')
  }
  const mes = String(body.mes ?? '').trim()
  if (!MES_RE.test(mes)) {
    throw httpError(400, 'mes debe usar formato YYYY-MM')
  }
  const monto_limite_centavos = Number(body.monto_limite_centavos)
  if (!Number.isInteger(monto_limite_centavos) || monto_limite_centavos <= 0) {
    throw httpError(400, 'monto_limite_centavos debe ser un entero positivo')
  }
  return { categoria_id, mes, monto_limite_centavos }
}

export function parseCompensacion(body: Record<string, unknown>) {
  const origen_id = Number(body.origen_id)
  const destino_id = Number(body.destino_id)
  if (!Number.isInteger(origen_id) || origen_id <= 0) throw httpError(400, 'origen_id es obligatorio')
  if (!Number.isInteger(destino_id) || destino_id <= 0) throw httpError(400, 'destino_id es obligatorio')
  if (origen_id === destino_id) throw httpError(400, 'El origen y el destino deben ser distintos')
  const monto = Number(body.monto_centavos)
  if (!Number.isInteger(monto) || monto <= 0) throw httpError(400, 'monto_centavos debe ser un entero positivo')
  return { origen_id, destino_id, monto }
}

// Consumo del mes por categoría: gastos del fondo, en la moneda del presupuesto
// (cuenta.moneda == moneda), sin conversión (SPC-024).
async function consumoPorCategoria(userId: number, fondoId: number, mes: string, moneda: Moneda): Promise<Map<number, number>> {
  const { desde, hasta } = rangoMes(`${mes}-01`)
  const filas = await db
    .select({ categoria_id: transacciones.categoria_id, total: sql<number>`COALESCE(SUM(${transacciones.monto_centavos}), 0)` })
    .from(transacciones)
    .innerJoin(cuentas, eq(cuentas.id, transacciones.cuenta_id))
    .where(
      and(
        eq(transacciones.user_id, userId),
        eq(transacciones.fondo_id, fondoId),
        eq(transacciones.tipo, 'gasto'),
        eq(cuentas.moneda, moneda),
        sql`${transacciones.fecha} >= ${desde}`,
        sql`${transacciones.fecha} <= ${hasta}`,
      ),
    )
    .groupBy(transacciones.categoria_id)
  const map = new Map<number, number>()
  for (const f of filas) if (f.categoria_id != null) map.set(f.categoria_id, Number(f.total))
  return map
}

function presupuestoPublico(p: FilaPresupuesto, cat: FilaCategoria, consumido: number, diasRestantes: number) {
  const moneda = p.moneda as Moneda
  const limite = p.monto_limite_centavos
  const restante = disponible(consumido, limite)
  const porDia = disponiblePorDia(consumido, limite, diasRestantes)
  return {
    id: p.id,
    fondo_id: p.fondo_id,
    categoria_id: p.categoria_id,
    mes: p.mes,
    moneda,
    monto_limite_centavos: limite,
    monto_limite_formateado: formatMoney({ centavos: limite, moneda }),
    consumido_centavos: consumido,
    consumido_formateado: formatMoney({ centavos: consumido, moneda }),
    disponible_centavos: restante,
    disponible_formateado: formatMoney({ centavos: restante, moneda }),
    excedido_centavos: Math.max(0, consumido - limite),
    excedido_formateado: formatMoney({ centavos: Math.max(0, consumido - limite), moneda }),
    porcentaje: limite > 0 ? Math.round((consumido / limite) * 100) : consumido > 0 ? 100 : 0,
    estado: estadoPresupuesto(consumido, limite),
    disponible_por_dia_centavos: porDia,
    disponible_por_dia_formateado: formatMoney({ centavos: porDia, moneda }),
    categoria: { id: cat.id, nombre: cat.nombre, icono: cat.icono, color: cat.color },
  }
}

// Histórico de los últimos 6 meses: asignado vs gasto real del fondo/moneda.
async function historialMeses(userId: number, fondoId: number, mes: string, moneda: Moneda) {
  const meses = mesesAtras(`${mes}-01`, 6)
  const desde = `${meses[0]!}-01`
  const { hasta } = rangoMes(`${mes}-01`)

  const asignadoPorMes = new Map<string, number>()
  const filasAsignado = await db
    .select({ mes: presupuestos.mes, total: sql<number>`COALESCE(SUM(${presupuestos.monto_limite_centavos}), 0)` })
    .from(presupuestos)
    .where(and(eq(presupuestos.user_id, userId), eq(presupuestos.fondo_id, fondoId), inArray(presupuestos.mes, meses)))
    .groupBy(presupuestos.mes)
  for (const f of filasAsignado) asignadoPorMes.set(f.mes, Number(f.total))

  const gastoPorMes = new Map<string, number>()
  const filasGasto = await db
    .select({ mes: sql<string>`to_char(${transacciones.fecha}, 'YYYY-MM')`, total: sql<number>`COALESCE(SUM(${transacciones.monto_centavos}), 0)` })
    .from(transacciones)
    .innerJoin(cuentas, eq(cuentas.id, transacciones.cuenta_id))
    .where(
      and(
        eq(transacciones.user_id, userId),
        eq(transacciones.fondo_id, fondoId),
        eq(transacciones.tipo, 'gasto'),
        eq(cuentas.moneda, moneda),
        sql`${transacciones.fecha} >= ${desde}`,
        sql`${transacciones.fecha} <= ${hasta}`,
      ),
    )
    .groupBy(sql`to_char(${transacciones.fecha}, 'YYYY-MM')`)
  for (const f of filasGasto) gastoPorMes.set(f.mes, Number(f.total))

  return meses.map((m) => {
    const asignado = asignadoPorMes.get(m) ?? 0
    const gastado = gastoPorMes.get(m) ?? 0
    return {
      mes: m,
      asignado_centavos: asignado,
      gastado_centavos: gastado,
      porcentaje: asignado > 0 ? Math.round((gastado / asignado) * 100) : 0,
    }
  })
}

// Ingresos del mes del fondo en su moneda base (misma regla que el consumo: sin conversión).
async function ingresosMes(userId: number, fondoId: number, mes: string, moneda: Moneda): Promise<number> {
  const { desde, hasta } = rangoMes(`${mes}-01`)
  const [fila] = await db
    .select({ total: sql<number>`COALESCE(SUM(${transacciones.monto_centavos}), 0)` })
    .from(transacciones)
    .innerJoin(cuentas, eq(cuentas.id, transacciones.cuenta_id))
    .where(
      and(
        eq(transacciones.user_id, userId),
        eq(transacciones.fondo_id, fondoId),
        eq(transacciones.tipo, 'ingreso'),
        eq(cuentas.moneda, moneda),
        sql`${transacciones.fecha} >= ${desde}`,
        sql`${transacciones.fecha} <= ${hasta}`,
      ),
    )
  return Number(fila?.total ?? 0)
}

async function gastosPorClasificacion(userId: number, fondoId: number, mes: string, moneda: Moneda) {
  const { desde, hasta } = rangoMes(`${mes}-01`)
  const filas = await db
    .select({ clasificacion: categorias.clasificacion, total: sql<number>`COALESCE(SUM(${transacciones.monto_centavos}), 0)` })
    .from(transacciones)
    .innerJoin(cuentas, eq(cuentas.id, transacciones.cuenta_id))
    .leftJoin(categorias, eq(categorias.id, transacciones.categoria_id))
    .where(
      and(
        eq(transacciones.user_id, userId),
        eq(transacciones.fondo_id, fondoId),
        eq(transacciones.tipo, 'gasto'),
        eq(cuentas.moneda, moneda),
        sql`${transacciones.fecha} >= ${desde}`,
        sql`${transacciones.fecha} <= ${hasta}`,
      ),
    )
    .groupBy(categorias.clasificacion)
  const montos = { necesidad: 0, deseo: 0, ahorro: 0, sin_clasificar: 0 }
  for (const f of filas) {
    const monto = Number(f.total)
    if (f.clasificacion === 'necesidad' || f.clasificacion === 'deseo' || f.clasificacion === 'ahorro') montos[f.clasificacion] += monto
    else montos.sin_clasificar += monto
  }
  return montos
}

export async function listarPresupuestos(userId: number, fondoId: number, mes: string) {
  if (!MES_RE.test(mes)) throw httpError(400, 'mes debe usar formato YYYY-MM')
  const fondo = await getFondo(userId, fondoId)
  if (!fondo) throw httpError(404, 'Fondo no encontrado')
  const moneda = fondo.moneda_base as Moneda

  const filas = await db
    .select({ p: presupuestos, cat: categorias })
    .from(presupuestos)
    .innerJoin(categorias, eq(categorias.id, presupuestos.categoria_id))
    .where(and(eq(presupuestos.user_id, userId), eq(presupuestos.fondo_id, fondoId), eq(presupuestos.mes, mes)))
    .orderBy(categorias.nombre, presupuestos.id)

  const consumo = await consumoPorCategoria(userId, fondoId, mes, moneda)
  const dias = diasRestantesDelMes(mes, hoyLocal())
  const items = filas.map((f) => presupuestoPublico(f.p, f.cat, consumo.get(f.p.categoria_id) ?? 0, dias))

  const asignado = items.reduce((s, i) => s + i.monto_limite_centavos, 0)
  const consumido = items.reduce((s, i) => s + i.consumido_centavos, 0)
  const restante = disponible(consumido, asignado)

  const ingresos = await ingresosMes(userId, fondoId, mes, moneda)
  const montos = await gastosPorClasificacion(userId, fondoId, mes, moneda)
  const base = distribucion503020(ingresos, montos)

  return {
    mes,
    moneda,
    dias_restantes: dias,
    kpis: {
      asignado_centavos: asignado,
      asignado_formateado: formatMoney({ centavos: asignado, moneda }),
      consumido_centavos: consumido,
      consumido_formateado: formatMoney({ centavos: consumido, moneda }),
      disponible_centavos: restante,
      disponible_formateado: formatMoney({ centavos: restante, moneda }),
      gasto_diario_permitido_centavos: disponiblePorDia(consumido, asignado, dias),
      gasto_diario_permitido_formateado: formatMoney({ centavos: disponiblePorDia(consumido, asignado, dias), moneda }),
    },
    presupuestos: items,
    historial: await historialMeses(userId, fondoId, mes, moneda),
    distribucion: {
      ...base,
      ingresos_formateado: formatMoney({ centavos: ingresos, moneda }),
      sin_clasificar_formateado: formatMoney({ centavos: base.sin_clasificar_centavos, moneda }),
      tramos: base.tramos.map((t) => ({ ...t, formateado: formatMoney({ centavos: t.centavos, moneda }) })),
    },
  }
}

export async function getPresupuesto(userId: number, id: number) {
  const [fila] = await db
    .select({ p: presupuestos, cat: categorias })
    .from(presupuestos)
    .innerJoin(categorias, eq(categorias.id, presupuestos.categoria_id))
    .where(and(eq(presupuestos.id, id), eq(presupuestos.user_id, userId)))
    .limit(1)
  if (!fila) return null
  const consumo = await consumoPorCategoria(userId, fila.p.fondo_id, fila.p.mes, fila.p.moneda as Moneda)
  const dias = diasRestantesDelMes(fila.p.mes, hoyLocal())
  return presupuestoPublico(fila.p, fila.cat, consumo.get(fila.p.categoria_id) ?? 0, dias)
}

export async function crearPresupuesto(userId: number, fondoId: number, data: DatosPresupuesto) {
  const fondo = await getFondo(userId, fondoId)
  if (!fondo) throw httpError(404, 'Fondo no encontrado')

  const [cat] = await db
    .select({ id: categorias.id, tipo: categorias.tipo })
    .from(categorias)
    .where(and(eq(categorias.id, data.categoria_id), eq(categorias.user_id, userId), eq(categorias.fondo_id, fondoId)))
    .limit(1)
  if (!cat) throw httpError(400, 'Categoría no encontrada en este fondo')
  if (cat.tipo !== 'gasto') throw httpError(400, 'Solo se presupuestan categorías de gasto')

  const moneda = fondo.moneda_base as Moneda
  const [row] = await db
    .insert(presupuestos)
    .values({
      user_id: userId,
      fondo_id: fondoId,
      categoria_id: data.categoria_id,
      mes: data.mes,
      moneda,
      monto_limite_centavos: data.monto_limite_centavos,
    })
    .onConflictDoUpdate({
      target: [presupuestos.fondo_id, presupuestos.categoria_id, presupuestos.mes],
      set: { monto_limite_centavos: data.monto_limite_centavos, moneda },
    })
    .returning({ id: presupuestos.id })
  if (!row) throw httpError(500, 'No se pudo guardar el presupuesto')
  return getPresupuesto(userId, row.id)
}

export async function editarPresupuesto(userId: number, id: number, data: { monto_limite_centavos?: number }) {
  const [p] = await db.select().from(presupuestos).where(and(eq(presupuestos.id, id), eq(presupuestos.user_id, userId))).limit(1)
  if (!p) throw httpError(404, 'Presupuesto no encontrado')
  if (data.monto_limite_centavos != null) {
    if (!Number.isInteger(data.monto_limite_centavos) || data.monto_limite_centavos <= 0) {
      throw httpError(400, 'monto_limite_centavos debe ser un entero positivo')
    }
    await db.update(presupuestos).set({ monto_limite_centavos: data.monto_limite_centavos }).where(eq(presupuestos.id, id))
  }
  return getPresupuesto(userId, id)
}

export async function borrarPresupuesto(userId: number, id: number) {
  const [p] = await db.select().from(presupuestos).where(and(eq(presupuestos.id, id), eq(presupuestos.user_id, userId))).limit(1)
  if (!p) throw httpError(404, 'Presupuesto no encontrado')
  await db.delete(presupuestos).where(eq(presupuestos.id, id))
  return { id: p.id, eliminado: true }
}

// Compensar: mueve monto de un presupuesto a otro (mismo fondo y mes) sin cambiar el total.
export async function compensarPresupuesto(userId: number, data: { origen_id: number; destino_id: number; monto: number }) {
  const [origen] = await db.select().from(presupuestos).where(and(eq(presupuestos.id, data.origen_id), eq(presupuestos.user_id, userId))).limit(1)
  const [destino] = await db.select().from(presupuestos).where(and(eq(presupuestos.id, data.destino_id), eq(presupuestos.user_id, userId))).limit(1)
  if (!origen) throw httpError(404, 'Presupuesto de origen no encontrado')
  if (!destino) throw httpError(404, 'Presupuesto de destino no encontrado')
  if (origen.fondo_id !== destino.fondo_id || origen.mes !== destino.mes) {
    throw httpError(400, 'Los presupuestos deben ser del mismo fondo y mes')
  }

  const consumo = await consumoPorCategoria(userId, origen.fondo_id, origen.mes, origen.moneda as Moneda)
  let nuevos: { limite_origen: number; limite_destino: number }
  try {
    nuevos = compensar(
      { limite: origen.monto_limite_centavos, consumido: consumo.get(origen.categoria_id) ?? 0 },
      { limite: destino.monto_limite_centavos, consumido: consumo.get(destino.categoria_id) ?? 0 },
      data.monto,
    )
  } catch (e) {
    throw httpError(400, (e as Error).message)
  }

  await db.transaction(async (tx) => {
    await tx.update(presupuestos).set({ monto_limite_centavos: nuevos.limite_origen }).where(eq(presupuestos.id, origen.id))
    await tx.update(presupuestos).set({ monto_limite_centavos: nuevos.limite_destino }).where(eq(presupuestos.id, destino.id))
  })

  return listarPresupuestos(userId, origen.fondo_id, origen.mes)
}
