# Caudal — Design System (v1, alineado a wireframes SPC-021)

Identidad: **flujo de agua y dinero**. En contraste con el naranja cálido de Ritmo, Caudal es frío, financiero y de números claros: azul profundo, aguas/teal, saldo y gráficas protagonistas.

Fuente canónica del detalle de componentes: `docs/stitch_caudal_wireframe_specs/caudal_ledger_standard/DESIGN.md`. Este documento es la guía operativa que usa el agente; ante duda, el wireframe manda.

## Dirección de marca

*"Las aguas quietas de la madrugada cruzando un lago alto, con el saldo brillando sobre hielo joven"* — mockups generados en `docs/stitch_caudal_wireframe_specs/` (390px + 1280px por pantalla).

Prioridad visual:
1. **El número manda.** Saldo gigante y legible; ingresos/egresos claros.
2. **Datos ordenados en canales** (filas y columnas), nunca decoración.
3. **Señal de color semántico**: teal = entra dinero, coral = sale dinero. El azul es acción/navegación, no moneda.

## Tokens (claro / oscuro)

Claro en `@theme static`; oscuro en el bloque `.dark` de `app/assets/css/main.css` (SPC-028). Brand y semánticos se mantienen; en oscuro se aclaran para contraste AA.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `frost` | `#F6F8FC` (Frost) | `#080B11` | Fondo de la app / canvas global |
| `surface` | `#FFFFFF` | `#0E131D` | Cards, tablas, formularios (L1) |
| `surface-muted` | `#EDF1F8` (Mist) | `#141A26` | Fondos de secciones, chips, headers de tabla, pills secundarias |
| `surface-hover` | `#F0F3FF` | `#1A2232` | Hover de cards/inputs, filas seleccionables |
| `surface-tint` | `#EBF3FF` | `#12233F` | Fondo teñido de brand: inputs enfocados, nav activo, pills seleccionadas |
| `ink` | `#0B1C34` (Deep Water) | `#E2E8F0` | Texto primario, números |
| `ink-muted` | `#5B6B85` | `#94A3B8` | Texto secundario |
| `ink-faint` | `#8E9BAE` | `#64748B` | Metadatos, placeholders |
| `brand` | `#0E6FFF` (Caudal Blue) | `#0E6FFF` | Acciones, enlaces, navegación activa, titulares two-tone |
| `brand-600` | `#0057D9` | `#3D8BFF` | Hover de acciones |
| `positive` | `#0FA47F` (Creek) | `#34D399` | Ingresos, saldo positivo, aportes recibidos |
| `negative` | `#E5484D` (Coral) | `#F87171` | Egresos, saldo negativo, deudas por pagar |
| `warning` | `#E8A13A` (Amber) | `#FBBF24` | Avisos, metas lejanas, presupuestos en alerta >80% |
| `border` | `rgb(11 28 52 / 0.08)` | `rgb(255 255 255 / 0.08)` | 1px separadores estructurales |
| `border-strong` | `rgb(11 28 52 / 0.12)` | `rgb(255 255 255 / 0.14)` | Inputs y selectores (frontera interactiva) |

`color-scheme` se declara por modo (claro en `:root`, oscuro en `.dark`).

Radios: cards `rounded-[20px]`, botones píldora `h-13 rounded-full` (48–52px), inputs `rounded-xl` (12px), badges `rounded-full`.
Sombra: elevación por borde hairline + `shadow-sm` (`0 1px 2px 0 rgb(11 28 52 / 0.04)`). Flotantes (modales, slideovers): borde `border-strong` + `0 8px 24px -4px rgb(11 28 52 / 0.08)`. Zero-shadow por defecto; sin sombras tintadas ni tonales.

## Tipografía

- **Inter** (400/500/600/700/800), fallback `system-ui, sans-serif`. Cargar antes con `display=swap`.
- Escala: `display-lg` 36/44 (-0.03em, 800) — mobile 28/36; `headline-lg` 24/32 (700); `headline-md` 20/28 (700); `headline-sm` 16/24 (600); `body-md` 14/20; `body-sm` 12/16; `label-md` 12/16 (600, +0.04em); `label-sm` 11/14 (600, +0.05em).
- **Monetarios**: `monetary-hero` 32/40 (700, -0.02em); `monetary-lg` 20/28 (600); `monetary-md` 15/20 (600).
- **Tabular SIEMPRE** (`tabular-nums` / `font-feature-settings: "tnum"`) en TODO monto, porcentaje, tasa y timestamp monetario.
- Jerarquía: titulares `font-extrabold tracking-tight`; cantidades grandes en el momento clave (dashboard, detalle).

## Componentes e iconos

- **Iconos**: Material Symbols (redondeado/`rounded`). No mezclar otros sets.
- **Logo/marca**: gota de agua (`i-material-symbols-water-drop`) blanca sobre círculo `brand #0E6FFF`. Es la marca oficial y la fuente del favicon (`public/favicon.svg`) y del logo del shell/login.
- **Botón primario**: píldora `h-13 rounded-full` `font-bold`, fondo `brand`, texto blanco, hover `brand-600`. Focus ring 3px `surface-tint`.
- **Botón secundario**: píldora `h-13`/`h-11`, fondo `surface-muted`, texto `ink`, hover `surface-hover`/`#dfe8ff`.
- **Filtro/pill terciaria**: píldora `h-9` (36px), sin seleccionar = 1px `border` + `ink-muted`; seleccionada = `surface-tint` con `ink`, o `brand` con texto blanco.
- **Inputs**: altura 48px, `rounded-xl`, borde `border-strong`, fondo `surface`; foco = borde `brand` + ring 2px `surface-tint`. Agrupación de moneda: pill `surface-muted` embebida a la derecha con `BOB`/`USD`.
- **Filas de ledger / movimientos**: tarjeta 20px, fila mín 64px, borde inferior `rgb(11 28 52 / 0.06)` (última fila sin borde). Ingreso `+` teal 600 tabular; egreso `−` (U+2212) coral 600 tabular.
- **Badges**: `rounded-full`, 11px uppercase bold. Ingreso `rgb(15 164 127 / 0.10)`/teal; egreso `rgb(229 72 77 / 0.10)`/coral; alerta `rgb(232 161 58 / 0.12)`/`#C27A18`.
- **Iconos de cuenta por tipo** (en roundel 40px `surface-muted`): efectivo `payments`, banco `account_balance`, tarjeta `credit_card`, ahorro `savings`, ink 20px.
- **Cards**: `card` = `bg-surface border border-border rounded-[20px]`; `card-muted` = `bg-surface-muted`.
- **Saldo**: texto tabular `font-extrabold`, sufijo `Bs` (BOB) / `US$` (USD); equivalente secundario en `body-sm` `ink-muted`.
- **Titulares two-tone**: titular `ink` con 1-2 palabras en `brand`.

## Layout y navegación

- **Rejilla 8pt**; breakpoints: móvil `<640px` (1 columna, margen 16px), tablet `640–1024px` (6 cols), escritorio `>1024px` (12 cols, tope 1280px).
- **Escritorio**: sidebar izquierda fija **260px** (logo, selector de fondo activo con saldo, nav, ajustes/avatar) + workspace centrado 1280px.
- **Móvil**: header compacto (logo + fondo activo) + **barra inferior** con accesos principales (Inicio, Movimientos, **+**, Fondos, Ajustes). No drawer oculto.
- Nav completa: **Inicio, Movimientos, Cuentas, Fondos, Presupuestos, Transferencias, Recurrentes, Deudas, Metas, Reportes, Ajustes** (`/presupuestos` per SPC-024).
- Otros: slideover de alta/edición ancho completo en móvil; modal en escritorio; diálogos de confirmación de borrado con danger.

## Presupuestos (SPC-024)

- Pantalla `/presupuestos`: KPI superiores (Asignado, Consumido, Disponible restante, **Gasto diario permitido**), pills de filtro de estado (Todos / En ritmo / Alerta >80% / Sobregirados), cards por categoría con progreso y ritmo diario.
- Estados de categoría: **En ritmo** (ok), **Alerta >80%** (amber), **Sobregiro** (coral, excedente resaltado con opción «Compensar categoría»).
- Widgets laterales: regla preventiva (alerta al superar 80% del asignado), distribución de ingreso 50/30/20, histórico de cumplimiento. Presupuesto Base Cero (ZBB).

## Id de utilidades (tailwind)

```js
// tailwind.css: @theme { … } + utilidades
card, card-muted, hs-1, hs-2, pill, btn-primary, btn-secondary,
btn-pill-filter, tabular-nums, money-plus (positive), money-minus (negative),
ip-flex (table cell layout), ol-link (link subrayado),
input-field, badge-plus, badge-minus, badge-warning
```

Los nombres de clase y tokens se imlementan en SPC-001/004 y se congelan al cerrar SPC-021.

## Flujo de branding

1. Tokens (este documento) alineados a `caudal_ledger_standard/DESIGN.md`.
2. Mockups: `docs/stitch_caudal_wireframe_specs/` (36 pantallas, 390px + 1280px).
3. Implementación sigue los mockups; el pase visual (SPC-021) aprueba variantes exactas y congela este documento.

Estado: **v1 (congelada)**. Tokens, tipografía y componentes implementados y verificados en el pase visual (SPC-021). No hubo cambios de identidad respecto al borrador alineado a wireframes.

Nota: `design.md_modo_claro_y_oscuro.md` (propuesta v2.5.0 con modo oscuro y console MCP) NO se adopta: contradice los mockups (todos en modo claro) y el estándar `caudal_ledger_standard`; ver `docs/decisions/0004`.