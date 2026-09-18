# SPC-016 — Búsqueda y filtros

Estado: propuesta
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

- [ ] Buscar una nota parcial encuentra la transacción. (test)
- [ ] Combinar fondo + categoría + rango de fechas devuelve el subconjunto correcto. (test)
- [ ] Los filtros se reflejan en la URL y al recargar se mantienen.
- [ ] "Limpiar filtros" restaura la vista sin filtros.
- [ ] La paginación no pierde ni repite filas al avanzar. (test)
- [ ] En móvil los filtros viven en un panel desplegable usable con una mano.