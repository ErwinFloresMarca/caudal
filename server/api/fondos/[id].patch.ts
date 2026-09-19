import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { parseFondo, editarFondo, ocultarFondo } from '../../utils/fondos'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}

  // Oculta cuando viene ACTIVO false; no existió borrado físico.
  if (body.activo === false) {
    return { fondo: await ocultarFondo(userId, id) }
  }

  return { fondo: await editarFondo(userId, id, parseFondo(body)) }
})