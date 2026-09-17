# Decisión 0001 — Modelo de datos y acceso a BD

Estado: aprobada (borrador). Fecha: 2026-09-17.

## Contexto

Caudal replica el patrón de BD de Ritmo (que ya funcionó): SQLite con `node:sqlite` (built-in de Node 22), **sin ORM**, esquema idempotente y SQL directo. Ritmo prevé migrar a `better-sqlite3` si hiciera falta, tocando un solo archivo.

## Decisión

1. **Motor**: SQLite vía `node:sqlite` (built-in). 0 dependencias.
2. **Punto único de acceso**: `server/utils/db.ts` exporta la instancia `DatabaseSync`. Ningún otro archivo abre la BD.
3. **Esquema idempotente**: `server/utils/schema.ts` ejecuta `CREATE TABLE IF NOT EXISTS` y usa `PRAGMA user_version` para migraciones incrementales (versión → script de migración).
4. **PRAGMA**: `journal_mode = WAL`, `foreign_keys = ON`.
5. **Tipos**: timestamps ISO-8601 en UTC con sufijo `Z`; fechas de día `YYYY-MM-DD`; campos JSON como TEXT (p. ej. `cadencia`); booleanos `0/1`.
6. **Multimusuario**: **toda** tabla de datos lleva `user_id` con `REFERENCES users(id)`. Toda consulta filtra por el usuario de sesión.
7. **Repositorios por dominio** (`server/utils/fondos.ts`, `cuentas.ts`, …): SQL corto por función, siempre filtrado por `user_id`.
8. **Moneda**: columna `TEXT` con valores `BOB`/`USD`. Montos en **enteros (centavos)**, columna `INTEGER`.
9. **Día de semana**: `strftime('%w', fecha)` → 0 = domingo (convención heredada de Ritmo).

## Alternativas descartadas

- ORM (Prisma/Drizzle): ritmo de desarrollo más lento y generación de código; SQL directo es suficiente.
- `better-sqlite3` ahora: no es built-in; se cambia solo si `node:sqlite` falla en producción.
- PostgreSQL/Neon/Supabase: ver decisión 0002 (multimoneda) — la BD es dedicada y local.

## Fuente

Ritmo `docs/decisions/0001-modelo-datos.md` (patrón heredado y probado).