import { defineEventHandler } from 'h3'
import { authUserId } from '../../utils/auth'
import { listarFondos } from '../../utils/fondos'

// Listado de fondos activos, con sugerencia de crear "Personal" si no hay ninguno.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const fondos = await listarFondos(userId)
  return {
    fondos,
    sugerir_personal: fondos.length === 0,
  }
})