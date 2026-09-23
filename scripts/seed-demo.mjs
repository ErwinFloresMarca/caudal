// Siembra datos de demo vía la API (para capturas y prueba manual).
//   BASE_URL=http://127.0.0.1:3071 node scripts/seed-demo.mjs
// Crea un usuario demo con fondos, cuentas, movimientos, transferencias,
// aportes, recurrentes, deudas, metas y presupuestos. Si el usuario ya tiene
// fondos, no vuelve a sembrar (idempotente por usuario).
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3071'
const EMAIL = process.env.DEMO_EMAIL ?? 'demo@caudal.test'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'demo-caudal-123'

let cookie = ''

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) cookie = setCookie.split(';')[0]
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`)
  return data
}

const hoy = new Date()
const iso = (diasAtras = 0) => {
  const d = new Date(hoy)
  d.setDate(d.getDate() - diasAtras)
  return d.toISOString().slice(0, 10)
}
const mes = hoy.toISOString().slice(0, 7)

// 1) usuario
try {
  await api('/api/auth/register', { method: 'POST', body: { email: EMAIL, password: PASSWORD, name: 'Demo' } })
  console.log('· usuario demo creado')
} catch {
  await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })
  console.log('· usuario demo existente (login)')
}

const { fondos } = await api('/api/fondos')
if (fondos.length > 0) {
  console.log('· ya hay fondos, no se vuelve a sembrar')
  process.exit(0)
}

async function fondo(nombre, tipo, moneda_base) {
  const f = await api('/api/fondos', { method: 'POST', body: { nombre, tipo, moneda_base } })
  return f.id
}
async function cuenta(fondoId, nombre, tipo, moneda, saldo) {
  const r = await api(`/api/fondos/${fondoId}/cuentas`, { method: 'POST', body: { nombre, tipo, moneda, saldo_inicial_centavos: saldo } })
  return r.cuenta.id
}
async function categorias(fondoId) {
  const { categorias } = await api(`/api/fondos/${fondoId}/categorias`)
  return categorias
}
async function activo(id) {
  await api('/api/fondos/activo', { method: 'POST', body: { id } })
}
async function movimiento(m) {
  return api('/api/movimientos', { method: 'POST', body: m })
}

// 2) fondo Personal (BOB)
const personal = await fondo('Personal', 'personal', 'BOB')
const efectivo = await cuenta(personal, 'Efectivo', 'efectivo', 'BOB', 235000)
const banco = await cuenta(personal, 'BNB Banco', 'banco', 'BOB', 812000)
const visa = await cuenta(personal, 'BNB Visa', 'tarjeta', 'BOB', 94050)
const ahorroUsd = await cuenta(personal, 'Ahorro USD', 'ahorro', 'USD', 115000)
const catsP = await categorias(personal)
const cat = (nombre, tipo) => catsP.find((c) => c.nombre === nombre && c.tipo === tipo)?.id

await activo(personal)
await movimiento({ cuenta_id: efectivo, categoria_id: cat('Sueldo', 'ingreso'), tipo: 'ingreso', monto_centavos: 450000, fecha: iso(3), nota: 'Sueldo de marzo' })
await movimiento({ cuenta_id: visa, categoria_id: cat('Comida', 'gasto'), tipo: 'gasto', monto_centavos: 12050, fecha: iso(2), nota: 'Mercado' })
await movimiento({ cuenta_id: banco, categoria_id: cat('Vivienda', 'gasto'), tipo: 'gasto', monto_centavos: 180000, fecha: iso(2), nota: 'Alquiler departamento' })
await movimiento({ cuenta_id: efectivo, categoria_id: cat('Ocio', 'gasto'), tipo: 'gasto', monto_centavos: 3500, fecha: iso(1), nota: 'Streaming' })
await movimiento({ cuenta_id: ahorroUsd, categoria_id: cat('Otros', 'ingreso'), tipo: 'ingreso', monto_centavos: 4500, tasa_ref: 6.96, fecha: iso(1), nota: 'Venta freelance' })
await movimiento({ cuenta_id: efectivo, categoria_id: cat('Transporte', 'gasto'), tipo: 'gasto', monto_centavos: 2500, fecha: iso(0), nota: 'Taxi' })

// 3) transferencia (mismo fondo)
await api('/api/transferencias', { method: 'POST', body: { cuenta_origen_id: banco, cuenta_destino_id: efectivo, monto_origen_centavos: 50000, fecha: iso(1), nota: 'Retiro cajero' } })

// 4) recurrentes (uno vencido → pendiente)
await api('/api/recurrentes', { method: 'POST', body: { cuenta_id: banco, categoria_id: cat('Vivienda', 'gasto'), tipo: 'gasto', monto_centavos: 180000, cadencia: { frecuencia: 'mensual' }, proxima_fecha: iso(5), nota: 'Alquiler' } })
await api('/api/recurrentes', { method: 'POST', body: { cuenta_id: efectivo, categoria_id: cat('Ocio', 'gasto'), tipo: 'gasto', monto_centavos: 3500, cadencia: { frecuencia: 'mensual' }, proxima_fecha: iso(1), nota: 'Streaming' } })
await api('/api/recurrentes', { method: 'POST', body: { cuenta_id: visa, categoria_id: cat('Comida', 'gasto'), tipo: 'gasto', monto_centavos: 80000, cadencia: { frecuencia: 'quincenal' }, proxima_fecha: iso(10), nota: 'Mercado quincenal' } })

// 5) deudas: una por pagar (pagar 1 cuota) y una por cobrar
const deuda = await api('/api/deudas', { method: 'POST', body: { contraparte: 'Tarjeta BNB', direccion: 'por_pagar', concepto: 'Compra a cuotas', monto_total_centavos: 300000, moneda: 'BOB', fecha_inicio: iso(30), num_cuotas: 3 } })
await api(`/api/deudas/${deuda.deuda.id}/cuotas/${deuda.deuda.cuotas[0].id}/pagar`, { method: 'POST', body: { cuenta_id: banco, categoria_id: cat('Compras', 'gasto'), fecha: iso(10) } })
await api('/api/deudas', { method: 'POST', body: { contraparte: 'Pedro', direccion: 'por_cobrar', concepto: 'Préstamo almuerzos', monto_total_centavos: 50000, moneda: 'BOB', fecha_inicio: iso(15), num_cuotas: 1 } })

// 6) metas + aportes
const meta1 = await api('/api/metas', { method: 'POST', body: { nombre: 'Impresora 3D nueva', monto_objetivo_centavos: 245000, moneda: 'USD' } })
await api(`/api/metas/${meta1.meta.id}/aportes`, { method: 'POST', body: { monto_centavos: 103000, fecha: iso(20), nota: 'Ahorro quincena' } })
const meta2 = await api('/api/metas', { method: 'POST', body: { nombre: 'Fondo de emergencia', monto_objetivo_centavos: 500000, moneda: 'BOB' } })
await api(`/api/metas/${meta2.meta.id}/aportes`, { method: 'POST', body: { monto_centavos: 120000, fecha: iso(12) } })

// 7) presupuestos del mes
await api('/api/presupuestos', { method: 'POST', body: { categoria_id: cat('Comida', 'gasto'), mes, monto_limite_centavos: 150000 } })
await api('/api/presupuestos', { method: 'POST', body: { categoria_id: cat('Transporte', 'gasto'), mes, monto_limite_centavos: 40000 } })
await api('/api/presupuestos', { method: 'POST', body: { categoria_id: cat('Ocio', 'gasto'), mes, monto_limite_centavos: 30000 } })
await api('/api/presupuestos', { method: 'POST', body: { categoria_id: cat('Vivienda', 'gasto'), mes, monto_limite_centavos: 200000 } })

// 8) fondo Impresión 3D (USD) + aporte Personal → Impresión
const negocio = await fondo('Impresión 3D', 'negocio', 'USD')
const caja = await cuenta(negocio, 'Caja', 'efectivo', 'USD', 21000)
await cuenta(negocio, 'Mercantil USD', 'banco', 'USD', 115000)
const catsN = await categorias(negocio)
const catN = (nombre, tipo) => catsN.find((c) => c.nombre === nombre && c.tipo === tipo)?.id

await activo(negocio)
await movimiento({ cuenta_id: caja, categoria_id: catN('Venta', 'ingreso'), tipo: 'ingreso', monto_centavos: 4500, tasa_ref: 6.96, fecha: iso(2), nota: 'Venta impresión' })
await movimiento({ cuenta_id: caja, categoria_id: catN('Insumos', 'gasto'), tipo: 'gasto', monto_centavos: 1200, tasa_ref: 6.96, fecha: iso(1), nota: 'Filamento PLA' })

await api('/api/aportes', { method: 'POST', body: { cuenta_destino_id: caja, monto_destino_centavos: 10000, cuenta_origen_id: ahorroUsd, tasa_ref: 6.96, fecha: iso(4), nota: 'Aporte a impresión' } })

await activo(personal)
console.log('✓ seed demo listo:', EMAIL)
