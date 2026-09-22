import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { cambiarPassword } from '../../utils/ajustes'

// Cambiar contraseña exige la actual.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  return await cambiarPassword(userId, {
    actual: body.actual == null ? undefined : String(body.actual),
    nueva: body.nueva == null ? undefined : String(body.nueva),
  })
})
