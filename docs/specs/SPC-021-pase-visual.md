# SPC-021 — Pase visual por wireframes

Estado: propuesta
Depende de: SPC-004…017 implementados (pantallas existentes)

## Problema

El diseño de Caudal no debe inventarse pantalla por pantalla en código, ni heredarse del de Ritmo. Hace falta un pase visual ordenado: generar un prompt con TODAS las pantallas/flujos, producir los wireframes de alta fidelidad (móvil 390px + escritorio 1280px), y de ahí derivar los tokens definitivos y las correcciones de UI.

## Requerimientos

- **`docs/wireframe-prompt.md`** compilado de los specs: proyecto y objetivo, identidad de DESIGN.md (tokens, tipografía, componentes), modelo de dominio, shell/navegación, y **pantalla por pantalla** (dashboard, movimientos+alta, cuentas, fondos, transferencias, aportes/retiros, recurrentes, deudas/MSI, metas, reportes, ajustes, login/registro, estados vacíos, errores). Cada pantalla con sus estados (vacío, con datos, carga) y breakpoints.
- Generar los mockups de alta fidelidad a partir de ese prompt (móvil 390px + escritorio 1280px, UI en español).
- **Recorrer la app implementada** contra los mockups aprobados y ajustar: tokens, espaciados, tipografía, iconos, estados, copy.
- Congelar tokens en `DESIGN.md` (pasa de borrador a v1): colores definitivos, radios, utilidades, tipografía, iconos, logos (app icon PWA).
- Crear/ajustar los **íconos de la PWA** (SPC-019) desde la identidad.
- Registrar en `docs/decisions/` cualquier cambio de identidad respecto al borrador.
- Checklist visual por pantalla revisada en 390px y 1280px (capturas Playwright antes/después).

## Criterios de aceptación

- [ ] `docs/wireframe-prompt.md` cubre TODAS las pantallas/estados y se puede usar tal cual para generar mockups.
- [ ] Existe el set de mockups aprobados (390px + 1280px por pantalla).
- [ ] `DESIGN.md` deja de estar en borrador y sus tokens son los implementados (grep: no quedan valores fuera del DESIGN).
- [ ] Capturas Playwright de cada pantalla en ambos anchos, sin desbordes ni elementos cortados.
- [ ] Iconos PWA/logo finales aplicados.
- [ ] `pnpm lint`/`build` y tests siguen limpios tras los ajustes.