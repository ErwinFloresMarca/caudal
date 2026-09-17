# Caudal

Control de dinero personal y de emprendimientos. Multimoneda (BOB/USD), por **fondos** y **cuentas**, con gastos/ingresos, transferencias, movimientos recurrentes, deudas y MSI, metas de ahorro y reportes.

Hecho con Nuxt 4 + Nuxt UI + SQLite (`node:sqlite`) y pensado para el móvil. La IA (asistente personal vía MCP) podrá leer y registrar movimientos con autorización por API key.

## Arranque

```bash
pnpm install
cp .env.example .env   # pegar NUXT_SESSION_PASSWORD (32+ chars, ver ejemplo)
pnpm dev               # http://localhost:3071
```

## Scripts

| | |
|---|---|
| `pnpm dev` / `dev:https` | desarrollo |
| `pnpm test` | vitest (dinero, recurrentes, transacciones, aislamiento) |
| `pnpm lint` / `typecheck` / `build` | calidad y build |
| `pnpm start` | servir el build (`PORT` o 3071) |
| `pnpm screenshots` | capturas Playwright 1280px + 390px |
| `pnpm release` | bump + tag `vX.Y.Z` + push |

## Estado

En construcción — fase 1: specs (S-print: specs → wireframes → implementación). Ver `docs/ROADMAP.md` y `docs/specs/`.

## Documentación

- `AGENTS.md` — guía de trabajo para agentes (stack, comandos, convenciones, SDD)
- `DESIGN.md` — design system (identidad propia)
- `docs/specs/` — specs por feature (SPC-001…022)
- `docs/decisions/` — decisiones de diseño marcadas
- `docs/ROADMAP.md` — hoja de ruta