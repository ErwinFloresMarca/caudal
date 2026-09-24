import { and, eq } from 'drizzle-orm'
import { db } from './db'
import { cuentas } from '../db/schema'
import { listarFondos, getFondo, crearFondo, editarFondo, ocultarFondo } from './fondos'
import { listarCuentas, crearCuenta, editarCuenta, ocultarCuenta } from './cuentas'
import { listarCategorias, getCategoria, crearCategoria, editarCategoria, borrarCategoria } from './categorias'
import { crearTransaccion, listarTransacciones, getTransaccion, editarTransaccion, borrarTransaccion, type TipoTransaccion } from './transacciones'
import { crearTransferencia, getTransferencia, editarTransferencia, borrarTransferencia } from './transferencias'
import { crearAporte, listarAportes, getAporte, editarAporte, borrarAporte } from './aportes'
import { crearRecurrente, listarRecurrentes, listarPendientes, getRecurrente, editarRecurrente, borrarRecurrente, confirmarRecurrente, saltarRecurrente } from './recurrentes'
import { crearDeuda, listarDeudas, getDeuda, editarDeuda, borrarDeuda, pagarCuota, editarCuota, proximasCuotas } from './deudas'
import { crearMeta, listarMetas, getMeta, editarMeta, borrarMeta, crearAporteMeta, editarAporteMeta, borrarAporteMeta } from './metas'
import { crearPresupuesto, listarPresupuestos, editarPresupuesto, borrarPresupuesto, compensarPresupuesto } from './presupuestos'
import { getMonedaBase, setMonedaBase, getTasa, setTasa } from './ajustes'
import { generarReporte } from './reportes'
import { ultimaTasa } from './resumen'
import { resumenPeriodo, rangoMes, type MovResumen } from '../../shared/resumen'
import type { Cadencia } from '../../shared/recurrentes'
import { convertToBase, formatMoney, parseAmount, type Moneda } from '../../shared/money'

function toolError(message: string): Error {
  return new Error(message)
}

interface ToolDef {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

const FUND = { type: 'integer', description: 'ID del fondo (por defecto, el primero del usuario)' }
const FECHA = { type: 'string', description: 'Fecha YYYY-MM-DD' }
const MONTO = { type: 'string', description: 'Monto en formato humano, ej. "12,50"' }
const MONEDA = { type: 'string', enum: ['BOB', 'USD'] }

// Tools MCP (SPC-018 v2). Solo operan sobre el user_id de la API key.
export const TOOLS: ToolDef[] = [
  // Lectura
  { name: 'list_funds', description: 'Lista los fondos del usuario.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'list_accounts', description: 'Lista las cuentas de un fondo con saldo y moneda.', inputSchema: { type: 'object', properties: { fund_id: FUND }, additionalProperties: false } },
  { name: 'get_balances', description: 'Saldo por cuenta y consolidado a moneda base (tasa histórica).', inputSchema: { type: 'object', properties: { fund_id: FUND, base: MONEDA }, additionalProperties: false } },
  { name: 'list_categories', description: 'Categorías de un fondo (opcionalmente por tipo).', inputSchema: { type: 'object', properties: { fund_id: FUND, tipo: { type: 'string', enum: ['ingreso', 'gasto'] } }, required: ['fund_id'], additionalProperties: false } },
  { name: 'list_transactions', description: 'Movimientos de un fondo con filtros.', inputSchema: { type: 'object', properties: { fund_id: FUND, from: FECHA, to: FECHA, categoria: { type: 'integer' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, limite: { type: 'integer' } }, additionalProperties: false } },
  { name: 'get_month_summary', description: 'Ingresos, egresos y neto de un mes.', inputSchema: { type: 'object', properties: { fund_id: FUND, mes: { type: 'string', description: 'YYYY-MM' } }, additionalProperties: false } },
  { name: 'list_pending', description: 'Recurrentes por confirmar y próximas cuotas.', inputSchema: { type: 'object', properties: { fund_id: FUND }, additionalProperties: false } },
  { name: 'get_settings', description: 'Moneda base y tasa paralelo del usuario.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'get_rate', description: 'Tasa paralelo actual e historial.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  { name: 'get_report', description: 'Reporte del período (flujo, categorías, serie mensual, evolución).', inputSchema: { type: 'object', properties: { from: FECHA, to: FECHA, fund_ids: { type: 'array', items: { type: 'integer' } }, base: MONEDA }, additionalProperties: false } },

  // Fondos
  { name: 'create_fund', description: 'Crea un fondo.', inputSchema: { type: 'object', properties: { nombre: { type: 'string' }, tipo: { type: 'string', enum: ['personal', 'negocio'] }, moneda_base: MONEDA, color: { type: 'string' }, icono: { type: 'string' } }, required: ['nombre', 'tipo', 'moneda_base'], additionalProperties: false } },
  { name: 'update_fund', description: 'Edita un fondo (ocultar = activo:false).', inputSchema: { type: 'object', properties: { fund_id: { type: 'integer' }, nombre: { type: 'string' }, tipo: { type: 'string', enum: ['personal', 'negocio'] }, moneda_base: MONEDA, color: { type: 'string' }, icono: { type: 'string' }, activo: { type: 'boolean' } }, required: ['fund_id'], additionalProperties: false } },

  // Cuentas
  { name: 'create_account', description: 'Crea una cuenta en un fondo.', inputSchema: { type: 'object', properties: { fund_id: { type: 'integer' }, nombre: { type: 'string' }, tipo: { type: 'string', enum: ['efectivo', 'banco', 'tarjeta', 'ahorro'] }, moneda: MONEDA, saldo_inicial: MONTO }, required: ['fund_id', 'nombre', 'tipo'], additionalProperties: false } },
  { name: 'update_account', description: 'Edita una cuenta (ocultar = activo:false).', inputSchema: { type: 'object', properties: { account_id: { type: 'integer' }, nombre: { type: 'string' }, tipo: { type: 'string', enum: ['efectivo', 'banco', 'tarjeta', 'ahorro'] }, moneda: MONEDA, saldo_inicial: MONTO, activo: { type: 'boolean' } }, required: ['account_id'], additionalProperties: false } },

  // Categorías
  { name: 'create_category', description: 'Crea una categoría en un fondo.', inputSchema: { type: 'object', properties: { fund_id: { type: 'integer' }, nombre: { type: 'string' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, icono: { type: 'string' }, color: { type: 'string' } }, required: ['fund_id', 'nombre', 'tipo'], additionalProperties: false } },
  { name: 'update_category', description: 'Edita una categoría (ocultar = activa:false).', inputSchema: { type: 'object', properties: { category_id: { type: 'integer' }, nombre: { type: 'string' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, icono: { type: 'string' }, color: { type: 'string' }, activa: { type: 'boolean' } }, required: ['category_id'], additionalProperties: false } },
  { name: 'delete_category', description: 'Borra una categoría propia sin movimientos.', inputSchema: { type: 'object', properties: { category_id: { type: 'integer' } }, required: ['category_id'], additionalProperties: false } },

  // Movimientos
  { name: 'create_transaction', description: 'Registra un gasto/ingreso (monto humano).', inputSchema: { type: 'object', properties: { cuenta_id: { type: 'integer' }, categoria_id: { type: 'integer' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, monto: MONTO, fecha: FECHA, nota: { type: 'string' }, tasa_ref: { type: 'number' } }, required: ['cuenta_id', 'tipo', 'monto'], additionalProperties: false } },
  { name: 'update_transaction', description: 'Edita un movimiento (no cambia la cuenta).', inputSchema: { type: 'object', properties: { transaction_id: { type: 'integer' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, monto: MONTO, categoria_id: { type: 'integer' }, fecha: FECHA, nota: { type: 'string' }, tasa_ref: { type: 'number' } }, required: ['transaction_id', 'tipo', 'monto'], additionalProperties: false } },
  { name: 'delete_transaction', description: 'Borra un movimiento.', inputSchema: { type: 'object', properties: { transaction_id: { type: 'integer' } }, required: ['transaction_id'], additionalProperties: false } },

  // Transferencias
  { name: 'create_transfer', description: 'Transfiere entre cuentas del mismo fondo.', inputSchema: { type: 'object', properties: { cuenta_origen_id: { type: 'integer' }, cuenta_destino_id: { type: 'integer' }, monto: MONTO, fecha: FECHA, nota: { type: 'string' }, tasa_ref: { type: 'number' } }, required: ['cuenta_origen_id', 'cuenta_destino_id', 'monto'], additionalProperties: false } },
  { name: 'update_transfer', description: 'Edita una transferencia (no cambia las cuentas).', inputSchema: { type: 'object', properties: { transfer_id: { type: 'integer' }, monto: MONTO, fecha: FECHA, nota: { type: 'string' }, tasa_ref: { type: 'number' } }, required: ['transfer_id', 'monto'], additionalProperties: false } },
  { name: 'delete_transfer', description: 'Borra una transferencia.', inputSchema: { type: 'object', properties: { transfer_id: { type: 'integer' } }, required: ['transfer_id'], additionalProperties: false } },

  // Aportes/retiros
  { name: 'list_aportes', description: 'Aportes/retiros que tocan el fondo.', inputSchema: { type: 'object', properties: { fund_id: FUND }, additionalProperties: false } },
  { name: 'create_aporte', description: 'Aporte/retiro entre fondos (o externo).', inputSchema: { type: 'object', properties: { cuenta_destino_id: { type: 'integer' }, monto: MONTO, cuenta_origen_id: { type: 'integer' }, fecha: FECHA, nota: { type: 'string' }, tasa_ref: { type: 'number' } }, required: ['cuenta_destino_id', 'monto'], additionalProperties: false } },
  { name: 'update_aporte', description: 'Edita un aporte/retiro (no cambia las cuentas).', inputSchema: { type: 'object', properties: { aporte_id: { type: 'integer' }, monto: MONTO, cuenta_origen_id: { type: 'integer' }, fecha: FECHA, nota: { type: 'string' }, tasa_ref: { type: 'number' } }, required: ['aporte_id', 'monto'], additionalProperties: false } },
  { name: 'delete_aporte', description: 'Borra un aporte/retiro (ambas patas).', inputSchema: { type: 'object', properties: { aporte_id: { type: 'integer' } }, required: ['aporte_id'], additionalProperties: false } },

  // Recurrentes
  { name: 'list_recurrentes', description: 'Plantillas recurrentes de un fondo.', inputSchema: { type: 'object', properties: { fund_id: FUND }, additionalProperties: false } },
  { name: 'create_recurrente', description: 'Crea un recurrente.', inputSchema: { type: 'object', properties: { cuenta_id: { type: 'integer' }, categoria_id: { type: 'integer' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, monto: MONTO, cadencia: { type: 'object', description: '{frecuencia, dia?, dia_semana?}' }, proxima_fecha: FECHA, nota: { type: 'string' } }, required: ['cuenta_id', 'tipo', 'monto', 'cadencia'], additionalProperties: false } },
  { name: 'update_recurrente', description: 'Edita un recurrente (por defecto pausa/activa).', inputSchema: { type: 'object', properties: { recurrente_id: { type: 'integer' }, cuenta_id: { type: 'integer' }, categoria_id: { type: 'integer' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, monto: MONTO, cadencia: { type: 'object' }, proxima_fecha: FECHA, nota: { type: 'string' }, activo: { type: 'boolean' } }, required: ['recurrente_id'], additionalProperties: false } },
  { name: 'delete_recurrente', description: 'Borra un recurrente.', inputSchema: { type: 'object', properties: { recurrente_id: { type: 'integer' } }, required: ['recurrente_id'], additionalProperties: false } },
  { name: 'confirm_recurrente', description: 'Confirma un pendiente (crea el movimiento y avanza).', inputSchema: { type: 'object', properties: { recurrente_id: { type: 'integer' }, fecha: FECHA, tasa_ref: { type: 'number' } }, required: ['recurrente_id'], additionalProperties: false } },
  { name: 'skip_recurrente', description: 'Salta una ocurrencia sin crear movimiento.', inputSchema: { type: 'object', properties: { recurrente_id: { type: 'integer' } }, required: ['recurrente_id'], additionalProperties: false } },

  // Deudas/MSI
  { name: 'list_deudas', description: 'Deudas de un fondo.', inputSchema: { type: 'object', properties: { fund_id: FUND }, additionalProperties: false } },
  { name: 'get_deuda', description: 'Deuda con sus cuotas.', inputSchema: { type: 'object', properties: { deuda_id: { type: 'integer' } }, required: ['deuda_id'], additionalProperties: false } },
  { name: 'create_deuda', description: 'Crea una deuda/MSI y sus cuotas.', inputSchema: { type: 'object', properties: { contraparte: { type: 'string' }, direccion: { type: 'string', enum: ['por_pagar', 'por_cobrar'] }, monto: MONTO, moneda: MONEDA, concepto: { type: 'string' }, fecha_inicio: FECHA, num_cuotas: { type: 'integer' }, nota: { type: 'string' } }, required: ['contraparte', 'direccion', 'monto'], additionalProperties: false } },
  { name: 'update_deuda', description: 'Edita una deuda (recalcula las cuotas no pagadas).', inputSchema: { type: 'object', properties: { deuda_id: { type: 'integer' }, contraparte: { type: 'string' }, direccion: { type: 'string', enum: ['por_pagar', 'por_cobrar'] }, monto: MONTO, moneda: MONEDA, concepto: { type: 'string' }, fecha_inicio: FECHA, num_cuotas: { type: 'integer' }, nota: { type: 'string' } }, required: ['deuda_id'], additionalProperties: false } },
  { name: 'delete_deuda', description: 'Borra una deuda y sus cuotas.', inputSchema: { type: 'object', properties: { deuda_id: { type: 'integer' } }, required: ['deuda_id'], additionalProperties: false } },
  { name: 'pay_cuota', description: 'Paga una cuota (crea la transacción).', inputSchema: { type: 'object', properties: { deuda_id: { type: 'integer' }, cuota_id: { type: 'integer' }, cuenta_id: { type: 'integer' }, categoria_id: { type: 'integer' }, monto: MONTO, fecha: FECHA, tasa_ref: { type: 'number' } }, required: ['deuda_id', 'cuota_id', 'cuenta_id'], additionalProperties: false } },
  { name: 'update_cuota', description: 'Edita una cuota no pagada.', inputSchema: { type: 'object', properties: { deuda_id: { type: 'integer' }, cuota_id: { type: 'integer' }, monto: MONTO, fecha_vencimiento: FECHA }, required: ['deuda_id', 'cuota_id'], additionalProperties: false } },

  // Metas
  { name: 'list_metas', description: 'Metas de ahorro de un fondo.', inputSchema: { type: 'object', properties: { fund_id: FUND }, additionalProperties: false } },
  { name: 'get_meta', description: 'Meta con sus aportes.', inputSchema: { type: 'object', properties: { meta_id: { type: 'integer' } }, required: ['meta_id'], additionalProperties: false } },
  { name: 'create_meta', description: 'Crea una meta de ahorro.', inputSchema: { type: 'object', properties: { nombre: { type: 'string' }, monto_objetivo: MONTO, moneda: MONEDA, fecha_objetivo: FECHA }, required: ['nombre', 'monto_objetivo'], additionalProperties: false } },
  { name: 'update_meta', description: 'Edita una meta.', inputSchema: { type: 'object', properties: { meta_id: { type: 'integer' }, nombre: { type: 'string' }, monto_objetivo: MONTO, moneda: MONEDA, fecha_objetivo: FECHA, activa: { type: 'boolean' } }, required: ['meta_id'], additionalProperties: false } },
  { name: 'delete_meta', description: 'Borra una meta y sus aportes.', inputSchema: { type: 'object', properties: { meta_id: { type: 'integer' } }, required: ['meta_id'], additionalProperties: false } },
  { name: 'create_meta_contribution', description: 'Registra un aporte a una meta (negativo = retiro).', inputSchema: { type: 'object', properties: { meta_id: { type: 'integer' }, monto: MONTO, cuenta_id: { type: 'integer' }, fecha: FECHA, nota: { type: 'string' } }, required: ['meta_id', 'monto'], additionalProperties: false } },
  { name: 'update_meta_contribution', description: 'Edita un aporte a una meta.', inputSchema: { type: 'object', properties: { meta_id: { type: 'integer' }, contribution_id: { type: 'integer' }, monto: MONTO, cuenta_id: { type: 'integer' }, fecha: FECHA, nota: { type: 'string' } }, required: ['meta_id', 'contribution_id', 'monto'], additionalProperties: false } },
  { name: 'delete_meta_contribution', description: 'Borra un aporte a una meta.', inputSchema: { type: 'object', properties: { meta_id: { type: 'integer' }, contribution_id: { type: 'integer' } }, required: ['meta_id', 'contribution_id'], additionalProperties: false } },

  // Presupuestos
  { name: 'list_budgets', description: 'Presupuestos del mes (KPIs, cards, histórico).', inputSchema: { type: 'object', properties: { fund_id: FUND, mes: { type: 'string', description: 'YYYY-MM' } }, additionalProperties: false } },
  { name: 'upsert_budget', description: 'Asigna/actualiza el límite de una categoría de gasto.', inputSchema: { type: 'object', properties: { categoria_id: { type: 'integer' }, monto: MONTO, mes: { type: 'string', description: 'YYYY-MM' } }, required: ['categoria_id', 'monto'], additionalProperties: false } },
  { name: 'update_budget', description: 'Edita el límite de un presupuesto.', inputSchema: { type: 'object', properties: { budget_id: { type: 'integer' }, monto: MONTO }, required: ['budget_id', 'monto'], additionalProperties: false } },
  { name: 'delete_budget', description: 'Borra un presupuesto.', inputSchema: { type: 'object', properties: { budget_id: { type: 'integer' } }, required: ['budget_id'], additionalProperties: false } },
  { name: 'compensate_budget', description: 'Mueve límite entre dos presupuestos.', inputSchema: { type: 'object', properties: { origen_id: { type: 'integer' }, destino_id: { type: 'integer' }, monto: MONTO }, required: ['origen_id', 'destino_id', 'monto'], additionalProperties: false } },

  // Ajustes
  { name: 'update_settings', description: 'Cambia la moneda base por defecto y/o la tasa paralelo.', inputSchema: { type: 'object', properties: { moneda_base: MONEDA, tasa: { type: 'number' }, fecha: FECHA }, additionalProperties: false } },
]

async function resolverFondo(userId: number, fundId?: number) {
  if (fundId != null) {
    const f = await getFondo(userId, fundId)
    if (!f) throw toolError('fondo no encontrado')
    return f
  }
  const fondos = await listarFondos(userId)
  if (!fondos[0]) throw toolError('no hay fondos')
  return fondos[0]
}

async function fondoDeCuenta(userId: number, cuentaId: number): Promise<number> {
  const [c] = await db
    .select({ fondo_id: cuentas.fondo_id })
    .from(cuentas)
    .where(and(eq(cuentas.id, cuentaId), eq(cuentas.user_id, userId)))
    .limit(1)
  if (!c) throw toolError('cuenta no encontrada')
  return c.fondo_id
}

const montoHumano = (v: unknown): number => parseAmount(String(v ?? ''))
const hoy = () => new Date().toISOString().slice(0, 10)

function aMov(t: Awaited<ReturnType<typeof listarTransacciones>>[number]): MovResumen {
  return {
    tipo: t.tipo as 'ingreso' | 'gasto',
    monto_centavos: t.monto_centavos,
    moneda: t.moneda as Moneda,
    tasa_ref: t.tasa_ref,
    fecha: t.fecha,
    categoria_id: t.categoria?.id ?? null,
    categoria_nombre: t.categoria?.nombre ?? null,
  }
}

export async function callTool(userId: number, name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    // ---------- Lectura ----------
    case 'list_funds':
      return listarFondos(userId)

    case 'list_accounts': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      return { fondo: fondo.nombre, cuentas: await listarCuentas(userId, fondo.id) }
    }

    case 'get_balances': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      const base = (args.base === 'USD' ? 'USD' : 'BOB') as Moneda
      const cs = await listarCuentas(userId, fondo.id)
      const porMoneda = new Map<Moneda, number>()
      for (const c of cs) porMoneda.set(c.moneda as Moneda, (porMoneda.get(c.moneda as Moneda) ?? 0) + c.saldo_actual_centavos)
      const hayUsd = porMoneda.has('USD')
      const tasa = hayUsd ? await ultimaTasa(userId, fondo.id) : null
      const consolidado =
        !hayUsd || tasa != null
          ? [...porMoneda.entries()].reduce(
              (s, [moneda, centavos]) => s + convertToBase({ centavos, moneda }, moneda === 'BOB' ? undefined : (tasa ?? undefined), base).centavos,
              0,
            )
          : null
      return {
        fondo: fondo.nombre,
        por_moneda: [...porMoneda.entries()].map(([moneda, centavos]) => ({ moneda, centavos, formateado: formatMoney({ centavos, moneda }) })),
        consolidado: consolidado == null ? null : { base, centavos: consolidado, formateado: formatMoney({ centavos: consolidado, moneda: base }), tasa_ref: tasa, nota: hayUsd ? 'convertido con tasa histórica' : null },
      }
    }

    case 'list_categories': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      const cats = await listarCategorias(userId, fondo.id)
      return args.tipo ? cats.filter((c) => c.tipo === args.tipo) : cats
    }

    case 'list_transactions': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      const trx = await listarTransacciones(userId, fondo.id, { desde: args.from as string | undefined, hasta: args.to as string | undefined })
      const filtradas = trx.filter((t) => (args.categoria == null || t.categoria?.id === args.categoria) && (args.tipo == null || t.tipo === args.tipo))
      return filtradas.slice(0, Number.isInteger(args.limite) ? Number(args.limite) : 50)
    }

    case 'get_month_summary': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      const mes = typeof args.mes === 'string' && /^\d{4}-\d{2}$/.test(args.mes) ? args.mes : new Date().toISOString().slice(0, 7)
      const rango = rangoMes(`${mes}-01`)
      const trx = await listarTransacciones(userId, fondo.id, { desde: rango.desde, hasta: rango.hasta })
      return { fondo: fondo.nombre, mes, ...resumenPeriodo(trx.map(aMov), { desde: rango.desde, hasta: rango.hasta }) }
    }

    case 'list_pending': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      const [recurrentes, cuotas] = await Promise.all([listarPendientes(userId, fondo.id), proximasCuotas(userId, fondo.id)])
      return { fondo: fondo.nombre, recurrentes, cuotas }
    }

    case 'get_settings':
      return { moneda_base: await getMonedaBase(userId), tasa: await getTasa(userId) }

    case 'get_rate':
      return getTasa(userId)

    case 'get_report': {
      const desde = typeof args.from === 'string' ? args.from : undefined
      const hasta = typeof args.to === 'string' ? args.to : undefined
      const fondoIds = Array.isArray(args.fund_ids) ? (args.fund_ids as number[]) : undefined
      const base = (args.base === 'USD' ? 'USD' : 'BOB') as Moneda
      return generarReporte(userId, { fondoIds, desde: desde ?? rangoMes(hoy()).desde, hasta: hasta ?? hoy(), base })
    }

    // ---------- Fondos ----------
    case 'create_fund':
      return crearFondo(userId, { nombre: String(args.nombre), tipo: String(args.tipo) as 'personal' | 'negocio', moneda_base: String(args.moneda_base) as Moneda, color: (args.color as string) ?? null, icono: (args.icono as string) ?? null })

    case 'update_fund': {
      const fundId = Number(args.fund_id)
      if (args.activo === false) return ocultarFondo(userId, fundId)
      const cur = await resolverFondo(userId, fundId)
      return editarFondo(userId, fundId, {
        nombre: (args.nombre as string) ?? cur.nombre,
        tipo: ((args.tipo as string) ?? cur.tipo) as 'personal' | 'negocio',
        moneda_base: ((args.moneda_base as string) ?? cur.moneda_base) as Moneda,
        color: args.color === undefined ? cur.color : (args.color as string),
        icono: args.icono === undefined ? cur.icono : (args.icono as string),
        activo: args.activo === undefined ? cur.activo : Boolean(args.activo),
      })
    }

    // ---------- Cuentas ----------
    case 'create_account': {
      const fundId = Number(args.fund_id)
      if (!Number.isInteger(fundId)) throw toolError('fund_id inválido')
      await resolverFondo(userId, fundId)
      return crearCuenta(userId, fundId, {
        nombre: String(args.nombre),
        tipo: String(args.tipo) as 'efectivo' | 'banco' | 'tarjeta' | 'ahorro',
        moneda: (args.moneda as string) as Moneda | undefined,
        saldo_inicial_centavos: args.saldo_inicial == null ? undefined : montoHumano(args.saldo_inicial),
      })
    }

    case 'update_account': {
      const accountId = Number(args.account_id)
      if (args.activo === false) {
        const o = await ocultarCuenta(userId, accountId)
        if (!o) throw toolError('cuenta no encontrada')
        return o
      }
      const out = await editarCuenta(userId, accountId, {
        nombre: args.nombre as string | undefined,
        tipo: args.tipo as 'efectivo' | 'banco' | 'tarjeta' | 'ahorro' | undefined,
        moneda: args.moneda as Moneda | undefined,
        saldo_inicial_centavos: args.saldo_inicial == null ? undefined : montoHumano(args.saldo_inicial),
        activa: args.activo == null ? undefined : Boolean(args.activo),
      })
      if (!out) throw toolError('cuenta no encontrada')
      return out
    }

    // ---------- Categorías ----------
    case 'create_category': {
      const cat = await crearCategoria(userId, Number(args.fund_id), {
        nombre: String(args.nombre),
        tipo: String(args.tipo) as 'ingreso' | 'gasto',
        icono: (args.icono as string) ?? null,
        color: (args.color as string) ?? null,
      })
      return cat
    }

    case 'update_category': {
      const id = Number(args.category_id)
      const cur = await getCategoria(userId, id)
      if (!cur) throw toolError('categoría no encontrada')
      return editarCategoria(userId, id, {
        nombre: (args.nombre as string) ?? cur.nombre,
        tipo: ((args.tipo as string) ?? cur.tipo) as 'ingreso' | 'gasto',
        icono: args.icono === undefined ? cur.icono : (args.icono as string),
        color: args.color === undefined ? cur.color : (args.color as string),
        activa: args.activa === undefined ? cur.activa : Boolean(args.activa),
      })
    }

    case 'delete_category':
      return borrarCategoria(userId, Number(args.category_id))

    // ---------- Movimientos ----------
    case 'create_transaction': {
      const cuentaId = Number(args.cuenta_id)
      if (!Number.isInteger(cuentaId) || cuentaId <= 0) throw toolError('cuenta_id inválido')
      const tipo = String(args.tipo)
      if (tipo !== 'ingreso' && tipo !== 'gasto') throw toolError('tipo debe ser ingreso o gasto')
      const fondoId = await fondoDeCuenta(userId, cuentaId)
      return crearTransaccion(userId, fondoId, {
        cuenta_id: cuentaId,
        categoria_id: args.categoria_id == null ? null : Number(args.categoria_id),
        tipo: tipo as TipoTransaccion,
        monto_centavos: montoHumano(args.monto),
        fecha: args.fecha as string | undefined,
        nota: (args.nota as string) ?? null,
        tasa_ref: args.tasa_ref == null ? null : Number(args.tasa_ref),
        fuente: 'asistente',
      })
    }

    case 'update_transaction': {
      const id = Number(args.transaction_id)
      const cur = await getTransaccion(userId, id)
      if (!cur) throw toolError('movimiento no encontrado')
      const out = await editarTransaccion(userId, id, {
        cuenta_id: cur.cuenta_id,
        categoria_id: args.categoria_id == null ? cur.categoria?.id ?? null : Number(args.categoria_id),
        tipo: String(args.tipo) as TipoTransaccion,
        monto_centavos: montoHumano(args.monto),
        fecha: args.fecha as string | undefined,
        nota: args.nota === undefined ? cur.nota : (args.nota as string),
        tasa_ref: args.tasa_ref == null ? cur.tasa_ref : Number(args.tasa_ref),
      })
      if (!out) throw toolError('movimiento no encontrado')
      return out
    }

    case 'delete_transaction':
      return borrarTransaccion(userId, Number(args.transaction_id))

    // ---------- Transferencias ----------
    case 'create_transfer': {
      const origen = Number(args.cuenta_origen_id)
      const destino = Number(args.cuenta_destino_id)
      if (!Number.isInteger(origen) || !Number.isInteger(destino)) throw toolError('cuentas inválidas')
      const fondoId = await fondoDeCuenta(userId, origen)
      return crearTransferencia(userId, fondoId, {
        cuenta_origen_id: origen,
        cuenta_destino_id: destino,
        monto_origen_centavos: montoHumano(args.monto),
        tasa_ref: args.tasa_ref == null ? null : Number(args.tasa_ref),
        fecha: args.fecha as string | undefined,
        nota: (args.nota as string) ?? null,
      })
    }

    case 'update_transfer': {
      const id = Number(args.transfer_id)
      const cur = await getTransferencia(userId, id)
      if (!cur) throw toolError('transferencia no encontrada')
      const out = await editarTransferencia(userId, id, {
        cuenta_origen_id: cur.cuenta_origen_id,
        cuenta_destino_id: cur.cuenta_destino_id,
        monto_origen_centavos: montoHumano(args.monto),
        tasa_ref: args.tasa_ref == null ? cur.tasa_ref : Number(args.tasa_ref),
        fecha: args.fecha as string | undefined,
        nota: args.nota === undefined ? cur.nota : (args.nota as string),
      })
      if (!out) throw toolError('transferencia no encontrada')
      return out
    }

    case 'delete_transfer':
      return borrarTransferencia(userId, Number(args.transfer_id))

    // ---------- Aportes/retiros ----------
    case 'list_aportes': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      return listarAportes(userId, fondo.id)
    }

    case 'create_aporte':
      return crearAporte(userId, {
        cuenta_destino_id: Number(args.cuenta_destino_id),
        monto_destino_centavos: montoHumano(args.monto),
        cuenta_origen_id: args.cuenta_origen_id == null ? null : Number(args.cuenta_origen_id),
        tasa_ref: args.tasa_ref == null ? null : Number(args.tasa_ref),
        fecha: args.fecha as string | undefined,
        nota: (args.nota as string) ?? null,
      })

    case 'update_aporte': {
      const id = Number(args.aporte_id)
      const cur = await getAporte(userId, id)
      if (!cur?.destino) throw toolError('aporte no encontrado')
      return editarAporte(userId, id, {
        cuenta_destino_id: cur.destino.cuenta_id,
        monto_destino_centavos: montoHumano(args.monto),
        cuenta_origen_id: cur.origen?.cuenta_id ?? null,
        tasa_ref: args.tasa_ref == null ? (cur.destino.tasa_ref ?? cur.origen?.tasa_ref ?? null) : Number(args.tasa_ref),
        fecha: args.fecha as string | undefined,
        nota: args.nota === undefined ? cur.nota : (args.nota as string),
      })
    }

    case 'delete_aporte':
      return borrarAporte(userId, Number(args.aporte_id))

    // ---------- Recurrentes ----------
    case 'list_recurrentes': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      return listarRecurrentes(userId, fondo.id)
    }

    case 'create_recurrente': {
      const cuentaId = Number(args.cuenta_id)
      const fondoId = await fondoDeCuenta(userId, cuentaId)
      return crearRecurrente(userId, fondoId, {
        cuenta_id: cuentaId,
        categoria_id: args.categoria_id == null ? null : Number(args.categoria_id),
        tipo: String(args.tipo) as TipoTransaccion,
        monto_centavos: montoHumano(args.monto),
        cadencia: args.cadencia as Cadencia,
        proxima_fecha: args.proxima_fecha as string | undefined,
        nota: (args.nota as string) ?? null,
      })
    }

    case 'update_recurrente': {
      const id = Number(args.recurrente_id)
      const cur = await getRecurrente(userId, id)
      if (!cur) throw toolError('recurrente no encontrado')
      return editarRecurrente(userId, id, {
        cuenta_id: args.cuenta_id == null ? cur.cuenta_id : Number(args.cuenta_id),
        categoria_id: args.categoria_id === undefined ? cur.categoria_id : (args.categoria_id == null ? null : Number(args.categoria_id)),
        tipo: ((args.tipo as string) ?? cur.tipo) as TipoTransaccion,
        monto_centavos: args.monto == null ? cur.monto_centavos : montoHumano(args.monto),
        cadencia: (args.cadencia ?? cur.cadencia) as Cadencia,
        proxima_fecha: args.proxima_fecha == null ? cur.proxima_fecha : String(args.proxima_fecha),
        nota: args.nota === undefined ? cur.nota : (args.nota as string),
        activo: args.activo === undefined ? cur.activo : Boolean(args.activo),
      })
    }

    case 'delete_recurrente':
      return borrarRecurrente(userId, Number(args.recurrente_id))

    case 'confirm_recurrente':
      return confirmarRecurrente(userId, Number(args.recurrente_id), { fecha: args.fecha as string | undefined, tasa_ref: args.tasa_ref == null ? null : Number(args.tasa_ref) })

    case 'skip_recurrente':
      return saltarRecurrente(userId, Number(args.recurrente_id))

    // ---------- Deudas/MSI ----------
    case 'list_deudas': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      return listarDeudas(userId, fondo.id)
    }

    case 'get_deuda':
      return getDeuda(userId, Number(args.deuda_id))

    case 'create_deuda': {
      const cuentaFondo = await resolverFondo(userId, args.fund_id as number | undefined)
      return crearDeuda(userId, cuentaFondo.id, {
        contraparte: String(args.contraparte),
        direccion: String(args.direccion) as 'por_pagar' | 'por_cobrar',
        monto_total_centavos: montoHumano(args.monto),
        moneda: ((args.moneda as string) ?? 'BOB') as Moneda,
        concepto: (args.concepto as string) ?? null,
        fecha_inicio: args.fecha_inicio as string | undefined,
        num_cuotas: args.num_cuotas == null ? 1 : Number(args.num_cuotas),
        nota: (args.nota as string) ?? null,
      })
    }

    case 'update_deuda': {
      const id = Number(args.deuda_id)
      const cur = await getDeuda(userId, id)
      if (!cur) throw toolError('deuda no encontrada')
      return editarDeuda(userId, id, {
        contraparte: (args.contraparte as string) ?? cur.contraparte,
        direccion: ((args.direccion as string) ?? cur.direccion) as 'por_pagar' | 'por_cobrar',
        monto_total_centavos: args.monto == null ? cur.monto_total_centavos : montoHumano(args.monto),
        moneda: ((args.moneda as string) ?? cur.moneda) as Moneda,
        concepto: args.concepto === undefined ? cur.concepto : (args.concepto as string),
        fecha_inicio: args.fecha_inicio == null ? cur.fecha_inicio : String(args.fecha_inicio),
        num_cuotas: args.num_cuotas == null ? cur.num_cuotas : Number(args.num_cuotas),
        nota: args.nota === undefined ? cur.nota : (args.nota as string),
      })
    }

    case 'delete_deuda':
      return borrarDeuda(userId, Number(args.deuda_id))

    case 'pay_cuota':
      return pagarCuota(userId, Number(args.deuda_id), Number(args.cuota_id), {
        cuenta_id: Number(args.cuenta_id),
        categoria_id: args.categoria_id == null ? null : Number(args.categoria_id),
        monto_centavos: args.monto == null ? undefined : montoHumano(args.monto),
        fecha: args.fecha as string | undefined,
        tasa_ref: args.tasa_ref == null ? null : Number(args.tasa_ref),
      })

    case 'update_cuota':
      return editarCuota(userId, Number(args.deuda_id), Number(args.cuota_id), {
        monto_centavos: args.monto == null ? undefined : montoHumano(args.monto),
        fecha_vencimiento: args.fecha_vencimiento as string | undefined,
      })

    // ---------- Metas ----------
    case 'list_metas': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      return listarMetas(userId, fondo.id)
    }

    case 'get_meta':
      return getMeta(userId, Number(args.meta_id))

    case 'create_meta': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      return crearMeta(userId, fondo.id, {
        nombre: String(args.nombre),
        monto_objetivo_centavos: montoHumano(args.monto_objetivo),
        moneda: ((args.moneda as string) ?? 'BOB') as Moneda,
        fecha_objetivo: (args.fecha_objetivo as string) ?? null,
      })
    }

    case 'update_meta': {
      const id = Number(args.meta_id)
      const cur = await getMeta(userId, id)
      if (!cur) throw toolError('meta no encontrada')
      return editarMeta(userId, id, {
        nombre: (args.nombre as string) ?? cur.nombre,
        monto_objetivo_centavos: args.monto_objetivo == null ? cur.monto_objetivo_centavos : montoHumano(args.monto_objetivo),
        moneda: ((args.moneda as string) ?? cur.moneda) as Moneda,
        fecha_objetivo: args.fecha_objetivo === undefined ? cur.fecha_objetivo : (args.fecha_objetivo as string),
        activa: args.activa === undefined ? cur.activa : Boolean(args.activa),
      })
    }

    case 'delete_meta':
      return borrarMeta(userId, Number(args.meta_id))

    case 'create_meta_contribution':
      return crearAporteMeta(userId, Number(args.meta_id), {
        monto_centavos: montoHumano(args.monto),
        cuenta_id: args.cuenta_id == null ? null : Number(args.cuenta_id),
        fecha: args.fecha as string | undefined,
        nota: (args.nota as string) ?? null,
      })

    case 'update_meta_contribution':
      return editarAporteMeta(userId, Number(args.meta_id), Number(args.contribution_id), {
        monto_centavos: montoHumano(args.monto),
        cuenta_id: args.cuenta_id == null ? null : Number(args.cuenta_id),
        fecha: args.fecha as string | undefined,
        nota: (args.nota as string) ?? null,
      })

    case 'delete_meta_contribution':
      return borrarAporteMeta(userId, Number(args.meta_id), Number(args.contribution_id))

    // ---------- Presupuestos ----------
    case 'list_budgets': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      const mes = typeof args.mes === 'string' && /^\d{4}-\d{2}$/.test(args.mes) ? args.mes : new Date().toISOString().slice(0, 7)
      return listarPresupuestos(userId, fondo.id, mes)
    }

    case 'upsert_budget': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      const mes = typeof args.mes === 'string' && /^\d{4}-\d{2}$/.test(args.mes) ? args.mes : new Date().toISOString().slice(0, 7)
      return crearPresupuesto(userId, fondo.id, { categoria_id: Number(args.categoria_id), mes, monto_limite_centavos: montoHumano(args.monto) })
    }

    case 'update_budget':
      return editarPresupuesto(userId, Number(args.budget_id), { monto_limite_centavos: montoHumano(args.monto) })

    case 'delete_budget':
      return borrarPresupuesto(userId, Number(args.budget_id))

    case 'compensate_budget':
      return compensarPresupuesto(userId, { origen_id: Number(args.origen_id), destino_id: Number(args.destino_id), monto: montoHumano(args.monto) })

    // ---------- Ajustes ----------
    case 'update_settings': {
      if (args.moneda_base != null) await setMonedaBase(userId, args.moneda_base)
      if (args.tasa != null) await setTasa(userId, { valor: Number(args.tasa), fecha: args.fecha as string | undefined })
      return { moneda_base: await getMonedaBase(userId), tasa: await getTasa(userId) }
    }

    default:
      throw toolError(`tool desconocida: ${name}`)
  }
}
