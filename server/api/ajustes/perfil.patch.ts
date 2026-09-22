import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { actualizarPerfil } from '../../utils/ajustes'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const perfil = await actualizarPerfil(userId, {
    nombre: body.nombre == null ? undefined : String(body.nombre),
    email: body.email == null ? undefined : String(body.email),
    timezone: body.timezone == null ? undefined : String(body.timezone),
  })
  return { perfil }
})
