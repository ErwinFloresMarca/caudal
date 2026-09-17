# Decisión 0002 — Multimoneda: tasa histórica por transacción

Estado: aprobada (borrador). Fecha: 2026-09-17.

## Contexto

Caudal maneja **BOB y USD** a la vez. El boliviano es volátil frente al dólar, y al usuario le interesa el control real de ingresos/egresos: quiere ver su historia **como fue**, no valuada con la tasa de hoy ni con promedios. No es una tienda: no hay inventario que valorar, así que no aplica la valuación por costo promedio o FIFO de un negocio de stock.

## Decisión

1. **Cada cuenta tiene una moneda fija** (`BOB` o `USD`). Las transacciones heredan la moneda de su cuenta.
2. **Tasa de referencia**: dólar **paralelo** (mercado no oficial). Se ingresa manualmente al registrar, con **auto-sugerencia** del último valor usado (guardado en `settings`).
3. **Tasa histórica por transacción**: cada transacción/envg/transferencia en **USD** guarda `tasa_ref` (BOB por USD) del momento. Las de BOB **no cargan tasa** (se leen tal cual).
4. **Consolidación**: convertir todo a **BOB** (moneda base por defecto) usando la tasa de cada movimiento; el color de resultado no difiere de la percepción real del momento. Si se quiere ver en USD, se usa la tasa propia de cada transacción de BOB.
5. **Transacciones en USD-consolidado**: `monto_centavos × tasa_ref` = BOB equivalente. Sin decimales en origen: el monto se guarda en centavos de SU moneda; el equivalente es solo para reportes.

## Impacto

- Tabla `transacciones.tasa_ref` y `transferencias.tasa_ref` (nullable).
- `shared/money.ts` expone `convertToBase(money, tasaRef, monedaBase)` y el formato por moneda.
- Reportes (SPC-015) muestran la moneda base elegida y dejan clara la tasa usada implícitamente.

## Alternativas descartadas

- **Tasa de referencia manual fija** (ej. la que mete el usuario en Ajustes como única): no refleja la historia; el usuario descartó porque pierde fidelidad.
- **Valuación a la tasa actual**: los totales históricos cambiarían retroactivamente con el mercado; confuso.
- **Doble columna monto+equivalente en cada registro**: redundante; basta `tasa_ref` a la hora de consolidar.

## Pendiente de afinar en la spec

- SPC-015 precisa cómo se agrega (suma de equivalentes por transacción) y cómo se muestra el detalle por moneda.