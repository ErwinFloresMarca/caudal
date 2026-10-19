# SPC-040 — Barras diarias por categoría en Reportes

Estado: implementada · Issue: SEL-280
Depende de: SPC-008 (transacciones), SPC-015 (reportes), decisión 0006 (gráficas SVG)

## Problema

Reportes muestra el total del período, una dona de gastos por categoría y la línea de evolución del saldo, pero no responde **cuándo** entró o salió el dinero ni de qué categoría. Para ver un mes "por dentro" (los días de compras grandes, el día que entró el sueldo) hay que abrir Movimientos y sumar a mano.

## Requerimientos

- Función pura en `shared/reportes.ts`: `barrasDiariasPorCategoria(movs, { desde, hasta, base, tasaFallback, top = 6 })` → por cada día del rango (reusa `rangoDias`), el desglose consolidado de ingresos y de egresos por categoría, más `otras`.
- Agrupación: **top 6 categorías por monto del período + "Otras"**; sin categoría va a "Sin categoría" (gris).
- `generarReporte` incluye el resultado como `barras_diarias` y la página lo pinta; no hay endpoint nuevo.
- Gráfica **SVG nativa** (decisión 0006, sin librerías): días en el eje X, **ingresos hacia arriba y egresos hacia abajo** en el mismo gráfico, barras apiladas por categoría con el color de cada una.
- Selector de series: **Ambos | Ingresos | Egresos** (en móvil, "Ambos" con muchas categorías se lee mal).
- Leyenda con las categorías visibles (nombre + color).
- Si el rango supera ~45 días, el área de barras conserva un ancho mínimo y hace scroll horizontal en vez de aplastarse.
- Etiquetas de fecha en el eje X espaciadas (no una por día en móvil).

## Criterios de aceptación

- [ ] La suma de las barras de un día es exactamente el neto consolidado de ese día (cuadra con la línea de evolución y con el flujo del período).
- [ ] Una deuda pagada en otro fondo no aparece dos veces: solo se grafican transacciones, no transferencias (igual que el resto de Reportes).
- [ ] El top 6 se calcula sobre el monto consolidado del período, sumando ingresos y egresos; el resto cae en "Otras".
- [ ] Cambiar rango, fondo o moneda base recalcula la gráfica sin recargar la página.
- [ ] "Ingresos" y "Egresos" del selector ocultan la mitad contraria y reescalan el eje.
- [ ] Se lee en modo claro y oscuro y no rompe el layout a 390px (verificado con captura).
- [ ] `pnpm test` cubre `barrasDiariasPorCategoria`: días sin movimientos, top + otras, y cuadre del total del día.

## Verificación local (pendiente deploy)

- `pnpm test`: `tests/barras.test.ts`, 6 casos (días vacíos, separación ingreso/egreso, suma por día, top 6 + Otras, conversión USD, sin categoría).
- Cuadre comprobado con datos demo: suma de barras del período = `flujo.consolidado` (Bs 6.972,80 / Bs 6.026,25).
- Capturas en `.screenshots/10-reportes-{1280,390}.png`: barras día a día, ingresos arriba / egresos abajo, leyenda por monto, sin desbordes en 390px. Falta el deploy para pasar a `verificada`.
