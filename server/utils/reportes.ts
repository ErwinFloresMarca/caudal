import { listarFondos } from './fondos'
import { listarCuentas } from './cuentas'
import { listarTransacciones } from './transacciones'
import { ultimaTasa } from './resumen'
import { getMonedaBase, getTasa } from './ajustes'
import { convertToBase, formatMoney, type Moneda } from '../../shared/money'
import { gastosPorCategoria, resumenPeriodo, type MovResumen } from '../../shared/resumen'
import { evolucionSaldo, serieMensual, barrasDiariasPorCategoria } from '../../shared/reportes'

function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

export interface FiltrosReporte {
  fondoIds?: number[]
  desde: string
  hasta: string
  base?: Moneda
}

const LIMITE_CATEGORIAS = 1000 // el cuadre exige todas; la UI recorta a top N

// Fondos del usuario que entran al reporte. Falla si algún id pedido no es suyo.
export async function fondosDelReporte(userId: number, fondoIds?: number[]) {
  const todos = await listarFondos(userId)
  let seleccion = todos
  if (fondoIds && fondoIds.length > 0) {
    const set = new Set(fondoIds)
    seleccion = todos.filter((f) => set.has(f.id))
    if (seleccion.length !== set.size) {
      throw httpError(400, 'Algún fondo no existe o no es tuyo')
    }
  }
  if (seleccion.length === 0) {
    throw httpError(400, 'No hay fondos para reportar')
  }
  return seleccion
}

function aMov(t: Awaited<ReturnType<typeof listarTransacciones>>[number]): MovResumen {
  return {
    tipo: t.tipo as 'ingreso' | 'gasto',
    monto_centavos: t.monto_centavos,
    moneda: t.moneda as Moneda,
    tasa_ref: t.tasa_ref,
    fecha: t.fecha,
    categoria_id: t.categoria?.id ?? null,
    categoria_nombre: t.categoria?.nombre ?? null,
    categoria_icono: t.categoria?.icono ?? null,
    categoria_color: t.categoria?.color ?? null,
  }
}

// Reporte del período para uno o varios fondos. La consolidación usa la tasa histórica
// de cada transacción (0002); las transferencias quedan fuera (no son transacciones) y
// los aportes/retiros entre fondos se netean al sumar ambos fondos.
export async function generarReporte(userId: number, filtros: FiltrosReporte) {
  const base = filtros.base ?? (await getMonedaBase(userId))
  // Base USD: los movimientos BOB no guardan tasa, se usa la tasa actual como referencia.
  const tasaFallback = base === 'USD' ? (await getTasa(userId)).actual?.valor : undefined
  const seleccion = await fondosDelReporte(userId, filtros.fondoIds)

  const movs: MovResumen[] = []
  let saldoInicialConsolidado = 0
  for (const f of seleccion) {
    const trx = await listarTransacciones(userId, f.id, { hasta: filtros.hasta })
    movs.push(...trx.map(aMov))

    const cuentas = await listarCuentas(userId, f.id, { incluirInactivas: true })
    const tasa = cuentas.some((c) => c.moneda === 'USD') ? await ultimaTasa(userId, f.id) : null
    for (const c of cuentas) {
      const moneda = c.moneda as Moneda
      if (moneda === base) {
        saldoInicialConsolidado += c.saldo_inicial_centavos
      } else {
        const tasaConversion = tasa ?? tasaFallback
        if (tasaConversion == null) {
          throw httpError(400, `Falta tasa para consolidar la cuenta ${c.nombre}`)
        }
        saldoInicialConsolidado += convertToBase({ centavos: c.saldo_inicial_centavos, moneda }, tasaConversion, base).centavos
      }
    }
  }

  const flujo = resumenPeriodo(movs, { desde: filtros.desde, hasta: filtros.hasta, base, tasaFallback })
  const categorias = gastosPorCategoria(movs, { desde: filtros.desde, hasta: filtros.hasta, base, tasaFallback, limite: LIMITE_CATEGORIAS })
  const serie = serieMensual(movs, { hasta: filtros.hasta, base, tasaFallback })
  const barras = barrasDiariasPorCategoria(movs, { desde: filtros.desde, hasta: filtros.hasta, base, tasaFallback })
  const evolucion = evolucionSaldo(movs, { desde: filtros.desde, hasta: filtros.hasta, saldoInicialCentavos: saldoInicialConsolidado, base, tasaFallback })
  const totalGastos = categorias.reduce((s, c) => s + c.centavos, 0)

  return {
    fondos: seleccion,
    filtros: { desde: filtros.desde, hasta: filtros.hasta, base },
    flujo,
    gastos_por_categoria: categorias,
    total_gastos_centavos: totalGastos,
    total_gastos_formateado: formatMoney({ centavos: totalGastos, moneda: base }),
    serie_mensual: serie,
    barras_diarias: barras,
    evolucion_saldo: evolucion,
    saldo_inicial_centavos: saldoInicialConsolidado,
    nota: 'Consolidado con equivalente histórico (tasa de cada movimiento); las transferencias no afectan el resultado.',
  }
}
