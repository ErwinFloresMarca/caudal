# SPC-021 — Pase visual por wireframes

Estado: verificada
Depende de: SPC-004…017 implementados (pantallas existentes)

## Problema

El diseño de Caudal no debe inventarse pantalla por pantalla en código, ni heredarse del de Ritmo. Hace falta un pase visual ordenado: compilar un prompt con TODAS las pantallas/flujos, producir los wireframes de alta fidelidad (móvil 390px + escritorio 1280px), y de ahí derivar los tokens definitivos y las correcciones de UI.

**Estado actual**: el prompt (`docs/wireframe-prompt.md`) y el set de mockups ya existen en `docs/stitch_caudal_wireframe_specs/` (36 pantallas, incluye el módulo nuevo de Presupuestos SPC-024). Lo pendiente de este spec es el **recorrido real** de la app implementada contra esos mockups.

## Requerimientos

- **`docs/wireframe-prompt.md`** — ya existe, compilado de los specs: proyecto y objetivo, identidad de DESIGN.md (tokens, tipografía, componentes), modelo de dominio, shell/navegación, y **pantalla por pantalla** (dashboard, movimientos+alta, cuentas, fondos, transferencias, aportes/retiros, recurrentes, deudas/MSI, metas, presupuestos, reportes, ajustes, login/registro, estados vacíos, errores). Cada pantalla con sus estados (vacío, con datos, carga) y breakpoints.
- **Mockups generados** a partir de ese prompt: `docs/stitch_caudal_wireframe_specs/` (móvil 390px + escritorio 1280px, UI en español) — listos, adjuntados por módulo a sus issues de Linear.
- **Recorrer la app implementada** contra los mockups aprobados y ajustar: tokens, espaciados, tipografía, iconos, estados, copy.
- Congelar tokens en `DESIGN.md` (pasa de borrador a v1): colores definitivos, radios, utilidades, tipografía, iconos, logos (app icon PWA).
- Crear/ajustar los **íconos de la PWA** (SPC-019) desde la identidad.
- Registrar en `docs/decisions/` cualquier cambio de identidad respecto al borrador.
- Checklist visual por pantalla revisada en 390px y 1280px (capturas Playwright antes/después).

## Plan por pantalla

Se recorre **pantalla por pantalla**; cada una es un commit y una captura 390/1280. Orden = numeración de los mockups.

| # | Pantalla | Mockup | API | Entregable |
|---|---|---|---|---|
| 0 | Preparación | — | — | `pnpm screenshots` (Playwright 390/1280) + seed demo |
| 1 | Dashboard `/` | `01` | `/api/resumen`, `/api/movimientos?limite=5` | Saldo (por moneda+consolidado), mes, cuentas, gastos por categoría, pendientes, metas, recientes |
| 2 | Login `/login` + Registro `/registro` | `02` | `/api/auth/*` | Formularios + Google + errores inline + `/registro` |
| 3 | Movimientos `/movimientos` | `03` | `/api/movimientos*`, `/api/fondos/:id/{cuentas,categorias}`, `/api/ajustes/tasa` | Lista agrupada + filtros en URL + alta/edición slideover + borrar |
| 4 | Cuentas (en `/fondos/:id`) | `04` | `/api/fondos/:id/cuentas*` | Grid de tarjetas + slideover (moneda fija, saldo inicial) |
| 5 | Fondos `/fondos` + `/fondos/:id` | `05` | `/api/fondos*`, `/api/fondos/:id/categorias*` | Lista, detalle (cuentas+categorías), slideover, ocultar |
| 6 | Transferencias `/transferencias` | `06` | `/api/transferencias*`, `/api/aportes*` | Tabs «Entre cuentas» / «Entre fondos» + historial |
| 7 | Recurrentes `/recurrentes` | `07` | `/api/recurrentes*` | Pendientes (Confirmar/Editar/Saltar) + plantillas + slideover |
| 8 | Deudas/MSI `/deudas` | `08` | `/api/deudas*` | Resumen + lista + detalle con cuotas + pagar + slideover |
| 9 | Presupuestos `/presupuestos` | `09` | `/api/presupuestos*` | KPIs + pills de estado + cards + compensar + histórico |
| 10 | Reportes `/reportes` | `10` | `/api/reportes` | Filtros URL + flujo + categorías (SVG) + serie + evolución |
| 11 | Ajustes `/ajustes` | `11` | `/api/ajustes*`, `/api/api-keys` | Perfil, seguridad, moneda/tasa, categorías, API keys, sesión, datos |
| 12 | Metas `/metas` | `12` | `/api/metas*` | Grid con progreso + detalle + aportes |
| 13 | Cierre | — | — | Congelar `DESIGN.md` v1, iconos PWA finales, capturas, decisión si cambia identidad |

Estados por pantalla: **vacío (CTA)**, **con datos** y, donde aplique, **sin resultados**; crear/editar en `USlideover` (ancho completo en móvil) / `UModal`.

## Criterios de aceptación

- [x] `docs/wireframe-prompt.md` cubre TODAS las pantallas/estados y se puede usar tal cual para generar mockups.
- [x] Existe el set de mockups aprobados (390px + 1280px por pantalla).
- [x] `DESIGN.md` deja de estar en borrador y sus tokens son los implementados (grep: no quedan valores fuera del DESIGN).
- [x] Capturas Playwright de cada pantalla en ambos anchos, sin desbordes ni elementos cortados.
- [x] Iconos PWA/logo finales aplicados.
- [x] `pnpm lint`/`build` y tests siguen limpios tras los ajustes.

## Progreso

Pase visual **completo**: las 12 pantallas implementadas y capturadas en 390/1280 (T0–T12), `DESIGN.md` congelado en **v1** (decisión 0007) e iconos PWA desde la identidad. Capturas en `.screenshots/` (`pnpm screenshots`). Tooling de datos: `pnpm seed:demo`.

Pantallas: dashboard, login/registro, movimientos, cuentas (detalle de fondo), fondos, transferencias/aportes, recurrentes, deudas/MSI, presupuestos, reportes, ajustes y metas.