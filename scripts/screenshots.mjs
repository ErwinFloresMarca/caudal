// Capturas 390px + 1280px por pantalla (SPC-021).
//   BASE_URL=http://127.0.0.1:3071 node scripts/screenshots.mjs [nombre...]
// Requiere el build servido (node .output/server/index.mjs) y el seed demo.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3071'
const EMAIL = process.env.DEMO_EMAIL ?? 'demo@caudal.test'
const PASSWORD = process.env.DEMO_PASSWORD ?? 'demo-caudal-123'
const solo = process.argv.slice(2)

const RUTAS = [
  { name: '02-login', path: '/login', publica: true },
  { name: '02-registro', path: '/registro', publica: true },
  { name: '01-dashboard', path: '/' },
  { name: '03-movimientos', path: '/movimientos' },
  { name: '04-cuentas', path: '/cuentas' },
  { name: '05-fondos', path: '/fondos' },
  { name: '06-transferencias', path: '/transferencias' },
  { name: '07-recurrentes', path: '/recurrentes' },
  { name: '08-deudas', path: '/deudas' },
  { name: '09-presupuestos', path: '/presupuestos' },
  { name: '10-reportes', path: '/reportes' },
  { name: '11-ajustes', path: '/ajustes' },
  { name: '12-metas', path: '/metas' },
]

const ANCHOS = [
  { w: 390, h: 844 },
  { w: 1280, h: 900 },
]

mkdirSync('.screenshots', { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()

async function capturar(route) {
  if (solo.length && !solo.some((s) => route.name.includes(s))) return
  for (const { w, h } of ANCHOS) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto(BASE + route.path, { waitUntil: 'networkidle' }).catch(() => null)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `.screenshots/${route.name}-${w}.png`, fullPage: true })
    console.log(`✓ ${route.name}-${w}.png`)
  }
}

// Rutas públicas (sin sesión)
for (const r of RUTAS.filter((r) => r.publica)) await capturar(r)

// Login
await page.setViewportSize({ width: 1280, height: 900 })
await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
await page.fill('input[type=email]', EMAIL)
await page.fill('input[type=password]', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(BASE + '/', { timeout: 15000 }).catch(() => null)

// Fondo activo representativo (Personal) para las capturas
const fondosData = await page.evaluate(async () => (await fetch('/api/fondos')).json()).catch(() => ({ fondos: [] }))
const activo = fondosData.fondos?.find((f) => f.nombre === 'Personal') ?? fondosData.fondos?.[0]
if (activo) {
  await page.evaluate(
    async (id) => {
      await fetch('/api/fondos/activo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) })
    },
    activo.id,
  )
}

for (const r of RUTAS.filter((r) => !r.publica)) await capturar(r)

// Detalle de fondo (el activo)
if (activo) await capturar({ name: '05b-fondos-detalle', path: `/fondos/${activo.id}` })

await browser.close()
console.log('Listo → .screenshots/')
