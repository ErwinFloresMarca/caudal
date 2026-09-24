# Decisión 0007 — Identidad v1 congelada tras el pase visual (SPC-021)

Estado: aprobada. Fecha: 2026-09-24.

## Contexto

SPC-021 exige recorrer la app implementada contra los mockups y **congelar** los tokens de `DESIGN.md` (que estaba en borrador), registrando en `docs/decisions/` cualquier cambio de identidad respecto al borrador.

## Decisión

- **No hubo cambios de identidad** respecto al borrador: los tokens (Frost/Surface/Ink/Brand/Positive/Negative/Warning), radios, tipografía Inter con monetarios `tabular-nums` y los componentes (cards, píldoras, badges) se implementaron tal cual estaban en `DESIGN.md`.
- `DESIGN.md` pasa de **borrador** a **v1 (congelada)**.
- **Iconografía**: Material Symbols vía `UIcon` (`i-material-symbols-*`); los nombres guardados en BD usan guion bajo y se normalizan con `iconoMaterial()` (`app/utils/iconos.ts`).
- **Iconos PWA** derivados de la identidad (gota de agua blanca sobre brand `#0E6FFF`) con `scripts/generate-icons.mjs`.
- **Gráficas** (reportes, presupuestos): SVG/CSS nativo (ya decidido en 0006).

## Impacto

- `DESIGN.md` v1 es la referencia; cualquier cambio posterior de tokens exige una nueva decisión.
- Las capturas del pase visual viven en `.screenshots/` (gitignored), regenerables con `pnpm screenshots`.

## Pendiente / notas

- Colores usados fuera de utilidades (`#C27A18` para texto de alerta, `#EDF1F8` para el track del donut) corresponden a tokens del DESIGN; no se introdujeron paletas nuevas.
