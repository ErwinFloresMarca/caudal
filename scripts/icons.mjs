// Genera los iconos de marca de Caudal desde public/favicon.svg.
//   node scripts/icons.mjs
// Requiere el Chromium de Playwright (@playwright/test). Sin dependencias nuevas.
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const svg = readFileSync(`${raiz}public/favicon.svg`, 'utf8')
const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

const PNG = [
  { archivo: 'public/apple-touch-icon.png', size: 180 },
  { archivo: 'public/pwa-192x192.png', size: 192 },
  { archivo: 'public/pwa-512x512.png', size: 512 },
  { archivo: 'public/maskable-512x512.png', size: 512 },
]

// ICO con un PNG embebido (soportado por browsers modernos y Windows Vista+).
function aIco(png) {
  const dir = Buffer.alloc(6)
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2)
  dir.writeUInt16LE(1, 4)
  const entry = Buffer.alloc(16)
  entry.writeUInt8(32, 0)
  entry.writeUInt8(32, 1)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(png.length, 8)
  entry.writeUInt32LE(22, 12)
  return Buffer.concat([dir, entry, png])
}

const browser = await chromium.launch()
const page = await browser.newPage()
async function png(size) {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(`<style>html,body{margin:0}</style><img src="${dataUrl}" width="${size}" height="${size}" style="display:block">`)
  return await page.screenshot({ omitBackground: true })
}

for (const t of PNG) {
  writeFileSync(`${raiz}${t.archivo}`, await png(t.size))
  console.log('✓', t.archivo, `${t.size}px`)
}
writeFileSync(`${raiz}public/favicon.ico`, aIco(await png(32)))
console.log('✓ public/favicon.ico 32px')

await browser.close()
