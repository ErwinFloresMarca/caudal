# SPC-016 — Búsqueda y filtros

Estado: verificada
Depende de: SPC-008

## Problema

Cuando pasan los meses, encontrar "aquel pago de Bs 800 a la imprenta" a mano es imposible. Hace falta buscar y filtrar movimientos rápido, también desde el móvil.

## Requerimientos

- Buscador de movimientos por **nota** y **nombre de categoría/contraparte** (texto, con `ILIKE` de Postgres para insensibilidad a mayúsculas).
- Filtros combinables en `/movimientos`:
  - rango de fechas (desde/hasta),
  - fondo (todos o activo),
  - cuenta,
  - categoría,
  - tipo (`ingreso`|`gasto`),
  - moneda (`BOB`|`USD`),
  - monto mín/máx,
  - fuente (`manual`|`asistente`|`recurrente`).
- Orden: fecha desc por defecto; alternar por monto.
- Filtros en la URL (query params) para recargar/compartir; resumen de filtros activos con "limpiar".
- Paginación o scroll incremental (mínimo: paginación por cursor/fecha).
- Índices Postgres para fecha, cuenta y categoría (declarar en `server/db/schema.ts` y migrar con drizzle-kit).
- Búsqueda global (comandos, `Ctrl/Cmd+K`) opcional; no bloquea v1.

## Criterios de aceptación

- [x] Buscar una nota parcial encuentra la transacción. (test)
- [x] Combinar fondo + categoría + rango de fechas devuelve el subconjunto correcto. (test)
- [ ] Los filtros se reflejan en la URL y al recargar se mantienen. — el backend acepta los query params; la UI es del pase visual (SPC-021).
- [ ] "Limpiar filtros" restaura la vista sin filtros. — UI (SPC-021).
- [x] La paginación no pierde ni repite filas al avanzar. (test)
- [ ] En móvil los filtros viven en un panel desplegable usable con una mano. — UI (SPC-021).

## Implementación (decisiones)

- **`buscarTransacciones(userId, filtros)`** en `server/utils/transacciones.ts`; `/api/movimientos` (GET) parsea los query params y la usa. `listarTransacciones` se conserva para dashboard/reportes.
- **Filtros**: `q` (nota o **nombre de categoría** con `ILIKE`), `desde`/`hasta`, `fondo_id` (`<id>` o `todos`; por defecto el activo), `cuenta_id`, `categoria_id`, `tipo`, `moneda`, `monto_min`/`monto_max`, `fuente`, `orden` (`fecha`|`monto`), `limite`, `cursor`.
- **`contraparte`** no aplica a transacciones (es campo de deudas, SPC-012); la búsqueda cubre nota + nombre de categoría.
- **Paginación por cursor**, no offset: el cursor es `fecha|id` (orden fecha) o `monto|id` (orden monto) y se pide `limite + 1` filas para saber si hay más. No pierde ni repite ante altas concurrentes.
- **Índice**: `transacciones_categoria_id_idx` (migración `0002_flashy_zaladane.sql`); fecha y cuenta ya existían.
- **Búsqueda global (Ctrl/Cmd+K)**: fuera de v1 (opcional en el spec).

Archivos: `server/utils/transacciones.ts`, `server/api/movimientos.get.ts`, `server/db/schema.ts` + `server/db/migrations/0002_*`, `tests/busqueda.test.ts`.