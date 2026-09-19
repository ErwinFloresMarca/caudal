import { defineEventHandler } from 'h3'
import { authUserId } from '../../utils/auth'
import { borrarTransaccion } from '../../utils/transacciones'

// Borrado real: recalcula el saldo de la cuenta (SPC-006).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))

  const borrada = await borrarTransaccion(userId, id)
  return { borrada, eliminada: true }
})