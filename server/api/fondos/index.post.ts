import { defineEventHandler, readBody } from 'h3'
import { authUserId } from '../../utils/auth'
import { parseFondo, crearFondo } from '../../utils/fondos'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}
  const fondo = await crearFondo(userId, parseFondo(body))

  const session = await getUserSession(event)
  if (session.user && session.fondo_activo_id == null) {
    await setUserSession(event, { ...session, user: session.user, fondo_activo_id: fondo.id })
  }

  return {
    id: fondo.id,
    nombre: fondo.nombre,
    tipo: fondo.tipo,
    moneda_base: fondo.moneda_base,
    color: fondo.color,
    icono: fondo.icono,
    activo: fondo.activo,
  }
})