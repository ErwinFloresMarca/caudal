# SPC-026 — Favicon con la marca de Caudal

Estado: verificada
Depende de: SPC-001/021 (identidad), SPC-019 (PWA)

## Problema

El favicon del sitio es el **default de Nuxt** (`public/favicon.ico`, contiene el
verde `#00DC82` de `nuxi init`) y el `<head>` no declara `rel="icon"`, así que el
browser sirve `/favicon.ico` genérico. La pestaña y la instalación PWA muestran
una marca ajena.

## Requerimientos

- El favicon DEBE usar la identidad de Caudal: gota de agua (`water-drop` de
  Material Symbols, el mismo icono del shell/login) blanca sobre un círculo
  `brand #0E6FFF`.
- DEBE servirse un `favicon.svg` y declararse en `app.head.link` con
  `rel="icon" type="image/svg+xml"`.
- `public/favicon.ico` DEBE regenerarse con la marca (el precache PWA incluye
  `*.ico` y los browsers antiguos lo piden por defecto).
- Los PNG de la PWA (`apple-touch-icon.png`, `pwa-192x192.png`,
  `pwa-512x512.png`, `maskable-512x512.png`) DEBEN regenerarse desde el mismo
  SVG para que toda la iconografía sea consistente.
- La generación DEBE ser reproducible por script y no añadir dependencias
  nuevas.

## Criterios de aceptación

- [x] `/favicon.svg` y `/favicon.ico` sirven la marca (ya no el `#00DC82` de
  Nuxt). (inspección de bytes)
- [x] El `<head>` declara el `rel="icon"` SVG. (build)
- [x] `apple-touch-icon.png` y los PNG PWA corresponden a la marca. (script)
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` limpios.

## Implementación (decisiones)

- Fuente única: `public/favicon.svg` (círculo brand + gota blanca).
- Script `scripts/icons.mjs` (Playwright/Chromium, ya instalado): rasteriza el
  SVG a los tamaños PWA y empaqueta el `favicon.ico` (PNG 32×32 embebido).
- El SVG se construye desde el path de Material Symbols `water-drop` para
  coherencia con `i-material-symbols-water-drop`.

Archivos: `public/favicon.svg`, `public/favicon.ico`,
`public/{apple-touch-icon,pwa-192x192,pwa-512x512,maskable-512x512}.png`,
`scripts/icons.mjs`, `nuxt.config.ts`.
