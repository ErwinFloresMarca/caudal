# SPC-001 — Bootstrap de la app Nuxt 4

Estado: propuesta

## Problema

No existe el proyecto Caudal. Hace falta el andamiaje Nuxt 4 con el stack acordado (Nuxt UI v3, Tailwind v4, `node:sqlite`, vitest, Playwright, eslint) y la configuración base, limpio y sin build warnings.

## Requerimientos

- Crear el proyecto con Nuxt 4 en `caudal/` (guard root), `pnpm` como gestor.
- Dependencias según AGENTS.md: `@nuxt/ui`, `nuxt-auth-utils`, `tailwindcss`, PWA (`@vite-pwa/nuxt`), `@nuxt/eslint`, vitest, playwright, iconify lucide + material-symbols.
- `nuxt.config.ts`: `ssr: true`, `compatibilityDate` 2026-06-30, TypeScript estricto, `colorMode.preference: 'light'`, puerto por defecto 3071, runtimeConfig con `NUXT_SESSION_PASSWORD` y `CAUDAL_DB`.
- `tailwind.css` con los tokens de DESIGN.md v0 (tabla de tokens en CSS) y utilidades base `card`/`card-muted`/`hs-1`/`hs-2`/`pill`/`btn-primary`/`btn-secondary`/`tabular-nums`/`money-plus`/`money-minus`/`ip-flex`/`ol-link`.
- `nuxt-auth-utils` configurado y probando sesión local.
- vitest con alias `#shared` → `./shared`; test de humo (`money.ts` hacen `1+1`).
- ESLint sin errores; `pnpm dev` levanta sin errores en consola.
- `.env.example`, README arranque, `.gitignore` (datos/bd fuera de git).
- BD fuera de `current/` en producción vía `CAUDAL_DB`; local por defecto `data/caudal.db`.

## Criterios de aceptación

- [ ] `pnpm install && pnpm dev` levanta la app en `http://localhost:3071` sin errores ni warnings en consola.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm build` pasan limpios.
- [ ] `pnpm test` corre al menos un test de humo en `shared/` (alias `#shared` resuelve).
- [ ] La app muestra una página de bienvenida básica con los tokens de la identidad Caudal (fondo Frost, botón píldora, `tabular-nums`).
- [ ] Se define `NUXT_SESSION_PASSWORD` en `.env` y la sesión `useSession` devuelve objeto vacío en `/api/_health` sin errores.
- [ ] `data/caudal.db` (o `CAUDAL_DB`) queda fuera del control de versiones (gitignore activo).
- [ ] No hay dependencias extra sin justificar (ponytail: checklist de por qué cada una).