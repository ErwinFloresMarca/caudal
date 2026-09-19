import { defineEventHandler, createError } from 'h3'
import { authUserId } from '../../../../utils/auth'
import { getCuenta } from '../../../../utils/cuentas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const cuentaId = Number(getRouterParam(event, 'cuentaId'))

  const cuenta = await getCuenta(userId, cuentaId)
  if (!cuenta) {
    throw createError({ statusCode: 404, statusMessage: 'Cuenta no encontrada' })
  }

  return { cuenta }
})