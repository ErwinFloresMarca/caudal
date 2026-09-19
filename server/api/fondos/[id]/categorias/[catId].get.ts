import { defineEventHandler, createError } from 'h3'
import { authUserId } from '../../../../utils/auth'
import { getCategoria } from '../../../../utils/categorias'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const categoriaId = Number(getRouterParam(event, 'catId'))

  const categoria = await getCategoria(userId, categoriaId)
  if (!categoria) {
    throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })
  }

  return { categoria }
})