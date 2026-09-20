import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../utils/auth'
import { crearAporte, parseAporte } from '../utils/aportes'

// Registra un aporte/retiro entre fondos: ingreso en la cuenta destino y, si hay
// cuenta origen, gasto en la de origen (dos transacciones ligadas por grupo_id).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const aporte = await crearAporte(userId, parseAporte(body))
  return { aporte }
})
