import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { db } from './db'
import { deudas, cuotas, transacciones, cuentas } from '../db/schema'
import { crearTransaccion, hoyLocal, type TipoTransaccion } from './transacciones'
import { generarCuotas } from '../../shared/cuotas'
import { nextDate, type Cadencia } from '../../shared/recurrentes'
import { formatMoney, type Moneda } from '../../shared/money'

// Error HTTP sin depender de h3 (para que vitest pueda importar el repositorio).
function httpError(statusCode: number, statusMessage: string): Error & { statusCode: number } {
  return Object.assign(new Error(statusMessage), { statusCode })
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

export const DIRECCIONES = ['por_pagar', 'por_cobrar'] as const
export type Direccion = (typeof DIRECCIONES)[number]

export interface DatosDeuda {
  contraparte: string
  direccion: Direccion
  concepto?: string | null
  monto_total_centavos: number
  moneda: Moneda
  fecha_inicio?: string
  num_cuotas: number
  nota?: string | null
}

export interface DatosPago {
  cuenta_id: number
  /** Cuenta del otro fondo que recibe (o entrega) el importe (SPC-035). */
  otra_cuenta_id?: number | null
  categoria_id?: number | null
  monto_centavos?: number
  fecha?: string
  tasa_ref?: number | null
  nota?: string | null
}

type FilaDeuda = typeof deudas.$inferSelect
type FilaCuota = typeof cuotas.$inferSelect

function texto(body: Record<string, unknown>, key: string): string | null {
  return body[key] != null && String(body[key]).trim() ? String(body[key]).trim() : null
}

export function parseDeuda(body: Record<string, unknown>): DatosDeuda {
  const contraparte = String(body.contraparte ?? '').trim()
  if (!contraparte) {
    throw httpError(400, 'La contraparte es obligatoria')
  }
  const direccion = String(body.direccion ?? '').trim() as Direccion
  if (!DIRECCIONES.includes(direccion)) {
    throw httpError(400, 'direccion debe ser por_pagar o por_cobrar')
  }
  const monto_total_centavos = Number(body.monto_total_centavos)
  if (!Number.isInteger(monto_total_centavos) || monto_total_centavos <= 0) {
    throw httpError(400, 'monto_total_centavos debe ser un entero positivo')
  }
  const moneda = String(body.moneda ?? 'BOB').trim() as Moneda
  if (moneda !== 'BOB' && moneda !== 'USD') {
    throw httpError(400, 'moneda debe ser BOB o USD')
  }
  const num_cuotas = Number(body.num_cuotas)
  if (!Number.isInteger(num_cuotas) || num_cuotas < 1) {
    throw httpError(400, 'num_cuotas debe ser un entero >= 1')
  }
  const fecha_inicio = body.fecha_inicio == null || body.fecha_inicio === '' ? undefined : String(body.fecha_inicio)
  if (fecha_inicio != null && !FECHA_RE.test(fecha_inicio)) {
    throw httpError(400, 'fecha_inicio debe usar formato YYYY-MM-DD')
  }
  return {
    contraparte,
    direccion,
    concepto: texto(body, 'concepto'),
    monto_total_centavos,
    moneda,
    fecha_inicio,
    num_cuotas,
    nota: texto(body, 'nota'),
  }
}

export function parsePago(body: Record<string, unknown>): DatosPago {
  const cuenta_id = Number(body.cuenta_id)
  if (!Number.isInteger(cuenta_id) || cuenta_id <= 0) {
    throw httpError(400, 'cuenta_id es obligatorio')
  }
  let otra_cuenta_id: number | null = null
  if (body.otra_cuenta_id != null && body.otra_cuenta_id !== '') {
    otra_cuenta_id = Number(body.otra_cuenta_id)
    if (!Number.isInteger(otra_cuenta_id) || otra_cuenta_id <= 0) {
      throw httpError(400, 'otra_cuenta_id inválido')
    }
  }
  let categoria_id: number | null = null
  if (body.categoria_id != null && body.categoria_id !== '') {
    categoria_id = Number(body.categoria_id)
    if (!Number.isInteger(categoria_id) || categoria_id <= 0) {
      throw httpError(400, 'categoria_id inválido')
    }
  }
  let monto_centavos: number | undefined
  if (body.monto_centavos != null && body.monto_centavos !== '') {
    monto_centavos = Number(body.monto_centavos)
    if (!Number.isInteger(monto_centavos) || monto_centavos <= 0) {
      throw httpError(400, 'monto_centavos debe ser un entero positivo')
    }
  }
  const fecha = body.fecha == null || body.fecha === '' ? undefined : String(body.fecha)
  if (fecha != null && !FECHA_RE.test(fecha)) {
    throw httpError(400, 'fecha debe usar formato YYYY-MM-DD')
  }
  let tasa_ref: number | null
  if (body.tasa_ref != null && String(body.tasa_ref).trim() !== '') {
    tasa_ref = Number(String(body.tasa_ref).replace(',', '.'))
    if (!Number.isFinite(tasa_ref) || tasa_ref <= 0) {
      throw httpError(400, 'tasa_ref debe ser un número positivo')
    }
  } else {
    tasa_ref = null
  }
  return { cuenta_id, otra_cuenta_id, categoria_id, monto_centavos, fecha, tasa_ref, nota: texto(body, 'nota') }
}

// Importe de la segunda pata en la moneda de su cuenta: misma regla que
// `resolverAporte` (la tasa es BOB por USD).
// ponytail: la conversión vive también en aportes.ts; unificar si aparece un tercer caso.
function montoEnMoneda(monto: number, desde: Moneda, hacia: Moneda, tasa: number | null): number {
  if (desde === hacia) return monto
  if (tasa == null || !Number.isFinite(tasa) || tasa <= 0) {
    throw httpError(400, 'tasa_ref es obligatoria para cuentas USD')
  }
  return desde === 'USD' ? Math.round(monto * tasa) : Math.round(monto / tasa)
}

function cuotaPublica(c: FilaCuota, moneda: Moneda) {
  return {
    id: c.id,
    numero: c.numero,
    fecha_vencimiento: c.fecha_vencimiento,
    monto_centavos: c.monto_centavos,
    monto_formateado: formatMoney({ centavos: c.monto_centavos, moneda }),
    pagada: c.pagada,
    fecha_pago: c.fecha_pago ?? null,
  }
}

function deudaPublica(d: FilaDeuda, cs: FilaCuota[], conCuotas = false) {
  const moneda = d.moneda as Moneda
  const pagadas = cs.filter((c) => c.pagada)
  const pendientes = cs.filter((c) => !c.pagada)
  const saldo = pendientes.reduce((s, c) => s + c.monto_centavos, 0)
  const proxima = pendientes.length ? [...pendientes].map((c) => c.fecha_vencimiento).sort()[0] : null
  return {
    id: d.id,
    fondo_id: d.fondo_id,
    contraparte: d.contraparte,
    direccion: d.direccion,
    concepto: d.concepto ?? null,
    monto_total_centavos: d.monto_total_centavos,
    moneda,
    monto_total_formateado: formatMoney({ centavos: d.monto_total_centavos, moneda }),
    fecha_inicio: d.fecha_inicio,
    num_cuotas: d.num_cuotas,
    estado: d.estado,
    nota: d.nota ?? null,
    progreso: { pagadas: pagadas.length, total: cs.length },
    saldo_pendiente_centavos: saldo,
    saldo_pendiente_formateado: formatMoney({ centavos: saldo, moneda }),
    proxima_cuota: proxima,
    ...(conCuotas ? { cuotas: [...cs].sort((a, b) => a.numero - b.numero).map((c) => cuotaPublica(c, moneda)) } : {}),
  }
}

async function cuotasDe(userId: number, deudaIds: number[]) {
  if (deudaIds.length === 0) return new Map<number, FilaCuota[]>()
  const filas = await db.select().from(cuotas).where(inArray(cuotas.deuda_id, deudaIds)).orderBy(asc(cuotas.numero))
  const map = new Map<number, FilaCuota[]>()
  for (const c of filas) {
    const arr = map.get(c.deuda_id)
    if (arr) arr.push(c)
    else map.set(c.deuda_id, [c])
  }
  return map
}

export async function crearDeuda(userId: number, fondoId: number, data: DatosDeuda) {
  const fechaInicio = data.fecha_inicio ?? hoyLocal()
  const calculadas = generarCuotas(data.monto_total_centavos, data.num_cuotas, fechaInicio)

  const [deuda] = await db.transaction(async (tx) => {
    const [d] = await tx
      .insert(deudas)
      .values({
        user_id: userId,
        fondo_id: fondoId,
        contraparte: data.contraparte,
        direccion: data.direccion,
        concepto: data.concepto,
        monto_total_centavos: data.monto_total_centavos,
        moneda: data.moneda,
        fecha_inicio: fechaInicio,
        num_cuotas: data.num_cuotas,
        estado: 'activa',
        nota: data.nota,
      })
      .returning()
    if (!d) {
      throw httpError(500, 'No se pudo crear la deuda')
    }
    await tx.insert(cuotas).values(
      calculadas.map((c) => ({
        deuda_id: d.id,
        numero: c.numero,
        fecha_vencimiento: c.fecha_vencimiento,
        monto_centavos: c.monto_centavos,
        pagada: false,
      })),
    )
    return [d]
  })

  return getDeuda(userId, deuda!.id)
}

export async function listarDeudas(userId: number, fondoId: number) {
  const filas = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.user_id, userId), eq(deudas.fondo_id, fondoId)))
    .orderBy(desc(deudas.fecha_inicio), desc(deudas.id))
  const map = await cuotasDe(userId, filas.map((d) => d.id))
  return filas.map((d) => deudaPublica(d, map.get(d.id) ?? []))
}

export async function getDeuda(userId: number, id: number) {
  const [d] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, id), eq(deudas.user_id, userId)))
    .limit(1)
  if (!d) return null
  const cs = await db.select().from(cuotas).where(eq(cuotas.deuda_id, id)).orderBy(asc(cuotas.numero))
  return deudaPublica(d, cs, true)
}

// Edita la deuda y recalcula las cuotas NO pagadas (las pagadas quedan intactas),
// repartiendo el monto restante entre las cuotas restantes.
export async function editarDeuda(userId: number, id: number, data: DatosDeuda) {
  const [d] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, id), eq(deudas.user_id, userId)))
    .limit(1)
  if (!d) {
    throw httpError(404, 'Deuda no encontrada')
  }
  const fechaInicio = data.fecha_inicio ?? d.fecha_inicio
  const cs = await db.select().from(cuotas).where(eq(cuotas.deuda_id, id)).orderBy(asc(cuotas.numero))
  const pagadas = cs.filter((c) => c.pagada)
  const pagadoSum = pagadas.reduce((s, c) => s + c.monto_centavos, 0)

  if (data.num_cuotas < pagadas.length) {
    throw httpError(400, 'num_cuotas no puede ser menor que las cuotas ya pagadas')
  }
  const restante = data.monto_total_centavos - pagadoSum
  if (restante < 0) {
    throw httpError(400, 'El monto total no puede ser menor que lo ya pagado')
  }
  const restantes = data.num_cuotas - pagadas.length
  if (restantes === 0 && restante > 0) {
    throw httpError(400, 'El monto total no cuadra con las cuotas pagadas')
  }

  const dia = Number(fechaInicio.slice(8, 10))
  const cadencia: Cadencia = { frecuencia: 'mensual', dia }
  const base = pagadas.length > 0 ? nextDate(pagadas[pagadas.length - 1]!.fecha_vencimiento, cadencia) : fechaInicio
  const nuevas = restantes > 0 ? generarCuotas(restante, restantes, base).map((c, i) => ({ ...c, numero: pagadas.length + i + 1 })) : []
  const todasPagadas = restantes === 0 && restante === 0

  await db.transaction(async (tx) => {
    await tx
      .update(deudas)
      .set({
        contraparte: data.contraparte,
        direccion: data.direccion,
        concepto: data.concepto,
        monto_total_centavos: data.monto_total_centavos,
        moneda: data.moneda,
        fecha_inicio: fechaInicio,
        num_cuotas: data.num_cuotas,
        estado: todasPagadas ? 'saldada' : 'activa',
        nota: data.nota,
      })
      .where(and(eq(deudas.id, id), eq(deudas.user_id, userId)))

    const noPagadas = cs.filter((c) => !c.pagada).map((c) => c.id)
    if (noPagadas.length) {
      await tx.delete(cuotas).where(inArray(cuotas.id, noPagadas))
    }
    if (nuevas.length) {
      await tx.insert(cuotas).values(
        nuevas.map((c) => ({
          deuda_id: id,
          numero: c.numero,
          fecha_vencimiento: c.fecha_vencimiento,
          monto_centavos: c.monto_centavos,
          pagada: false,
        })),
      )
    }
  })

  return getDeuda(userId, id)
}

export async function pagarCuota(userId: number, deudaId: number, cuotaId: number, pago: DatosPago) {
  const [d] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, deudaId), eq(deudas.user_id, userId)))
    .limit(1)
  if (!d) {
    throw httpError(404, 'Deuda no encontrada')
  }
  const [c] = await db
    .select()
    .from(cuotas)
    .where(and(eq(cuotas.id, cuotaId), eq(cuotas.deuda_id, deudaId)))
    .limit(1)
  if (!c) {
    throw httpError(404, 'Cuota no encontrada')
  }
  if (c.pagada) {
    throw httpError(400, 'La cuota ya está pagada')
  }

  const tipo: TipoTransaccion = d.direccion === 'por_pagar' ? 'gasto' : 'ingreso'
  const monto = pago.monto_centavos ?? c.monto_centavos
  const fecha = pago.fecha ?? hoyLocal()
  const nota = pago.nota ?? d.concepto ?? `Cuota ${c.numero}`

  // La pata de pago va en la moneda de SU cuenta: si difiere de la de la deuda se
  // convierte con la tasa (SPC-037), igual que la segunda pata.
  const [cuentaPago] = await db
    .select({ moneda: cuentas.moneda })
    .from(cuentas)
    .where(and(eq(cuentas.id, pago.cuenta_id), eq(cuentas.user_id, userId)))
    .limit(1)
  if (!cuentaPago) {
    throw httpError(404, 'Cuenta no encontrada')
  }
  const monedaPago = cuentaPago.moneda as Moneda
  if (monedaPago !== (d.moneda as Moneda) && (pago.tasa_ref == null || pago.tasa_ref <= 0)) {
    throw httpError(400, 'tasa_ref es obligatoria cuando la cuenta de pago está en otra moneda')
  }
  const montoPata = montoEnMoneda(monto, d.moneda as Moneda, monedaPago, pago.tasa_ref ?? null)

  // Segunda pata opcional (SPC-035): el fondo de la deuda registra el pago y la cuenta
  // elegida recibe el importe (espejado si la deuda es por_cobrar).
  let otraCuenta: { id: number; fondo_id: number; moneda: string } | null = null
  if (pago.otra_cuenta_id != null) {
    const [cuenta] = await db
      .select({ id: cuentas.id, fondo_id: cuentas.fondo_id, moneda: cuentas.moneda })
      .from(cuentas)
      .where(and(eq(cuentas.id, pago.otra_cuenta_id), eq(cuentas.user_id, userId)))
      .limit(1)
    if (!cuenta) {
      throw httpError(404, 'Cuenta no encontrada')
    }
    if (cuenta.fondo_id === d.fondo_id) {
      throw httpError(400, 'Elegí un fondo distinto; para el mismo fondo usá el pago simple')
    }
    otraCuenta = cuenta
  }

  const { transaccion, transaccionOtra } = await db.transaction(async (tx) => {
    const primera = await crearTransaccion(
      userId,
      d.fondo_id,
      {
        cuenta_id: pago.cuenta_id,
        categoria_id: pago.categoria_id ?? null,
        tipo,
        monto_centavos: montoPata,
        fecha,
        nota,
        tasa_ref: pago.tasa_ref ?? null,
      },
      tx,
    )
    if (!otraCuenta) return { transaccion: primera, transaccionOtra: null }

    const segunda = await crearTransaccion(
      userId,
      otraCuenta.fondo_id,
      {
        cuenta_id: otraCuenta.id,
        categoria_id: null,
        tipo: tipo === 'gasto' ? 'ingreso' : 'gasto',
        monto_centavos: montoEnMoneda(primera.monto_centavos, primera.moneda, otraCuenta.moneda as Moneda, pago.tasa_ref ?? null),
        fecha,
        nota,
        tasa_ref: pago.tasa_ref ?? null,
      },
      tx,
    )
    // Ambas patas comparten grupo_id, como los aportes entre fondos (SPC-010).
    await tx.update(transacciones).set({ grupo_id: primera.id }).where(inArray(transacciones.id, [primera.id, segunda.id]))
    return { transaccion: primera, transaccionOtra: segunda }
  })

  const [actualizada] = await db
    .update(cuotas)
    .set({ pagada: true, fecha_pago: fecha, monto_centavos: monto })
    .where(eq(cuotas.id, cuotaId))
    .returning()

  const pendientes = await db
    .select({ id: cuotas.id })
    .from(cuotas)
    .where(and(eq(cuotas.deuda_id, deudaId), eq(cuotas.pagada, false)))
  if (pendientes.length === 0) {
    await db.update(deudas).set({ estado: 'saldada' }).where(eq(deudas.id, deudaId))
  }

  return {
    deuda: await getDeuda(userId, deudaId),
    cuota: actualizada ? cuotaPublica(actualizada, d.moneda as Moneda) : null,
    transaccion,
    transaccion_otra: transaccionOtra,
  }
}

// Edición puntual de una cuota no pagada (interés, cuota distinta).
export async function editarCuota(userId: number, deudaId: number, cuotaId: number, data: { monto_centavos?: number; fecha_vencimiento?: string }) {
  const [d] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, deudaId), eq(deudas.user_id, userId)))
    .limit(1)
  if (!d) {
    throw httpError(404, 'Deuda no encontrada')
  }
  const [c] = await db
    .select()
    .from(cuotas)
    .where(and(eq(cuotas.id, cuotaId), eq(cuotas.deuda_id, deudaId)))
    .limit(1)
  if (!c) {
    throw httpError(404, 'Cuota no encontrada')
  }
  if (c.pagada) {
    throw httpError(400, 'No se puede editar una cuota pagada')
  }
  if (data.monto_centavos != null && (!Number.isInteger(data.monto_centavos) || data.monto_centavos <= 0)) {
    throw httpError(400, 'monto_centavos debe ser un entero positivo')
  }
  if (data.fecha_vencimiento != null && !FECHA_RE.test(data.fecha_vencimiento)) {
    throw httpError(400, 'fecha_vencimiento debe usar formato YYYY-MM-DD')
  }
  const [actualizada] = await db
    .update(cuotas)
    .set({
      monto_centavos: data.monto_centavos ?? c.monto_centavos,
      fecha_vencimiento: data.fecha_vencimiento ?? c.fecha_vencimiento,
    })
    .where(eq(cuotas.id, cuotaId))
    .returning()
  return actualizada ? cuotaPublica(actualizada, d.moneda as Moneda) : null
}

// Próximas cuotas por vencer del fondo (dashboard, SPC-014).
export async function proximasCuotas(userId: number, fondoId: number, limite = 5) {
  const hoy = hoyLocal()
  const filas = await db
    .select({
      cuota_id: cuotas.id,
      numero: cuotas.numero,
      fecha_vencimiento: cuotas.fecha_vencimiento,
      monto_centavos: cuotas.monto_centavos,
      deuda_id: deudas.id,
      contraparte: deudas.contraparte,
      direccion: deudas.direccion,
      moneda: deudas.moneda,
    })
    .from(cuotas)
    .innerJoin(deudas, eq(deudas.id, cuotas.deuda_id))
    .where(and(eq(deudas.user_id, userId), eq(deudas.fondo_id, fondoId), eq(cuotas.pagada, false)))
    .orderBy(asc(cuotas.fecha_vencimiento))
    .limit(limite)
  return filas.map((f) => ({
    ...f,
    moneda: f.moneda as Moneda,
    monto_formateado: formatMoney({ centavos: f.monto_centavos, moneda: f.moneda as Moneda }),
    vencida: f.fecha_vencimiento < hoy,
  }))
}

export async function borrarDeuda(userId: number, id: number) {
  const [d] = await db
    .select()
    .from(deudas)
    .where(and(eq(deudas.id, id), eq(deudas.user_id, userId)))
    .limit(1)
  if (!d) {
    throw httpError(404, 'Deuda no encontrada')
  }
  const cs = await db.select().from(cuotas).where(eq(cuotas.deuda_id, id))
  await db.transaction(async (tx) => {
    await tx.delete(cuotas).where(eq(cuotas.deuda_id, id))
    await tx.delete(deudas).where(and(eq(deudas.id, id), eq(deudas.user_id, userId)))
  })
  return deudaPublica(d, cs, true)
}
