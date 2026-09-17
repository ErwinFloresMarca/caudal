# SPC-009 — Transferencias entre cuentas

Estado: propuesta
Depende de: SPC-008

## Problema

Mover dinero entre cuentas del **mismo fondo** (efectivo → banco, banco → ahorro, BOB → cuenta USD) no es un gasto: es un traslado. No debe afectar el resultado del período, pero sí los saldos de las dos cuentas.

## Requerimientos

- Transferir de `cuenta_origen` → `cuenta_destino`, **mismo fondo** (no cruza fondos; eso es aporte/retiro, SPC-010).
- Monto de origen en la moneda de la cuenta origen. Si origen y destino tienen distinta moneda, se ingresa el monto destino (o la tasa) y se guarda `tasa_ref` en la transferencia.
- Misma moneda: `monto_destino = monto_origen`.
- Fecha (por defecto hoy, admite pasada), nota opcional.
- Saldos: baja origen, sube destino. Resultado del fondo: NO cambia.
- Listado `/transferencias` + edición/borrado con confirmación (recalcula saldos).
- En el listado de movimientos (SPC-008) puede mostrarse una transferencia como movimiento de doble cuenta (se decide en wireframes); en reportes se excluye del resultado.

## Criterios de aceptación

- [ ] Transferir Bs 100 de Efectivo a Banco deja el total del fondo igual y mueve exactamente 10000 centavos entre cuentas. (test)
- [ ] Transferir Bs 300 a una cuenta USD con `tasa_ref=6,96` pide y guarda la tasa; el destino sube el equivalente correcto y el total del fondo no varía más allá del redondeo. (test)
- [ ] Origen y destino deben pertenecer al mismo fondo; si no, error de validación.
- [ ] No se permite transferir a la misma cuenta.
- [ ] Borrar una transferencia restaura ambos saldos. (test)
- [ ] Una transferencia NO aparece como ingreso ni egreso en los reportes de resultado (SPC-015).