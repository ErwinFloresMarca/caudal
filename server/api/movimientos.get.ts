import { defineEventHandler, getQuery } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { buscarTransacciones, type FiltrosBusqueda } from '../utils/transacciones'

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isInteger(n) ? n : undefined
}

// Búsqueda/filtros de movimientos (SPC-016). Filtros por URL:
// ?q=&desde=&hasta=&fondo_id=<id>|todos&cuenta_id=&categoria_id=&tipo=&moneda=&monto_min=&monto_max=&fuente=&orden=fecha|monto&limite=&cursor=
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const query = getQuery(event)
  const activo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)

  let fondoIds: number[] | undefined
  if (query.fondo_id === 'todos' || query.fondo_id === 'all') {
    fondoIds = undefined
  } else {
    const fid = num(query.fondo_id)
    if (fid != null) fondoIds = [fid]
    else if (activo) fondoIds = [activo.id]
    else return { fondo: null, filtros: {}, transacciones: [], siguiente_cursor: null }
  }

  const cursor =
    typeof query.cursor === 'string' && query.cursor.includes('|')
      ? (() => {
          const [valor, id] = query.cursor.split('|')
          return { valor: valor!, id: Number(id) }
        })()
      : undefined

  const filtros: FiltrosBusqueda = {
    fondoIds,
    cuenta_id: num(query.cuenta_id),
    categoria_id: num(query.categoria_id),
    tipo: query.tipo === 'ingreso' || query.tipo === 'gasto' ? query.tipo : undefined,
    moneda: query.moneda === 'BOB' || query.moneda === 'USD' ? query.moneda : undefined,
    fuente: typeof query.fuente === 'string' && query.fuente ? query.fuente : undefined,
    q: typeof query.q === 'string' && query.q.trim() ? query.q.trim() : undefined,
    desde: typeof query.desde === 'string' && FECHA_RE.test(query.desde) ? query.desde : undefined,
    hasta: typeof query.hasta === 'string' && FECHA_RE.test(query.hasta) ? query.hasta : undefined,
    monto_min: num(query.monto_min),
    monto_max: num(query.monto_max),
    orden: query.orden === 'monto' ? 'monto' : 'fecha',
    limite: num(query.limite),
    cursor,
  }

  const res = await buscarTransacciones(userId, filtros)
  return { fondo: activo, filtros, ...res }
})
