# Decisión 0003 — PostgreSQL + Drizzle ORM

Estado: aprobada (borrador). Fecha: 2026-09-18. Reemplaza a la 0001 en lo relativo al motor y acceso a BD.

## Contexto

La decisión 0001 eligió SQLite con `node:sqlite` (sin ORM), heredando el patrón de Ritmo. Caudal necesita una BD relacional compartida y accesible desde más de un proceso (la web y el asistente vía MCP), y se acordó pasar a PostgreSQL en desarrollo y producción. El entorno de **desarrollo** es el Postgres del workdir (`docker-compose.yml` en la raíz, `127.0.0.1:5434`), aislado del de producción.

## Decisión

1. **Motor**: PostgreSQL 16.
2. **ORM**: Drizzle ORM (`drizzle-orm` + driver `pg`). Esquema tipado en TypeScript y query builder, sin SQL crudo en las rutas.
3. **Conexión**: `DATABASE_URL` en el `.env` (dev: `postgresql://dev:dev@127.0.0.1:5434/caudal_dev`). Cliente único en `server/utils/db.ts`; ningún otro módulo abre conexión.
4. **Esquema**: `server/db/schema.ts`. **Migraciones** con `drizzle-kit` en `server/db/migrations/` (`pnpm db:generate` → `pnpm db:migrate`); `pnpm db:push` solo para iterar en dev.
5. **Ids**: enteros con `identity` de Postgres.
6. **Tipos**: `timestamptz` para timestamps (UTC), `date` para fechas de día, `jsonb` para JSON (`cadencia`, `settings.value`), `boolean` para flags. Montos en **enteros (centavos)**, `integer`.
7. **Multiusuario**: se mantiene; toda tabla de datos lleva `user_id` y toda consulta filtra por el usuario de sesión.
8. **Repositorios por dominio** (`server/utils/*.ts`) sobre el query builder de Drizzle, siempre filtrado por `user_id`.

## Alternativas descartadas

- Seguir con SQLite/`node:sqlite`: suficiente para un proceso local, pero se acordó Postgres (BD compartida, acceso desde el MCP, sin límites de concurrencia de escritura).
- Prisma (como coin-holder-generator/vault-app): genera cliente y runtime aparte, más pesado; Drizzle es TypeScript-first y más liviano.
- `postgres` (postgres.js): se usa `pg` por ser el driver estándar y el ya conocido.

## Consecuencias

- Desarrollo: `docker compose up -d` en la raíz del workdir antes de `pnpm dev`.
- Producción: `DATABASE_URL` dedicada como env/secret; migrar con `pnpm db:migrate` en el deploy.
- Los specs afectados (SPC-001, SPC-002, SPC-016, SPC-020, SPC-023) se alinean a esta decisión.

## Fuente

Deroga el punto del motor de `docs/decisions/0001-modelo-datos.md`.
