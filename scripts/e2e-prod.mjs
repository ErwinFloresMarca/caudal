// Verificación end-to-end contra un entorno real (por defecto producción).
//   BASE_URL=https://caudal.erfm.dev node scripts/e2e-prod.mjs
// Recorre el flujo completo de v1: usuario → fondo/cuentas → movimientos →
// transferencia → aporte → cuota → meta → reporte → transacción vía MCP.
const BASE = process.env.BASE_URL ?? 'https://caudal.erfm.dev'

let cookie = ''
const resultados = []
function check(nombre, ok, extra = '') {
  resultados.push({ nombre, ok, extra })
  console.log(`${ok ? '✓' : '✗'} ${nombre}${extra ? ` — ${extra}` : ''}`)
}

async function api(path, { method = 'GET', body, bearer } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0]
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, data }
}

const hoy = new Date().toISOString().slice(0, 10)
const mes = hoy.slice(0, 7)
const rango = (() => {
  const [y, m] = mes.split('-').map(Number)
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimo).padStart(2, '0')}` }
})()

// 1) Usuario nuevo
const email = `e2e-${Date.now()}@caudal.test`
const reg = await api('/api/auth/register', { method: 'POST', body: { email, password: 'clave-segura-123', name: 'E2E', moneda_base: 'BOB' } })
check('registro de usuario nuevo', reg.status === 200 && reg.data.id > 0)

// 2) Fondo + cuentas
const personal = await api('/api/fondos', { method: 'POST', body: { nombre: 'Personal E2E', tipo: 'personal', moneda_base: 'BOB' } })
const fondoId = personal.data.id
const caja = await api(`/api/fondos/${fondoId}/cuentas`, { method: 'POST', body: { nombre: 'Efectivo', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 100000 } })
const banco = await api(`/api/fondos/${fondoId}/cuentas`, { method: 'POST', body: { nombre: 'Banco', tipo: 'banco', moneda: 'BOB', saldo_inicial_centavos: 0 } })
const cajaId = caja.data.cuenta.id
const bancoId = banco.data.cuenta.id
check('fondo + cuentas', !!fondoId && !!cajaId && !!bancoId)

const cats = await api(`/api/fondos/${fondoId}/categorias`)
const catGasto = cats.data.categorias.find((c) => c.tipo === 'gasto').id
const catIngreso = cats.data.categorias.find((c) => c.tipo === 'ingreso').id

// 3) Ingreso + gasto
const ing = await api('/api/movimientos', { method: 'POST', body: { cuenta_id: cajaId, categoria_id: catIngreso, tipo: 'ingreso', monto_centavos: 500000, fecha: hoy, nota: 'Sueldo E2E' } })
const gas = await api('/api/movimientos', { method: 'POST', body: { cuenta_id: cajaId, categoria_id: catGasto, tipo: 'gasto', monto_centavos: 12050, fecha: hoy, nota: 'Mercado E2E' } })
check('registrar ingreso y gasto', ing.status === 200 && gas.status === 200)

// 4) Transferencia intra-fondo
const transf = await api('/api/transferencias', { method: 'POST', body: { cuenta_origen_id: cajaId, cuenta_destino_id: bancoId, monto_origen_centavos: 50000, fecha: hoy, nota: 'Traslado E2E' } })
check('transferencia entre cuentas', transf.status === 200 && transf.data.transferencia.monto_destino_centavos === 50000)

// 5) Aporte entre fondos
const negocio = await api('/api/fondos', { method: 'POST', body: { nombre: 'Negocio E2E', tipo: 'negocio', moneda_base: 'BOB' } })
const cajaN = await api(`/api/fondos/${negocio.data.id}/cuentas`, { method: 'POST', body: { nombre: 'Caja', tipo: 'efectivo', moneda: 'BOB', saldo_inicial_centavos: 0 } })
const aporte = await api('/api/aportes', { method: 'POST', body: { cuenta_destino_id: cajaN.data.cuenta.id, monto_destino_centavos: 30000, cuenta_origen_id: cajaId, fecha: hoy, nota: 'Aporte E2E' } })
check('aporte entre fondos', aporte.status === 200 && aporte.data.aporte.destino.monto_centavos === 30000)

// 6) Deuda + pagar cuota
const deuda = await api('/api/deudas', { method: 'POST', body: { contraparte: 'Banco E2E', direccion: 'por_pagar', monto_total_centavos: 20000, moneda: 'BOB', fecha_inicio: hoy, num_cuotas: 2 } })
const cuotaId = deuda.data.deuda.cuotas[0].id
const pago = await api(`/api/deudas/${deuda.data.deuda.id}/cuotas/${cuotaId}/pagar`, { method: 'POST', body: { cuenta_id: cajaId, categoria_id: catGasto, fecha: hoy } })
check('pagar cuota de deuda', pago.status === 200 && pago.data.cuota.pagada === true)

// 7) Meta + aporte
const meta = await api('/api/metas', { method: 'POST', body: { nombre: 'Meta E2E', monto_objetivo_centavos: 100000, moneda: 'BOB' } })
const apMeta = await api(`/api/metas/${meta.data.meta.id}/aportes`, { method: 'POST', body: { monto_centavos: 25000, fecha: hoy } })
check('meta + aporte', apMeta.status === 200 && apMeta.data.meta.progreso.porcentaje === 25)

// 8) Reporte del período
const reporte = await api(`/api/reportes?desde=${rango.desde}&hasta=${rango.hasta}&base=BOB`)
check('reporte del período', reporte.status === 200 && reporte.data.reporte.flujo.consolidado.neto_centavos !== undefined, `neto=${reporte.data.reporte?.flujo?.consolidado?.neto_centavos}`)

// 9) MCP: crear transacción con API key
const key = await api('/api/api-keys', { method: 'POST', body: { nombre: 'e2e-mcp' } })
const rpc = await api('/api/mcp', {
  method: 'POST',
  bearer: key.data.key,
  body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'create_transaction', arguments: { cuenta_id: cajaId, categoria_id: catGasto, tipo: 'gasto', monto: '1,00', nota: 'MCP E2E' } } },
})
const mcpOk = rpc.status === 200 && rpc.data.result && !rpc.data.result.isError
check('MCP create_transaction', mcpOk, mcpOk ? '' : JSON.stringify(rpc.data).slice(0, 120))

const movs = await api(`/api/movimientos?desde=${hoy}&hasta=${hoy}&limite=50`)
const creado = movs.data.transacciones.find((t) => t.nota === 'MCP E2E')
check('movimiento MCP visible con fuente=asistente', !!creado && creado.fuente === 'asistente')

const fallos = resultados.filter((r) => !r.ok).length
console.log(`\n${resultados.length - fallos}/${resultados.length} checks OK en ${BASE}`)
process.exit(fallos === 0 ? 0 : 1)
