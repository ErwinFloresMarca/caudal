import { defineEventHandler, createError, readBody } from 'h3'
import { authUserId } from '../../../../utils/auth'
import { parseCuenta, editarCuenta, ocultarCuenta, getCuenta } from '../../../../utils/cuentas'

export default defineEventHandler(async (event) => {
  const userId = await authUserId(event)
  const cuentaId = Number(getRouterParam(event, 'cuentaId'))
  const body = (await readBody<Record<string, unknown>>(event).catch(() => null)) ?? {}

  // Oculta cuando viene ACTIVA false; no existió borrado físico.
  if (body.activa === false) {
    const oculta = await ocultarCuenta(userId, cuentaId)
    if (!oculta) {
      throw createError({ statusCode: 404, statusMessage: 'Cuenta no encontrada' })
    }
    return { cuenta: oculta }
  }

  const editada = await editarCuenta(userId, cuentaId, parseCuenta(body))
  if (!editada) {
    throw createError({ statusCode: 404, statusMessage: 'Cuenta no encontrada' })
  }

  const conSaldo = await getCuenta(userId, cuentaId)
  return { cuenta: conSaldo ?? { ...editada, saldo_inicial_centavos: 0, saldo_actual_centavos: 0 } }
})