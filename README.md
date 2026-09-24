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
| `pnpm release [patch\|minor\|major]` | release: bump + tag `vX.Y.Z` + push (dispara la CI) |

## Producción

- **Dominio**: `https://caudal.erfm.dev` (nginx → `127.0.0.1:3071`, Cloudflare para DNS/HTTPS).
- **Proceso**: pm2 `caudal` (`/var/www/caudal/current`, `.env` con `DATABASE_URL` y `NUXT_SESSION_PASSWORD`).
- **BD**: PostgreSQL `caudal_prod` (rol `caudal`) en `127.0.0.1:5432`.
- **Release**: `pnpm release` publica `caudal-output.tar.gz`; el deploy en el VPS es `bash /var/www/caudal/current/deploy.sh`.

## MCP (asistente)

Servidor MCP autenticado por usuario para que el asistente consulte y registre dinero.

- **Endpoint**: `POST https://caudal.erfm.dev/api/mcp` (Streamable HTTP, JSON-RPC 2.0).
- **Auth**: `Authorization: Bearer caudal_...` — crea la key en **Ajustes → API keys** (se muestra una sola vez).
- **Tools**: `list_funds`, `list_accounts`, `get_balances`, `list_categories`, `list_transactions`, `create_transaction`, `create_transfer`, `get_month_summary`, `list_pending`.
- **Escritura**: `create_*` guardan con `fuente='asistente'`; el cliente debe pedir confirmación antes de escribir. Las tools solo operan sobre el usuario de la key.

## Estado

v0.1.1 desplegada en producción: backend completo (fondos, cuentas, transacciones, transferencias, aportes, recurrentes, deudas, metas, presupuestos, dashboard, reportes, búsqueda, ajustes, auth + Google) y shell de la app. Pendientes: PWA, MCP y pase visual. Ver `docs/ROADMAP.md` y `docs/specs/`.

## Documentación

- `AGENTS.md` — guía de trabajo para agentes (stack, comandos, convenciones, SDD)
- `DESIGN.md` — design system (identidad propia)
- `docs/specs/` — specs por feature (SPC-001…022)
- `docs/decisions/` — decisiones de diseño marcadas
- `docs/ROADMAP.md` — hoja de ruta