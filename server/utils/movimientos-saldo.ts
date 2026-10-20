import { listarCuentas } from './cuentas'
import { listarFondos } from './fondos'
import { listarTransferencias } from './transferencias'
import { listarFiltradas, type FiltrosBusqueda } from './transacciones'
import { getMonedaBase, getTasa } from './ajustes'
import { convertToBase, type Moneda } from '../../shared/money'

interface Efecto {
  fecha: string
  orden: number
  delta: number
  trxId?: number
}

// Saldo consolidado después de cada movimiento del alcance (fondo/cuenta).
// Es un dato DERIVADO: nunca se guarda. Editar o borrar un movimiento no obliga a
// recalcular nada persistido; la próxima lectura vuelve a sumar y queda al día.
// shortcut: recorre todo el alcance en memoria; con historiales muy grandes habría
// que anclar el saldo por página con una suma agregada en SQL.
// El alcance ignora los filtros de pantalla (tipo, texto, monto, categoría) porque
// el saldo es del dinero, no de lo que se está mirando. Las transferencias mueven
// el saldo entre cuentas y por eso entran en la suma (aunque no se listen).
export async function saldosPorMovimiento(userId: number, filtros: FiltrosBusqueda) {
  const base = (await getMonedaBase(userId)) as Moneda
  const tasa = (await getTasa(userId)).actual?.valor ?? undefined
  const fondos = filtros.fondoIds?.length ? filtros.fondoIds : (await listarFondos(userId)).map((f) => f.id)
  const cuentaId = filtros.cuenta_id

  const conv = (centavos: number, moneda: string | null) =>
    convertToBase({ centavos, moneda: moneda as Moneda }, (moneda as Moneda) === base ? undefined : tasa, base).centavos

  // 1) Total actual de las cuentas del alcance (saldo inicial + movimientos + transferencias).
  let total = 0
  for (const fondoId of fondos) {
    for (const c of await listarCuentas(userId, fondoId, { incluirInactivas: true })) {
      if (cuentaId && c.id !== cuentaId) continue
      total += conv(c.saldo_actual_centavos, c.moneda)
    }
  }

  // 2) Línea de tiempo del alcance: transacciones + transferencias.
  const efectos: Efecto[] = []
  for (const t of await listarFiltradas(userId, { fondoIds: fondos, cuenta_id: cuentaId })) {
    efectos.push({
      fecha: t.fecha,
      orden: t.id,
      trxId: t.id,
      delta: (t.tipo === 'ingreso' ? 1 : -1) * conv(t.monto_centavos, t.moneda),
    })
  }
  for (const fondoId of fondos) {
    for (const tr of await listarTransferencias(userId, fondoId)) {
      if (cuentaId) {
        if (tr.cuenta_origen_id === cuentaId) {
          efectos.push({ fecha: tr.fecha, orden: tr.id, delta: -conv(tr.monto_origen_centavos, tr.moneda_origen) })
        }
        if (tr.cuenta_destino_id === cuentaId) {
          efectos.push({ fecha: tr.fecha, orden: tr.id, delta: conv(tr.monto_destino_centavos, tr.moneda_destino) })
        }
      } else {
        efectos.push({
          fecha: tr.fecha,
          orden: tr.id,
          delta: conv(tr.monto_destino_centavos, tr.moneda_destino) - conv(tr.monto_origen_centavos, tr.moneda_origen),
        })
      }
    }
  }

  // 3) De más nuevo a más viejo: el saldo después de una fila es el total actual
  // menos lo que movieron las filas posteriores.
  efectos.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.orden - a.orden)
  const saldos = new Map<number, number>()
  let posteriores = 0
  for (const e of efectos) {
    if (e.trxId != null) saldos.set(e.trxId, total - posteriores)
    posteriores += e.delta
  }

  return { saldos, moneda: base }
}
