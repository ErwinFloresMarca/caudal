import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { getMonedaBase, getTasa, setMonedaBase, setTasa } from '../../utils/ajustes'

// Moneda base de consolidación por defecto y tasa paralelo actual.
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}

  if (body.moneda_base != null) {
    await setMonedaBase(userId, body.moneda_base)
  }
  if (body.tasa != null) {
    await setTasa(userId, { valor: body.tasa as number | string, fecha: body.fecha == null ? undefined : String(body.fecha) })
  }

  return { moneda_base: await getMonedaBase(userId), tasa: await getTasa(userId) }
})
