import { defineEventHandler } from 'h3'
import { authUserId } from '../../utils/auth'
import { listarFondos, KEY_FONDO_DEFAULT } from '../../utils/fondos'
import { getSetting } from '../../utils/settings'

// Listado de fondos activos, con sugerencia de crear "Personal" si no hay ninguno.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const [fondos, guardado] = await Promise.all([
    listarFondos(userId),
    getSetting<number | null>(userId, KEY_FONDO_DEFAULT),
  ])

  const predeterminadoId = Number(guardado)
  return {
    fondos: fondos.map((f) => ({ ...f, predeterminado: f.id === predeterminadoId })),
    sugerir_personal: fondos.length === 0,
  }
})
