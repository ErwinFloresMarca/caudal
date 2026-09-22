import { defineEventHandler } from 'h3'
import { authUserId } from '../../utils/auth'
import { getTasa } from '../../utils/ajustes'

// Última tasa usada (auto-sugerencia para transacciones USD) + historial.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  return await getTasa(userId)
})
