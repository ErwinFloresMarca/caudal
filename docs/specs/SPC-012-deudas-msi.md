# SPC-012 — Deudas y MSI

Estado: verificada
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

- [x] Crear deuda de Bs 300 en 3 cuotas genera 3 cuotas de exactamente 10000 centavos (o ajuste de centavos documentado). (test)
- [x] Crear deuda de Bs 100 en 3 cuotas reparte 3334+3333+3333 = 10000 centavos exactos. (test)
- [x] Pagar una cuota crea una transacción en la cuenta elegida y sube el progreso a 1/3. (test)
- [x] Pagadas todas, la deuda pasa a `saldada`.
- [x] Una deuda `por_cobrar` genera un ingreso al pagar su cuota; `por_pagar`, un gasto.
- [x] Editar el número de cuotas recalcula las no pagadas sin tocar las pagadas.

## Implementación (decisiones)

- **Lógica pura** (`shared/cuotas.ts`): `repartirMonto` (sobrante de centavos a las primeras cuotas: 10000/3 → 3334+3333+3333), `fechasCuotas` y `generarCuotas`. Las fechas reusan `nextDate` de `shared/recurrentes` con ancla mensual desde `fecha_inicio`; **la cuota 1 vence en `fecha_inicio`** y recorta fin de mes.
- **Pago** (`pagarCuota`): crea la transacción vía `crearTransaccion` (cuenta/categoría del fondo de la deuda, moneda de la cuenta), `gasto` si `por_pagar` e `ingreso` si `por_cobrar`; marca la cuota (`pagada`, `fecha_pago`, monto si se sobrescribe) y pone `estado='saldada'` cuando no quedan pendientes. El monto de la transacción puede sobrescribirse (interés/cuota distinta).
- **Editar cuota** (`editarCuota`): cambia monto/fecha de una cuota no pagada; las pagadas se rechazan.
- **Editar deuda** (`editarDeuda`): recalcula solo las cuotas **no pagadas**, repartiendo el monto restante (`monto_total − ya pagado`) entre las cuotas restantes; conserva las pagadas tal cual. `num_cuotas` no puede ser menor que las pagadas; si el total no cuadra con las pagadas, 400.
- **Moneda de la deuda es propia**; el pago usa la moneda de la cuenta elegida (SPC-008), con `tasa_ref` obligatoria si es USD.
- **Resumen para dashboard (SPC-014)**: no se implementa aquí para no sumar BOB+USD sin tasa; SPC-014 lo decide.
- **Aislamiento**: `cuotas` no tiene `user_id` (es hija de `deudas`, SPC-002); todo se filtra por `deuda_id` de una deuda del usuario.

Archivos: `shared/cuotas.ts`, `server/utils/deudas.ts`, `server/api/deudas*.ts`, `tests/deudas.test.ts`.