# Changelog

## v0.1.3

- Fix PWA: el service worker ya no sirve el fallback offline en todas las navegaciones; ahora usa `NetworkFirst` + `precacheFallback` (el aviso offline solo aparece si falla la red).
- SPC-021 (pase visual): dashboard `/` con saldo consolidado, KPIs del mes, cuentas, últimos movimientos, gastos por categoría, pendientes y metas. Añade `pnpm screenshots` y `pnpm seed:demo`.

## v0.1.2

- PWA (SPC-019): manifest + iconos de la identidad, service worker con precache del shell, aviso de actualización, instalación no intrusiva y página offline. La API autenticada no se cachea.

## v0.1.1

Primera versión funcional de Caudal (backend completo + shell).

- Fundación: Nuxt 4, PostgreSQL + Drizzle, auth multiusuario (scrypt) + API keys, shell con sidebar/barra móvil, login con Google.
- Núcleo del dinero: fondos, cuentas (saldo vivo, multimoneda BOB/USD), categorías, transacciones (tasa histórica), transferencias, aportes/retiros entre fondos.
- Inteligencia: recurrentes (pendientes por confirmar), deudas/MSI, metas de ahorro, presupuestos por categoría, dashboard, reportes, búsqueda y filtros, ajustes.
- Release: `pnpm release` + pipeline que publica `caudal-output.tar.gz`; deploy en VPS con pm2 + nginx.
