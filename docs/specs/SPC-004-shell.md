# SPC-004 — Shell, layout, navegación y UI base

Estado: verificada
Depende de: SPC-001 (tokens), y se empareja con SPC-003/005 para verse "viva"

## Problema

Sin un shell común, cada pantalla reinventará la navegación y el layout. Hace falta el esqueleto visual (sidebar/barra móvil, cabecera, tarjetas, saldos) que todas las páginas compartan y que cumpla la identidad de DESIGN.md.

## Requerimientos

- Layout raíz con `App.vue` / `app.vue` y sidebar (escritorio `lg:`) + barra de navegación inferior/drawer (móvil) según DESIGN.md.
- Navegación: dashboard, movimientos, cuentas, fondos, **presupuestos**, transferencias, recurrentes, deudas, metas, reportes, ajustes.
- Tipografía **Inter** con monetarios `tabular-nums` (ver DESIGN.md y decisión 0004); sidebar 1280px y barra inferior móvil según los wireframes `04…/05…` de `docs/stitch_caudal_wireframe_specs/`.
- Presupuestos (`/presupuestos`) nace solo con la ruta base en el shell; su contenido es SPC-024.
- Cabecera con selector de **fondo activo** (persistido en la sesión del usuario) que pre-filtra las vistas de dinero (SPC-005).
- Estado de sesión en el shell: si no hay sesión → página de login/registro; si la hay → app.
- Componente `Balances` (saldo de cada cuenta del fondo activo, con formato por moneda `tabular-nums`).
- Cards `card` / `card-muted`, `hs-1`/`hs-2` (titulares two-tone), botones píldora, listas (`il-flex`), links (`ol-link`).
- Responsive 390px/1280px verificado con capturas Playwright.
- Rutas de ejemplo mínimo conectadas (fondos, dashboard) para probar el shell; el resto de pantallas llegan con sus specs.

## Criterios de aceptación

- [x] En 1280px la navegación es sidebar; en 390px es barra inferior con los accesos principales (no drawer oculto que nadie encuentra).
- [x] Sin sesión: redirige a `/login`; con sesión la app se muestra con el fondo activo.
- [x] Cambiar el fondo activo en cabecera actualiza los saldos visibles sin recargar.
- [x] Capturas 390px y 1280px de la vista con 2 cuentas (una BOB, una USD) muestran `Bs 12,50` y `US$ 45,00` con `tabular-nums`.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` limpios.

## Implementación (decisiones)

- **Layouts**: `app/layouts/default.vue` (shell: sidebar `lg:`, header, main, bottom nav) y `app/layouts/auth.vue` (centrado para login). `app/middleware/auth.global.ts` redirige a `/login` sin sesión y a `/` con sesión.
- **Fondo activo**: composable `useFondoActivo` (estado compartido `useState` + `useRequestFetch` para SSR) con `cargarFondos`/`cargarFondoActivo`/`seleccionarFondo`. El selector (`FondoActivoMenu`, `UDropdownMenu`) y `BalancesPanel` reaccionan al cambio (`useAsyncData` con `watch`), así que los saldos se actualizan **sin recarga completa**.
- **Navegación**: `app/utils/navegacion.ts` con las 11 rutas (incluye `Presupuestos`). Sidebar `AppSidebar` y barra inferior `AppBottomNav` (Inicio, Movimientos, **+**, Fondos, Ajustes). Iconos **Material Symbols** vía `UIcon` (`i-material-symbols-*`).
- **Pantallas**: dashboard `/` (saldos reales), `/login` (login real contra `/api/auth/login`) y `/fondos` (listado real). El resto de rutas son un `PaginaEnConstruccion` de relleno que el pase visual (SPC-021) reemplaza; así la navegación no da 404.
- **BalancesPanel**: total por moneda + filas por cuenta con icono por tipo y formato `formatMoney` (tabular-nums).
- **Verificación visual**: Playwright (bundled Chromium) — login, redirección sin sesión, cambio de fondo sin recarga y responsive. Capturas en `.screenshots/` (gitignored).

Archivos: `app/layouts/{default,auth}.vue`, `app/middleware/auth.global.ts`, `app/composables/useFondoActivo.ts`, `app/utils/navegacion.ts`, `app/components/{AppSidebar,AppBottomNav,FondoActivoMenu,BalancesPanel,PaginaEnConstruccion}.vue`, `app/pages/*.vue`.