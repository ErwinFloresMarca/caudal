import { defineEventHandler, createError, readBody } from 'h3'
import { authUserId } from '../../../utils/auth'
import { getFondoPublico } from '../../../utils/fondos'
import { parseCategoria, crearCategoria, getCategoria } from '../../../utils/categorias'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const fondoId = Number(getRouterParam(event, 'id'))

  const fondo = await getFondoPublico(userId, fondoId)
  if (!fondo) {
    throw createError({ statusCode: 404, statusMessage: 'Fondo no encontrado' })
  }

  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const nuevo = await crearCategoria(userId, fondoId, parseCategoria(body))
  return { categoria: await getCategoria(userId, nuevo.id) }
})