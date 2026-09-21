import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from './db'
import { transacciones } from '../db/schema'
import { listarCuentas } from './cuentas'
import { hoyLocal, listarTransacciones } from './transacciones'
import { listarPendientes } from './recurrentes'
import { proximasCuotas } from './deudas'
import { listarMetas } from './metas'
import { convertToBase, formatMoney, type Moneda } from '../../shared/money'
import { gastosPorCategoria, rangoMes, resumenPeriodo, type MovResumen } from '../../shared/resumen'

// Última tasa USD registrada en el fondo, para consolidar saldos (stock) a BOB.
async function ultimaTasa(userId: number, fondoId: number): Promise<number | null> {
  const [row] = await db
    .select({ tasa_ref: transacciones.tasa_ref })
    .from(transacciones)
    .where(and(eq(transacciones.user_id, userId), eq(transacciones.fondo_id, fondoId), eq(transacciones.moneda, 'USD'), isNotNull(transacciones.tasa_ref)))
    .orderBy(desc(transacciones.fecha), desc(transacciones.id))
    .limit(1)
  return row?.tasa_ref ?? null
}

// Agrega todo lo que el dashboard necesita en una sola pasada de servidor.
export async function resumenDashboard(userId: number, fondoId: number) {
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

  // Consolidar saldos USD requiere una tasa; se usa la última registrada (0002).
  const hayUsd = porMoneda.has('USD')
  const tasa = hayUsd ? await ultimaTasa(userId, fondoId) : null
  let saldo_consolidado = null
  if (!hayUsd || tasa != null) {
    const centavos = [...porMoneda.entries()].reduce(
      (s, [moneda, c]) => s + convertToBase({ centavos: c, moneda }, moneda === 'BOB' ? undefined : (tasa ?? undefined)).centavos,
      0,
    )
    saldo_consolidado = {
      centavos,
      formateado: formatMoney({ centavos, moneda: 'BOB' }),
      tasa_ref: tasa,
      nota: hayUsd ? 'Convertido con tasa histórica' : null,
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

  const mes = resumenPeriodo(movs, { ...rango })
  const categorias = gastosPorCategoria(movs, { ...rango })

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
