import { defineEventHandler } from 'h3'
import { authUserId } from '../utils/auth'
import { getMonedaBase, getPerfil, getTasa } from '../utils/ajustes'

// Resumen de Ajustes: perfil, moneda base por defecto y tasa paralelo (SPC-017).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const [perfil, moneda_base, tasa] = await Promise.all([getPerfil(userId), getMonedaBase(userId), getTasa(userId)])
  return { perfil, moneda_base, tasa }
})
