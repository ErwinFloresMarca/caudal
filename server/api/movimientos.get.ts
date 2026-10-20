import { defineEventHandler } from 'h3'
import { buscarTransacciones } from '../utils/transacciones'
import { filtrosDeMovimientos } from '../utils/filtros-movimientos'
import { saldosPorMovimiento } from '../utils/movimientos-saldo'

// Búsqueda/filtros de movimientos (SPC-016 + saldo continuo de SPC-043). Filtros por URL:
// ?q=&desde=&hasta=&fondo_id=<id>|todos&cuenta_id=&categoria_id=&tipo=&moneda=&monto_min=&monto_max=&fuente=&orden=fecha|monto&limite=&cursor=
export default defineEventHandler(async (event) => {
  const { userId, activo, filtros } = await filtrosDeMovimientos(event)
  if (!filtros) return { fondo: null, filtros: {}, transacciones: [], siguiente_cursor: null }

  const res = await buscarTransacciones(userId, filtros)

  // El saldo se calcula sobre el alcance completo (fondo/cuenta), no sobre lo que
  // se está mirando. Si falta la tasa para consolidar, se devuelve null y la UI
  // oculta la columna.
  let saldos: Map<number, number> | null = null
  try {
    saldos = (await saldosPorMovimiento(userId, filtros)).saldos
  } catch {
    saldos = null
  }

  return {
    fondo: activo,
    filtros,
    ...res,
    transacciones: res.transacciones.map((t) => ({ ...t, saldo_continuo_centavos: saldos?.get(t.id) ?? null })),
  }
})
