import { and, eq } from 'drizzle-orm'
import { db } from './db'
import { cuentas } from '../db/schema'
import { listarFondos, getFondo } from './fondos'
import { listarCuentas } from './cuentas'
import { listarCategorias } from './categorias'
import { crearTransaccion, listarTransacciones, type TipoTransaccion } from './transacciones'
import { crearTransferencia } from './transferencias'
import { listarPendientes } from './recurrentes'
import { proximasCuotas } from './deudas'
import { ultimaTasa } from './resumen'
import { resumenPeriodo, rangoMes, type MovResumen } from '../../shared/resumen'
import { convertToBase, formatMoney, type Moneda } from '../../shared/money'
import { parseAmount } from '../../shared/money'

// Errores de tool en texto claro (se devuelven como JSON-RPC result con isError).
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

// Set de tools v1 (SPC-018). Solo operan sobre el user_id de la API key.
export const TOOLS: ToolDef[] = [
  { name: 'list_funds', description: 'Lista los fondos del usuario.', inputSchema: { type: 'object', properties: {}, additionalProperties: false } },
  {
    name: 'list_accounts',
    description: 'Lista las cuentas de un fondo con su saldo actual y moneda.',
    inputSchema: { type: 'object', properties: { fund_id: FUND }, additionalProperties: false },
  },
  {
    name: 'get_balances',
    description: 'Saldo por cuenta y consolidado a moneda base (con tasa histórica).',
    inputSchema: { type: 'object', properties: { fund_id: FUND, base: { type: 'string', enum: ['BOB', 'USD'] } }, additionalProperties: false },
  },
  {
    name: 'list_categories',
    description: 'Lista las categorías de un fondo (opcionalmente filtradas por tipo).',
    inputSchema: { type: 'object', properties: { fund_id: FUND, tipo: { type: 'string', enum: ['ingreso', 'gasto'] } }, required: ['fund_id'], additionalProperties: false },
  },
  {
    name: 'list_transactions',
    description: 'Lista movimientos de un fondo con filtros opcionales.',
    inputSchema: {
      type: 'object',
      properties: { fund_id: FUND, from: FECHA, to: FECHA, categoria: { type: 'integer' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, limite: { type: 'integer' } },
      additionalProperties: false,
    },
  },
  {
    name: 'create_transaction',
    description: 'Registra un gasto o ingreso. `monto` en formato humano (ej. "12,50").',
    inputSchema: {
      type: 'object',
      properties: { cuenta_id: { type: 'integer' }, categoria_id: { type: 'integer' }, tipo: { type: 'string', enum: ['ingreso', 'gasto'] }, monto: { type: 'string' }, fecha: FECHA, nota: { type: 'string' }, tasa_ref: { type: 'number' } },
      required: ['cuenta_id', 'tipo', 'monto'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_transfer',
    description: 'Transfiere entre dos cuentas del mismo fondo.',
    inputSchema: {
      type: 'object',
      properties: { cuenta_origen_id: { type: 'integer' }, cuenta_destino_id: { type: 'integer' }, monto: { type: 'string' }, fecha: FECHA, nota: { type: 'string' }, tasa_ref: { type: 'number' } },
      required: ['cuenta_origen_id', 'cuenta_destino_id', 'monto'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_month_summary',
    description: 'Ingresos, egresos y neto de un mes (por defecto, el actual).',
    inputSchema: { type: 'object', properties: { fund_id: FUND, mes: { type: 'string', description: 'YYYY-MM' } }, additionalProperties: false },
  },
  {
    name: 'list_pending',
    description: 'Recurrentes por confirmar y próximas cuotas de deuda.',
    inputSchema: { type: 'object', properties: { fund_id: FUND }, additionalProperties: false },
  },
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

// Fondo de una cuenta del usuario (para derivar el fondo en create_*).
async function fondoDeCuenta(userId: number, cuentaId: number): Promise<number> {
  const [c] = await db
    .select({ fondo_id: cuentas.fondo_id })
    .from(cuentas)
    .where(and(eq(cuentas.id, cuentaId), eq(cuentas.user_id, userId)))
    .limit(1)
  if (!c) throw toolError('cuenta no encontrada')
  return c.fondo_id
}

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
      const filtradas = trx.filter(
        (t) => (args.categoria == null || t.categoria?.id === args.categoria) && (args.tipo == null || t.tipo === args.tipo),
      )
      const limite = Number.isInteger(args.limite) ? Number(args.limite) : 50
      return filtradas.slice(0, limite)
    }

    case 'create_transaction': {
      const cuentaId = Number(args.cuenta_id)
      if (!Number.isInteger(cuentaId) || cuentaId <= 0) throw toolError('cuenta_id inválido')
      const tipo = String(args.tipo)
      if (tipo !== 'ingreso' && tipo !== 'gasto') throw toolError('tipo debe ser ingreso o gasto')
      const monto = parseAmount(String(args.monto ?? ''))
      const fondoId = await fondoDeCuenta(userId, cuentaId)
      const trx = await crearTransaccion(userId, fondoId, {
        cuenta_id: cuentaId,
        categoria_id: args.categoria_id == null ? null : Number(args.categoria_id),
        tipo: tipo as TipoTransaccion,
        monto_centavos: monto,
        fecha: args.fecha as string | undefined,
        nota: (args.nota as string | undefined) ?? null,
        tasa_ref: args.tasa_ref == null ? null : Number(args.tasa_ref),
        fuente: 'asistente',
      })
      return trx
    }

    case 'create_transfer': {
      const origen = Number(args.cuenta_origen_id)
      const destino = Number(args.cuenta_destino_id)
      if (!Number.isInteger(origen) || !Number.isInteger(destino)) throw toolError('cuentas inválidas')
      const monto = parseAmount(String(args.monto ?? ''))
      const fondoId = await fondoDeCuenta(userId, origen)
      return crearTransferencia(userId, fondoId, {
        cuenta_origen_id: origen,
        cuenta_destino_id: destino,
        monto_origen_centavos: monto,
        tasa_ref: args.tasa_ref == null ? null : Number(args.tasa_ref),
        fecha: args.fecha as string | undefined,
        nota: (args.nota as string | undefined) ?? null,
      })
    }

    case 'get_month_summary': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      const mes = typeof args.mes === 'string' && /^\d{4}-\d{2}$/.test(args.mes) ? args.mes : new Date().toISOString().slice(0, 7)
      const rango = rangoMes(`${mes}-01`)
      const trx = await listarTransacciones(userId, fondo.id, { desde: rango.desde, hasta: rango.hasta })
      const resumen = resumenPeriodo(trx.map(aMov), { desde: rango.desde, hasta: rango.hasta })
      return { fondo: fondo.nombre, mes, ...resumen }
    }

    case 'list_pending': {
      const fondo = await resolverFondo(userId, args.fund_id as number | undefined)
      const [recurrentes, cuotas] = await Promise.all([listarPendientes(userId, fondo.id), proximasCuotas(userId, fondo.id)])
      return { fondo: fondo.nombre, recurrentes, cuotas }
    }

    default:
      throw toolError(`tool desconocida: ${name}`)
  }
}
