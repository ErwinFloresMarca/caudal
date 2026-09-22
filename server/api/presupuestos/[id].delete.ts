import { defineEventHandler, getRouterParam } from 'h3'
import { authUserId } from '../../utils/auth'
import { borrarPresupuesto } from '../../utils/presupuestos'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const id = Number(getRouterParam(event, 'id'))
  return { borrado: await borrarPresupuesto(userId, id) }
})
