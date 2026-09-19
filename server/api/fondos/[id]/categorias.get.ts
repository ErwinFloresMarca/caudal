import { defineEventHandler, createError } from 'h3'
import { authUserId } from '../../../utils/auth'
import { getFondoPublico } from '../../../utils/fondos'
import { listarCategorias } from '../../../utils/categorias'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const fondoId = Number(getRouterParam(event, 'id'))

  const fondo = await getFondoPublico(userId, fondoId)
  if (!fondo) {
    throw createError({ statusCode: 404, statusMessage: 'Fondo no encontrado' })
  }

  const categorias = await listarCategorias(userId, fondoId)
  return { fondo, categorias }
})