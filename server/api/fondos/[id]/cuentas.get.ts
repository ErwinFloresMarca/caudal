import { defineEventHandler, createError } from 'h3'
import { authUserId } from '../../../utils/auth'
import { getFondoPublico } from '../../../utils/fondos'
import { listarCuentas } from '../../../utils/cuentas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const fondoId = Number(getRouterParam(event, 'id'))

  const fondo = await getFondoPublico(userId, fondoId)
  if (!fondo) {
    throw createError({ statusCode: 404, statusMessage: 'Fondo no encontrado' })
  }

  const cuentas = await listarCuentas(userId, fondoId)
  const saldos_por_moneda: Record<string, number> = {}
  for (const c of cuentas) {
    saldos_por_moneda[c.moneda] = (saldos_por_moneda[c.moneda] ?? 0) + c.saldo_actual_centavos
  }

  return { fondo, cuentas, saldos_por_moneda }
})