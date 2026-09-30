import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from './db'
import { transacciones } from '../db/schema'
import { listarCuentas } from './cuentas'
import { getFondo } from './fondos'
import { hoyLocal, listarTransacciones } from './transacciones'
import { listarPendientes } from './recurrentes'
import { proximasCuotas } from './deudas'
import { listarMetas } from './metas'
import { convertToBase, formatMoney, type Moneda } from '../../shared/money'
import { gastosPorCategoria, rangoMes, resumenPeriodo, type MovResumen } from '../../shared/resumen'
import { getTasa } from './ajustes'

// Última tasa USD registrada en el fondo, para consolidar saldos (stock) a BOB.
// Si el fondo no tiene movimientos USD con tasa (p. ej. la cuenta USD se financió solo
// con saldo inicial), cae a la tasa paralelo configurada en Ajustes.
export async function ultimaTasa(userId: number, fondoId: number): Promise<number | null> {
  const [row] = await db
    .select({ tasa_ref: transacciones.tasa_ref })
    .from(transacciones)
    .where(and(eq(transacciones.user_id, userId), eq(transacciones.fondo_id, fondoId), eq(transacciones.moneda, 'USD'), isNotNull(transacciones.tasa_ref)))
    .orderBy(desc(transacciones.fecha), desc(transacciones.id))
    .limit(1)
  if (row?.tasa_ref != null) return row.tasa_ref
  return (await getTasa(userId)).actual?.valor ?? null
}

// Agrega todo lo que el dashboard necesita en una sola pasada de servidor.
// Consolida a la moneda base del fondo (SPC-014/SPC-025).
export async function resumenDashboard(userId: number, fondoId: number) {
  const fondo = await getFondo(userId, fondoId)
  const base: Moneda = fondo?.moneda_base === 'USD' ? 'USD' : 'BOB'
  const cuentas = await listarCuentas(userId, fondoId)

  const porMoneda = new Map<Moneda, number>()
  for (const c of cuentas) {
    const mon = c.moneda as Moneda
    porMoneda.set(mon, (porMoneda.get(mon) ?? 0) + c.saldo_actual_centavos)
  }
  const saldo_por_moneda = [...porMoneda.entries()].map(([moneda, centavos]) => ({
    moneda,
    centavos,
    formateado: formatMoney({ centavos, moneda }),
  }))

  // Consolidar a la base requiere tasa si hay otra moneda; se usa la última del fondo
  // y, si no hay, la configurada en Ajustes (0002).
  const necesitaTasa = [...porMoneda.keys()].some((moneda) => moneda !== base)
  const tasa = necesitaTasa ? await ultimaTasa(userId, fondoId) : null
  let saldo_consolidado = null
  if (!necesitaTasa || tasa != null) {
    const centavos = [...porMoneda.entries()].reduce(
      (s, [moneda, c]) => s + convertToBase({ centavos: c, moneda }, moneda === base ? undefined : (tasa ?? undefined), base).centavos,
      0,
    )
    saldo_consolidado = {
      base,
      centavos,
      formateado: formatMoney({ centavos, moneda: base }),
      tasa_ref: tasa,
      nota: necesitaTasa ? 'Convertido con tasa registrada' : null,
    }
  }

  const hoy = hoyLocal()
  const rango = rangoMes(hoy)
  const movs: MovResumen[] = (await listarTransacciones(userId, fondoId, { desde: rango.desde, hasta: rango.hasta })).map((t) => ({
    tipo: t.tipo as 'ingreso' | 'gasto',
    monto_centavos: t.monto_centavos,
    moneda: t.moneda as Moneda,
    tasa_ref: t.tasa_ref,
    fecha: t.fecha,
    categoria_id: t.categoria?.id ?? null,
    categoria_nombre: t.categoria?.nombre ?? null,
    categoria_icono: t.categoria?.icono ?? null,
    categoria_color: t.categoria?.color ?? null,
  }))

  // Base USD: los movimientos BOB (que no guardan tasa) se convierten con la tasa actual (0002).
  const tasaFallback = base === 'USD' ? (await getTasa(userId)).actual?.valor : undefined
  const mes = resumenPeriodo(movs, { ...rango, base, tasaFallback })
  const categorias = gastosPorCategoria(movs, { ...rango, base, tasaFallback })

  const [recurrentes, cuotas, todasMetas] = await Promise.all([
    listarPendientes(userId, fondoId),
    proximasCuotas(userId, fondoId),
    listarMetas(userId, fondoId),
  ])

  return {
    saldos: { por_moneda: saldo_por_moneda, consolidado: saldo_consolidado },
    cuentas,
    mes,
    gastos_por_categoria: categorias,
    pendientes: { recurrentes, cuotas },
    metas: todasMetas.filter((m) => m.activa),
    vacio: cuentas.length === 0,
  }
}
