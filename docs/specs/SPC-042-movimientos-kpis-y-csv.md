# SPC-042 — Movimientos: KPIs, egresos por categoría y CSV con los filtros de la pantalla

Estado: verificada · Issue: SEL-282
Depende de: SPC-016 (búsqueda y filtros), SPC-015 (reportes), SPC-039 (CSV), pantalla 03 del mockup

## Problema

Movimientos es hoy solo un listado. Para saber cómo fue el período o en qué se fue la plata hay que ir a Reportes y **repetir los filtros** (que además son otros). Y el CSV de Reportes no acepta los filtros que sí tiene Movimientos: texto, cuenta, categoría, tipo, rango de monto y fuente.

## Requerimientos

- Cuatro tarjetas arriba de la lista, calculadas con **los mismos filtros** de la pantalla:
  - **Total ingresos** — monto + «N entradas».
  - **Total egresos** — monto + «N egresos» y «X % del ingreso consumido».
  - **Flujo neto** — monto, etiqueta **SUPERÁVIT** o **DÉFICIT**, y «X % de ahorro» (tasa de retención).
  - **Operaciones** — cantidad de registros y desglose «N ingresos · M egresos».
- Consolidación en la **moneda base del usuario**; los movimientos en USD usan su `tasa_ref` (misma regla que reportes).
- Panel **Egresos por categoría**: barras horizontales, top 6 por monto del período filtrado, con el porcentaje relativo al mayor gasto y el monto.
- `GET /api/movimientos/resumen` con **los mismos filtros** que `/api/movimientos` (sin `cursor`/`limite`/`orden`).
- `GET /api/movimientos/export.csv` con los mismos filtros y **todas** las filas (sin paginar), con las columnas y protecciones de SPC-039 (BOM, escape, neutralización de fórmulas).
- Botón **Exportar CSV** en Movimientos, junto a los filtros.
- KPIs, panel y CSV se recalculan al cambiar cualquier filtro, con el mismo debounce de la lista.
- La lógica de los KPIs (porcentaje consumido, tasa de ahorro, superávit/déficit) vive en `shared/` y tiene tests.

## Criterios de aceptación

- [ ] Los totales de las tarjetas cuadran con lo que se ve en la lista filtrada (sin contar filas de páginas no cargadas).
- [ ] Cambiar tipo, cuenta, categoría, texto, rango de fechas, monto o fuente actualiza tarjetas, panel y CSV.
- [ ] Las transferencias no entran: no son transacciones y no alteran los KPIs.
- [ ] Un filtro sin resultados deja las tarjetas en cero y el panel vacío, sin errores.
- [ ] El CSV baja exactamente las filas del filtro vigente (todas, no solo la página visible).
- [ ] Se ve bien a 390px y 1280px, en modo claro y oscuro.
- [ ] `pnpm test` cubre `shared/movimientos-kpis.ts`.

## Verificación local (pendiente deploy)

- `shared/movimientos-kpis.ts` con 5 tests; suite completa en 215 tests, lint, typecheck y build en verde.
- En dev (`:3072`, datos demo): los KPIs cuadran **exactamente** con la lista consolidada (ingresos Bs 6.972,80 / egresos Bs 6.026,25, con un movimiento USD convertido por su `tasa_ref`). El panel suma el mismo total de egresos (top 6 + "Otras categorías").
- `tipo=gasto` deja ingresos en 0 y 10 egresos; un filtro sin resultados devuelve todo en cero sin errores.
- `GET /api/movimientos/export.csv?tipo=gasto&...` baja exactamente las 10 filas del filtro.
- Capturas 1280/390 en claro y oscuro (`03-movimientos-*`, `03-movimientos-dark-*`): en móvil los filtros se apilan en dos filas y el panel pasa debajo de la lista.
- **Verificado en el deploy de v1.6.0** (run 39389083195, job `deploy` success; `pm2 caudal` 1.6.0 online).
