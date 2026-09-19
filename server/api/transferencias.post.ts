import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../utils/auth'
import { fondoActivoUsuario } from '../utils/fondos'
import { crearTransferencia, parseTransferencia } from '../utils/transferencias'

// Registra una transferencia entre cuentas del fondo activo.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const session = await getUserSession(event)
  const fondo = await fondoActivoUsuario(userId, session.fondo_activo_id as number | undefined)
  if (!fondo) {
    throw createError({ statusCode: 400, statusMessage: 'Crea un fondo antes de registrar transferencias' })
  }

  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const transferencia = await crearTransferencia(userId, fondo.id, parseTransferencia(body))
  return { fondo, transferencia }
})