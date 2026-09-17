# SPC-004 — Shell, layout, navegación y UI base

Estado: propuesta
Depende de: SPC-001 (tokens), y se empareja con SPC-003/005 para verse "viva"

## Problema

Sin un shell común, cada pantalla reinventará la navegación y el layout. Hace falta el esqueleto visual (sidebar/barra móvil, cabecera, tarjetas, saldos) que todas las páginas compartan y que cumpla la identidad de DESIGN.md.

## Requerimientos

- Layout raíz con `App.vue` / `app.vue` y sidebar (escritorio `lg:`) + barra de navegación inferior/drawer (móvil) según DESIGN.md.
- Navegación: dashboard, movimientos, cuentas, fondos, transferencias, recurrentes, deudas, metas, reportes, ajustes.
- Cabecera con selector de **fondo activo** (persistido en la sesión del usuario) que pre-filtra las vistas de dinero (SPC-005).
- Estado de sesión en el shell: si no hay sesión → página de login/registro; si la hay → app.
- Componente `Balances` (saldo de cada cuenta del fondo activo, con formato por moneda `tabular-nums`).
- Cards `card` / `card-muted`, `hs-1`/`hs-2` (titulares two-tone), botones píldora, listas (`il-flex`), links (`ol-link`).
- Responsive 390px/1280px verificado con capturas Playwright.
- Rutas de ejemplo mínimo conectadas (fondos, dashboard) para probar el shell; el resto de pantallas llegan con sus specs.

## Criterios de aceptación

- [ ] En 1280px la navegación es sidebar; en 390px es barra inferior con los accesos principales (no drawer oculto que nadie encuentra).
- [ ] Sin sesión: redirige a `/login`; con sesión la app se muestra con el fondo activo.
- [ ] Cambiar el fondo activo en cabecera actualiza los saldos visibles sin recargar.
- [ ] Capturas 390px y 1280px de la vista con 2 cuentas (una BOB, una USD) muestran `Bs 12,50` y `US$ 45,00` con `tabular-nums`.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build` limpios.