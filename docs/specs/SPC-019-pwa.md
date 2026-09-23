# SPC-019 — PWA

Estado: verificada
Depende de: SPC-001, SPC-004

## Problema

Caudal se registra desde el teléfono, muchas veces en la calle. Instalarlo como app (icono, pantalla completa, arranque rápido) mejora el uso diario; y si se corta la conexión, al menos debe abrir sin pantalla rota.

## Requerimientos

- `@vite-pwa/nuxt` configurado: manifest (nombre Caudal, iconos, `theme_color` de DESIGN.md, `display: standalone`), service worker con precache del shell y estrategia de red para `/api`.
- Instalable en Android/iOS: icono propio (DERIVADO de identidad — se aprueba en SPC-021).
- Prompt de instalación opcional (no intrusivo).
- Sin soporte offline de escritura: registrar movimientos requiere red (v1). Si no hay red, mensaje claro.
- Actualización: al haber nueva versión, avisar "recargar para actualizar" (evita quedar con shell viejo).
- No cachear respuestas autenticadas de `/api` de forma compartida.

## Criterios de aceptación

- [x] Lighthouse/Audit detecta la PWA instalable (manifest + SW registrados). (verificado con Playwright: `manifest.webmanifest` con 3 iconos + SW activo)
- [~] Instalada se abre en modo standalone sin barra del navegador. — manifest `display: standalone` y prompt de instalación; la instalación real en dispositivo queda para el pase visual (SPC-021).
- [x] Sin conexión, la app abre el shell y muestra aviso; no pantalla en blanco. (`/offline.html` servido por el SW; verificado: 200 con "Sin conexión")
- [x] El service worker no sirve datos de un usuario a otro (cachés por sesión / sin cachear `/api` autenticada). (`NetworkOnly` para `/api/**`, `navigateFallbackDenylist`)
- [x] Los iconos usan la identidad de Caudal (no genéricos) — ver SPC-021. (gota + brand `#0E6FFF`, generados con `scripts/generate-icons.mjs`; se congelan en SPC-021)

## Implementación (decisiones)

- **Manifest + iconos**: `pwa.manifest` con `display: standalone`, `theme_color #0E6FFF` e iconos `192/512` + `maskable-512`; `apple-touch-icon` y metas Apple en `app.head`. Iconos generados desde la identidad (gota de agua sobre brand) con `scripts/generate-icons.mjs` (Playwright).
- **Service worker**: `registerType: 'prompt'` (avisa «nueva versión, recargar»), `client.installPrompt` (botón de instalación no intrusivo) y `periodicSyncForUpdates`.
- **Offline (SSR)**: sin red no hay HTML del servidor, así que se precachea `public/offline.html` y se usa `workbox.navigateFallback: '/offline.html'`. **Gotcha**: `@vite-pwa/nuxt` reescribe `.html`→sin extensión en el precache (URLs limpias) y en Nitro `/offline` redirige; se anula ese transform con `workbox.manifestTransforms` para conservar `/offline.html`.
- **Aislamiento**: `runtimeCaching` con `NetworkOnly` para `/api/**` (nunca se cachea la API autenticada) + `navigateFallbackDenylist` para `/api/`.
- **UI**: `PwaNotices.vue` (banner offline, aviso de actualización con «Recargar», botón «Instalar Caudal») + `useOnline()`; montado global en `app.vue`.
- **Sin escritura offline**: registrar movimientos exige red; el banner offline lo avisa (v1).

Verificado con Playwright (build de producción): `manifest` (name/display/icons), SW activo, y navegación offline → `200` con el aviso «Sin conexión». `pnpm test` 151/151 · `lint` · `typecheck` · `build` OK.

Archivos: `nuxt.config.ts`, `public/offline.html`, `public/pwa-*.png` + `public/apple-touch-icon.png`, `scripts/generate-icons.mjs`, `app/components/PwaNotices.vue`, `app/composables/useOnline.ts`, `app/app.vue`.