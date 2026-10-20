import { defineEventHandler } from 'h3'
import { buscarTransacciones } from '../utils/transacciones'
import { filtrosDeMovimientos } from '../utils/filtros-movimientos'

// Búsqueda/filtros de movimientos (SPC-016). Filtros por URL:
// ?q=&desde=&hasta=&fondo_id=<id>|todos&cuenta_id=&categoria_id=&tipo=&moneda=&monto_min=&monto_max=&fuente=&orden=fecha|monto&limite=&cursor=
export default defineEventHandler(async (event) => {
  const { userId, activo, filtros } = await filtrosDeMovimientos(event)
  if (!filtros) return { fondo: null, filtros: {}, transacciones: [], siguiente_cursor: null }

  const res = await buscarTransacciones(userId, filtros)
  return { fondo: activo, filtros, ...res }
})
