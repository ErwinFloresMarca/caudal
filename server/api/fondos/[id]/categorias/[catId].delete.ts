import { defineEventHandler } from 'h3'
import { authUserId } from '../../../../utils/auth'
import { borrarCategoria } from '../../../../utils/categorias'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const categoriaId = Number(getRouterParam(event, 'catId'))

  const borrada = await borrarCategoria(userId, categoriaId)
  return { borrada, eliminada: true }
})