import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { borrarAporte } from '../../utils/aportes'

// Borra las dos patas del aporte (por grupo_id) y restaura ambos fondos.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  await borrarAporte(userId, id)
  return { exito: true }
})
