# Caudal

Control de dinero personal y de emprendimientos. Multimoneda (BOB/USD), por **fondos** y **cuentas**, con gastos/ingresos, transferencias, movimientos recurrentes, deudas y MSI, metas de ahorro y reportes.

Hecho con Nuxt 4 + Nuxt UI v4 + **PostgreSQL (Drizzle ORM)** y pensado para el móvil. La IA (asistente personal vía MCP) podrá leer y registrar movimientos con autorización por API key.

## Arranque

```bash
docker compose up -d   # Postgres de desarrollo (en la raíz del workdir; :5434, crea caudal_dev)
pnpm install
cp .env.example .env   # NUXT_SESSION_PASSWORD (32+ chars) + DATABASE_URL (ver ejemplo)
pnpm db:migrate        # aplica las migraciones (drizzle-kit)
pnpm dev               # http://localhost:3071
```

## Scripts

| | |
|---|---|
| `pnpm dev` / `dev:https` | desarrollo |
| `pnpm lint` / `typecheck` / `build` | calidad y build |
| `pnpm test` | vitest (tests/**, shared/**) |
| `pnpm db:generate` / `db:migrate` | generan y aplican migraciones (drizzle-kit) |
| `pnpm db:push` | sincroniza el esquema en dev (sin migración) |
| `pnpm db:studio` | explorar la BD con Drizzle Studio |
| `pnpm start` | servir el build (`PORT` o 3071) |

## Estado

Fase 1 en curso: bootstrap Nuxt 4 (SPC-001) hecho; siguen specs → wireframes → implementación. Ver `docs/ROADMAP.md` y `docs/specs/`.

## Documentación

- `AGENTS.md` — guía de trabajo para agentes (stack, comandos, convenciones, SDD)
- `DESIGN.md` — design system (identidad propia)
- `docs/specs/` — specs por feature (SPC-001…022)
- `docs/decisions/` — decisiones de diseño marcadas
- `docs/ROADMAP.md` — hoja de ruta