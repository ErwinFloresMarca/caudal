import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { borrarCuenta } from '../../utils/ajustes'

// Borra la cuenta y todos sus datos. Requiere confirmación explícita ("BORRAR").
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  return await borrarCuenta(userId, String(body.confirmacion ?? ''))
})
