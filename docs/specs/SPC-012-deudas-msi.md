# SPC-012 — Deudas y MSI

Estado: propuesta
Depende de: SPC-008

## Problema

El usuario tiene deudas (lo que debe) y por cobrar (lo que le deben), y compras a meses sin intereses (MSI) que son cuotas fijas. Necesita ver el saldo pendiente, las cuotas por vencer y registrar el pago de cada cuota sin perder de vista el total.

## Requerimientos

- **Deuda**: `contraparte`, `direccion` (`por_pagar` = debo | `por_cobrar` = me deben), `concepto`, `monto_total_centavos`, `moneda`, `fecha_inicio`, `num_cuotas`, `estado` (`activa`|`saldada`), `nota`.
- Al crear una deuda con `num_cuotas > 1` se generan sus `cuotas` (numero, fecha_vencimiento, monto). MSI = cuotas sin interés (total dividido en cuotas, con ajuste de centavos en la última).
- `monto` de cada cuota puede editarse (interés, cuota distinta) antes de pagarse.
- Pagar una cuota: marca `pagada=1`, `fecha_pago`, y **crea la transacción** correspondiente (gasto si es por pagar, ingreso si es por cobrar) contra cuenta+categoría elegidas.
- Si todas las cuotas están pagadas → deuda `saldada` automáticamente.
- Vista `/deudas`: listado con direccion (a favor/en contra), saldo pendiente, próxima cuota, progreso (pagadas/total).
- Vista detalle: cuotas con fecha/monto/estado y acción pagar.
- Resumen de deuda total neta en dashboard (SPC-014).
- Alta/edición en slideover; monto en enteros; moneda de la deuda es propia (no hereda de cuenta si no se le asigna una al pagar).

## Criterios de aceptación

- [ ] Crear deuda de Bs 300 en 3 cuotas genera 3 cuotas de exactamente 10000 centavos (o ajuste de centavos documentado). (test)
- [ ] Crear deuda de Bs 100 en 3 cuotas reparte 3334+3333+3333 = 10000 centavos exactos. (test)
- [ ] Pagar una cuota crea una transacción en la cuenta elegida y sube el progreso a 1/3. (test)
- [ ] Pagadas todas, la deuda pasa a `saldada`.
- [ ] Una deuda `por_cobrar` genera un ingreso al pagar su cuota; `por_pagar`, un gasto.
- [ ] Editar el número de cuotas recalcula las no pagadas sin tocar las pagadas.