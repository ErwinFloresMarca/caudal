import { defineEventHandler, setHeader } from 'h3'
import { authUserId } from '../../utils/auth'
import { exportarDatos } from '../../utils/exportar'

// Respaldo completo del usuario en JSON (SPC-046).
export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const datos = await exportarDatos(userId)
  const fecha = new Date().toISOString().slice(0, 10)
  setHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="caudal-datos-${fecha}.json"`)
  return JSON.stringify(datos, null, 2)
})
