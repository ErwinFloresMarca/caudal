# Changelog

## v1.0.1

- `/cuentas` deja de ser un placeholder: ahora muestra las cuentas del fondo activo (saldo total, grid con crear/editar y cuentas inactivas), con enlace a la gestión en el fondo. Se elimina el componente `PaginaEnConstruccion` (ya sin uso).

## v1.0.0

Primera versión completa de Caudal, desplegada en `https://caudal.erfm.dev`.

- **Fundación**: Nuxt 4 + Nuxt UI v4, PostgreSQL + Drizzle, auth multiusuario (scrypt) + API keys, login con Google (OAuth), shell responsive.
- **Núcleo**: fondos, cuentas (saldo vivo, multimoneda BOB/USD con tasa histórica), categorías, transacciones, transferencias, aportes/retiros entre fondos.
- **Inteligencia**: recurrentes, deudas/MSI, metas de ahorro, presupuestos por categoría, dashboard, reportes (SVG), búsqueda y filtros, ajustes.
- **Entrega**: MCP server (9 tools), PWA (offline + instalable), deploy VPS (pm2 + nginx), pase visual por wireframes (`DESIGN.md` v1).
- **Release**: `pnpm release` + pipeline CI que publica `caudal-output.tar.gz`; deploy con `deploy.sh`.
- Verificación E2E en producción: 10/10 checks.

## v0.1.5

- SPC-018 (MCP server): endpoint `POST /api/mcp` (Streamable HTTP, JSON-RPC 2.0) autenticado con API key (`Bearer caudal_...`), con 9 tools (`list_funds`, `list_accounts`, `get_balances`, `list_categories`, `list_transactions`, `create_transaction`, `create_transfer`, `get_month_summary`, `list_pending`). `create_*` guardan con `fuente='asistente'`. Sin SDK (decisión 0008).

## v0.1.4

- SPC-021 (pase visual) completo: las 12 pantallas implementadas contra los wireframes — dashboard, login/registro, movimientos (filtros en URL + alta/edición), cuentas, fondos + categorías, transferencias/aportes, recurrentes, deudas/MSI, presupuestos, reportes (gráficas SVG), ajustes y metas.
- `DESIGN.md` congelado en **v1** (decisión 0007); iconos PWA desde la identidad.
- Fix: dirección de la tasa en transferencias (BOB→USD divide, USD→BOB multiplica).
- Tooling: `pnpm screenshots` (390/1280) y `pnpm seed:demo`.

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
