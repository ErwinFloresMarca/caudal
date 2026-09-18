# Decisión 0004 — Adoptar diseño de wireframes (Inter, light-only, presupuestos en v1)

Estado: aprobada (borrador). Fecha: 2026-09-18.

## Contexto

Se generaron los mockups de alta fidelidad (SPC-021) en `docs/stitch_caudal_wireframe_specs/` (36 pantallas, 390px + 1280px) con identidad propia de Caudal. Al alinearlos con los docs del repo había divergencias y una propuesta conflictiva de dark mode.

## Decisión

1. **Tipografía**: se adopta **Inter** (400–800, fallback system-ui) sobre Manrope/`ui-sans-serif`. Los monetarios SIEMPRE `tabular-nums`.
2. **Tokens ampliados** (ver `DESIGN.md`): `surface-tint #EBF3FF`, `surface-hover #F0F3FF`, `ink-faint #8E9BAE`, `border rgb(11 28 52 / 0.08)`, `border-strong …/0.12`; elevación por hairline + `shadow-sm` (flotantes: borde + `0 8px 24px -4px rgb(11 28 52 / 0.08)`).
3. **Modo claro únicamente**: la propuesta `design.md_modo_claro_y_oscuro.md` (v2.5.0, modo oscuro + paleta emerald/rose + console MCP) **NO se adopta** — contradice los mockups (todos en modo claro) y el estándar `caudal_ledger_standard` («Dark mode is intentionally prohibited»). Queda como referencia descartada.
4. **Presupuestos entra en v1** como **SPC-024** (issue SEL-100), módulo nuevo salido del wireframe `09.presupuestos`: límites mensuales por categoría, estados en ritmo/alerta(>80 %)/sobregiro, regla 50/30/20 y presupuesto base cero. Depende de SPC-002/005/007/008 y se ubica en Fase 3 del ROADMAP; `docs/wireframe-prompt.md` y el nav (SPC-004) se actualizan con `/presupuestos`.
5. **Logo/icono PWA**: `caudal_logo/code.html` (rect `#0E6FFF` + «C» en blanco + círculo `#0FA47F`) es la fuente para el app icon (SPC-019).
6. La fuente canónica de componentes es `docs/stitch_caudal_wireframe_specs/caudal_ledger_standard/DESIGN.md`; el `DESIGN.md` raíz lo resume operativamente.

## Alternativas descartadas

- Mantener Manrope: los mockups usan Inter en todo; adoptar Inter evita divergencia visual.
- Adoptar el design system v2.5.0 con dark mode: contradice los mockups aprobados y duplica tokens sin beneficio en v1.
- Dejar presupuestos fuera de v1: el wireframe ya lo diseña en la nav y en pantalla propia; posponerlo crearía una pantalla fantasma en el pase visual.

## Consecuencias

- `AGENTS.md`, `DESIGN.md`, `docs/wireframe-prompt.md`, `docs/specs/README.md` y `docs/ROADMAP.md` se alinean a esta decisión.
- Si se retoma el modo oscuro, debe partir de los mockups (no al revés) y abrirse como spec nuevo.
- SPC-004 (shell) gana el ítem de nav `/presupuestos`.