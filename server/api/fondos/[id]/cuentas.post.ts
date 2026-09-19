import { defineEventHandler, createError, readBody } from 'h3'
import { authUserId } from '../../../utils/auth'
import { getFondoPublico } from '../../../utils/fondos'
import { parseCuentaCompleta, crearCuenta } from '../../../utils/cuentas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const fondoId = Number(getRouterParam(event, 'id'))

  const fondo = await getFondoPublico(userId, fondoId)
  if (!fondo) {
    throw createError({ statusCode: 404, statusMessage: 'Fondo no encontrado' })
  }

  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const cuenta = await crearCuenta(userId, fondoId, parseCuentaCompleta(body))

  return {
    cuenta: {
      id: cuenta.id,
      nombre: cuenta.nombre,
      tipo: cuenta.tipo,
      moneda: cuenta.moneda,
      activa: cuenta.activa,
      saldo_inicial_centavos: cuenta.saldo_inicial_centavos,
      saldo_actual_centavos: cuenta.saldo_inicial_centavos,
    },
  }
})