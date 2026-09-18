# SPC-002 — Modelo de datos y acceso a BD

Estado: propuesta

## Problema

Caudal necesita persistir usuarios, fondos, cuentas, categorías, transacciones, transferencias, recurrentes, deudas/MSI, metas de ahorro y ajustes, con SQLite y con la garantía de que **nada se escribe ni se lee sin pertenecer al usuario de la sesión**.

## Requerimientos

- Motor SQLite (`node:sqlite`), acceso solo vía `server/utils/db.ts`.
- Esquema idempotente en `server/utils/schema.ts` (`CREATE TABLE IF NOT EXISTS` + `PRAGMA user_version`).
- Tablas (según decisión 0001 y el modelo de dominio acordado):
  - `users(id, email, name, password_hash, avatar_url, timezone, created_at)` — `password_hash` y `avatar_url` nullable (SPC-023: login con Google)
  - `oauth_accounts(id, user_id, provider, provider_id, email, name, avatar_url, created_at)` con `UNIQUE(provider, provider_id)` (SPC-023)
  - `api_keys(id, user_id, nombre, key_hash, created_at, last_used_at)`
  - `fondos(id, user_id, nombre, tipo, moneda_base, color, icono, activo, created_at)`
  - `cuentas(id, user_id, fondo_id, nombre, tipo, moneda, saldo_inicial_centavos, activa, created_at)`
  - `categorias(id, user_id, fondo_id, nombre, tipo, icono, color, es_predefinida, activa, created_at)`
  - `transacciones(id, user_id, fondo_id, cuenta_id, categoria_id, tipo, monto_centavos, moneda, tasa_ref, fecha, nota, fuente, grupo_id, created_at)`
  - `transferencias(id, user_id, fondo_id, cuenta_origen_id, cuenta_destino_id, monto_origen_centavos, monto_destino_centavos, tasa_ref, fecha, nota, created_at)`
  - `recurrentes(id, user_id, fondo_id, cuenta_id, categoria_id, tipo, monto_centavos, moneda, cadencia, proxima_fecha, activo, nota, created_at)`
  - `deudas(id, user_id, fondo_id, contraparte, direccion, concepto, monto_total_centavos, moneda, fecha_inicio, num_cuotas, estado, nota, created_at)`
  - `cuotas(id, deuda_id, numero, fecha_vencimiento, monto_centavos, pagada, fecha_pago, created_at)`
  - `metas_ahorro(id, user_id, fondo_id, nombre, monto_objetivo_centavos, moneda, fecha_objetivo, activa, created_at)`
  - `aportes_meta(id, meta_id, cuenta_id, monto_centavos, fecha, nota, created_at)`
  - `settings(user_id, key, value, created_at, PRIMARY KEY(user_id, key))`
- **Toda tabla de datos lleva `user_id`** salvo `cuotas` y `aportes_meta` (que heredan del padre). Toda consulta filtra por el usuario de sesión.
- Moneda `TEXT` (`BOB`|`USD`); montos `INTEGER` en centavos; `tasa_ref` nullable `REAL` (BOB por USD).
- Tipos: timestamps ISO-8601 UTC con `Z`; fechas `YYYY-MM-DD`; JSON en TEXT (p. ej. `cadencia`, `settings.value`).
- `fecha` de transacciones/transferencias NO es `created_at`: puede ser una fecha pasada.
- Repositorios por dominio (`server/utils/fondos.ts`, `cuentas.ts`, `transacciones.ts`, …) con SQL corto y filtrado por `user_id` toda consulta de datos.
- Se incluye liberar las migraciones de puesta al día (`user_version` ascender con cada tabla nueva).
- Los repos crean/utilizan los datos con `RETURNING` para devolver la fila insertada.
- El borrado físico de datos personales (GDPR-ish) es opcional: se usa `activo=0`/`activa=0` para fondos/cuentas/categorías (no eliminar filas que rompen histórico), salvo transacciones erróneas que sí se borran.

## Criterios de aceptación

- [ ] `schema.ts` crea todas las tablas; correr dos veces no da error.
- [ ] Un test crea un usuario y verifica que otra sesión (otro `user_id`) NO ve sus fondos/transacciones (aislamiento).
- [ ] Montos: insertar 1250 = Bs 12,50; nunca aparece un `3.14` como monto almacenado.
- [ ] `tasa_ref` nullable: una transacción de BOB no requiere aplicar tasa para consolidar (ver 0002).
- [ ] `db.ts` es el único módulo que abre la BD (grep): ninguna ruta llama `new DatabaseSync` directamente.
- [ ] Migrar del borrador: `user_version` refleja el total de tablas; no se re-crean tablas ya existentes con estructura distinta.