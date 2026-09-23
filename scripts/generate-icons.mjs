// Genera los iconos PWA desde la identidad de Caudal (gota de agua sobre brand).
// Uso: node scripts/generate-icons.mjs   (requiere Chromium de Playwright)
// Se regeneran cuando SPC-021 congele el diseño final.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BRAND = '#0E6FFF'
const DROP = 'M12 2C8 7 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-2-7-6-12z'

function html({ size, radius, drop, transparent }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;width:${size}px;height:${size}px;background:${transparent ? 'transparent' : BRAND};}
    .box{width:${size}px;height:${size}px;background:${BRAND};border-radius:${radius};display:flex;align-items:center;justify-content:center;}
    svg{width:${drop}%;height:${drop}%;}
  </style></head><body><div class="box"><svg viewBox="0 0 24 24" fill="#fff"><path d="${DROP}"/></svg></div></body></html>`
}

const targets = [
  { file: 'public/pwa-192x192.png', size: 192, radius: '22%', drop: 58, transparent: true },
  { file: 'public/pwa-512x512.png', size: 512, radius: '22%', drop: 58, transparent: true },
  { file: 'public/maskable-512x512.png', size: 512, radius: '0', drop: 44, transparent: false },
  { file: 'public/apple-touch-icon.png', size: 180, radius: '0', drop: 56, transparent: false },
]

mkdirSync('public', { recursive: true })
const browser = await chromium.launch()
for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 })
  await page.setContent(html(t))
  await page.screenshot({ path: t.file, omitBackground: t.transparent })
  await page.close()
  console.log('✓', t.file, `${t.size}x${t.size}`)
}
await browser.close()
