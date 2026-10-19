# SPC-039 — Exportar movimientos a CSV

Estado: implementada · Issue: SEL-279
Depende de: SPC-008 (transacciones), SPC-015 (reportes)

## Problema

Hoy los movimientos solo se leen dentro de la app. Para cuadrar un mes contra un estado de cuenta o hacer cuentas en una hoja de cálculo hay que copiarlos a mano. El pendiente #5 de `docs/DEUDA-TECNICA.md` lo pedía desde v1.

## Requerimientos

- `GET /api/reportes/movimientos.csv?desde=&hasta=&fondos=1,2&base=BOB|USD`, con **los mismos filtros y defaults que `/api/reportes`** (mes en curso, todos los fondos).
- Responde `text/csv; charset=utf-8` con `Content-Disposition: attachment` y nombre `caudal-movimientos-<desde>_<hasta>.csv`.
- Columnas: `fecha,tipo,monto,moneda,tasa_ref,monto_base,categoria,cuenta,fondo,nota`.
  - `monto` en unidades con punto decimal (`12.50`), no centavos.
  - `monto_base` es el equivalente consolidado a la moneda base del reporte.
- Solo movimientos del usuario autenticado y de sus fondos (mismos controles que `generarReporte`).
- La conversión a CSV es una función pura en `shared/csv.ts` (testeable sin servidor).
- Botón **Exportar CSV** en Reportes, junto a los filtros, que descarga con los filtros vigentes (mismo rango, fondo y base de la pantalla).

## Criterios de aceptación

- [ ] Con `desde`/`hasta` y un fondo elegidos, el archivo trae exactamente esos movimientos (ni uno más, ni uno menos).
- [ ] Un movimiento con coma, comillas o salto de línea en la nota se lee bien al reabrirlo (escapado RFC 4180).
- [ ] Los acentos se ven correctos al abrir en Excel (BOM UTF-8).
- [ ] Una celda que empieza con `=`, `+`, `-` o `@` se neutraliza (no se ejecuta como fórmula en la hoja de cálculo).
- [ ] Pedir el CSV con el `fondos` de otro usuario responde 400, no filtra datos ajenos.
- [ ] `pnpm test` cubre `shared/csv.ts`: escape, BOM y neutralización de fórmulas.
- [ ] El botón descarga el archivo con los filtros que se ven en pantalla (verificado en dev).

## Verificación local (pendiente deploy)

- `pnpm test`: 23 archivos / 210 tests en verde (`tests/csv.test.ts`, 6 casos).
- Dev en `:3072` con datos demo: `GET /api/reportes/movimientos.csv` → `200`, `text/csv`, `Content-Disposition` correcto, BOM `EF BB BF` y CRLF; 17 filas en un rango de dos meses; `fondos=999999` → `400`.
- Botón visible en Reportes (1280 y 390). Falta el deploy para pasar a `verificada`.
