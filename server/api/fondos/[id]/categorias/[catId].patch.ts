import { defineEventHandler, createError, readBody } from 'h3'
import { authUserId } from '../../../../utils/auth'
import { parseCategoria, editarCategoria, ocultarCategoria, getCategoria } from '../../../../utils/categorias'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const categoriaId = Number(getRouterParam(event, 'catId'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}

  // Ocultar cuando viene ACTIVA false; las predefinidas solo se ocultan, no se borran.
  if (body.activa === false) {
    const oculta = await ocultarCategoria(userId, categoriaId)
    if (!oculta) {
      throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })
    }
    return { categoria: oculta }
  }

  const editada = await editarCategoria(userId, categoriaId, parseCategoria(body))
  if (!editada) {
    throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })
  }

  return { categoria: (await getCategoria(userId, categoriaId)) ?? editada }
})