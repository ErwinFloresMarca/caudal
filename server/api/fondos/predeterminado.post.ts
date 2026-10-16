import { defineEventHandler, createError, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { getFondoPublico, KEY_FONDO_DEFAULT } from '../../utils/fondos'
import { setSetting, borrarSetting } from '../../utils/settings'

// Marca (o desmarca, con id null) el fondo por defecto del usuario. No toca el fondo activo.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const crudo = (await readBody<{ id?: number | null }>(event).catch(() => null))?.id
  const id = crudo == null ? null : Number(crudo)

  if (id != null) {
    if (!Number.isInteger(id) || id <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'id inválido' })
    }
    if (!(await getFondoPublico(userId, id))) {
      throw createError({ statusCode: 404, statusMessage: 'Fondo no encontrado' })
    }
  }

  if (id == null) {
    await borrarSetting(userId, KEY_FONDO_DEFAULT)
  } else {
    await setSetting(userId, KEY_FONDO_DEFAULT, id)
  }

  return { predeterminado_id: id }
})
