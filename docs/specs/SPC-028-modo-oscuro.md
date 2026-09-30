# SPC-028 — Modo oscuro

Estado: verificada
Depende de: SPC-021 (pase visual), decisión 0004 (que abre este spec)

## Problema

Hoy Caudal es **solo modo claro** (`nuxt.config.ts` fija
`colorMode.preference: 'light'`; los tokens de `main.css` son únicos y claros).
El usuario quiere poder usar modo oscuro. La decisión 0004 exige que esto se
abra como spec nuevo y que los tokens partan de una identidad aprobada (los
mockups son todos claros, así que la paleta oscura se define aquí).

## Requerimientos

- La app DEBE ofrecer **claro, oscuro y sistema**, con persistencia de la
  preferencia del usuario.
- Los tokens de `app/assets/css/main.css` DEBEN tener variantes oscuras
  (`--color-frost`, `surface`, `surface-muted/hover/tint`, `ink*`, `border*`)
  manteniendo **brand y los colores semánticos** de Caudal (positive/negative/
  warning), ajustando lo necesario para contraste AA.
- DEBE declararse `color-scheme` (form controls, scrollbars) en cada modo.
- El **toggle** DEBE estar accesible (menú de usuario y/o Ajustes) y recordar la
  elección entre sesiones.
- Ninguna pantalla DEBE quedar ilegible en oscuro: candy de tokens + revisión de
  colores fijos (badges, roundels, categorías) y de gráficas.
- Verificación con capturas 390px/1280px en ambos modos (SPC-021).

## Criterios de aceptación

- [x] Alternar claro/oscuro cambia toda la UI sin recargar y persiste. (captura)
- [x] Texto/fondos cumplen contraste AA en ambos modos. (revisión)
- [x] Las 14 pantallas se ven bien en oscuro (390/1280). (capturas)
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm build` limpios.

## Fuera de alcance

- Rediseño de layout/identidad; solo la capa de color.
- Gráficas de reportes: se revisan, pero no se cambia su forma.

## Decisiones (confirmadas)

- **Paleta oscura**: neutros de la propuesta v2.5.0, manteniendo brand y semánticos de Caudal (ajuste mínimo para AA).
- **Preferencia por defecto**: `system` (respeta el SO), con opción de forzar claro/oscuro.
- **Toggle**: en el **menú del avatar** (`AppUserMenu`) y en **Ajustes**.
- **Alcance**: completo, con capturas 390/1280 en ambos modos.

## Implementación (decidida)

- **Tokens**: en `main.css`, `@theme static` para claro y un bloque `.dark`
  (que `@nuxtjs/color-mode` pone en `html`) que redefine las variables neutras.
  Neutros oscuros (ref. v2.5.0): `frost #080b11`, `surface #0e131d`,
  `surface-muted #141a26`, `surface-hover #1a2232`, `surface-tint #12233f`,
  `ink #e2e8f0`, `ink-muted #94a3b8`, `ink-faint #64748b`,
  `border rgb(255 255 255 / 0.08)`, `border-strong rgb(255 255 255 / 0.14)`.
  Brand/positive/negative/warning se mantienen (ajuste de contraste si hace
  falta). `color-scheme: light|dark`.
- **Config**: `preference: 'system'`, `fallback: 'light'` (quitar el `'light'` fijo).
- **Toggle**: `useColorMode()` en `AppUserMenu` (claro/oscuro/sistema) y en
  `app/pages/ajustes.vue`.
- **Barrido**: hex fijos (`#5B6B85`, `#8E9BAE`, `#C27A18`, badges, `bg-[rgb(...)]`)
  → tokens con variante oscura; revisar gráficas de reportes y estados vacíos;
  revisar `app.config.ts` (Nuxt UI neutral).

Archivos previstos: `app/assets/css/main.css`, `nuxt.config.ts`,
`app/app.config.ts`, `app/components/AppUserMenu.vue`, `app/pages/ajustes.vue`,
`DESIGN.md`, `docs/stitch_caudal_wireframe_specs/`.
