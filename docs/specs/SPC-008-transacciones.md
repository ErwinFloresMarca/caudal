# SPC-008 — Transacciones (gastos e ingresos)

Estado: propuesta
Depende de: SPC-002, SPC-006, SPC-007

## Problema

Es el corazón de Caudal: registrar cada gasto e ingreso contra una cuenta y categoría, en la moneda de la cuenta, con la tasa del dólar paralelo del momento para poder consolidar la historia sin mentir. Debe ser **rápido desde el móvil**.

## Requerimientos

- Registrar transacción: `cuenta` (del fondo activo), `categoria` (del mismo fondo), `tipo` (`ingreso`|`gasto`), `monto`, `fecha` (por defecto hoy, admite fechas pasadas), `nota` opcional.
- **Moneda heredada de la cuenta** (no se elige en el form): si la cuenta es USD y se registra, la transacción es USD.
- **Tasa histórica** (0002): si la transacción es USD, pedir `tasa_ref` (BOB por USD) con auto-sugerencia del último valor usado (settings). Las BOB no piden tasa.
- Módulo puro `shared/money.ts`:
  - `Money = { centavos: number; moneda: 'BOB'|'USD' }`
  - `parseAmount(texto)` acepta `12,50`, `12.50`, `1250` → 1250 centavos (entero). Rechaza `NaN`, negativos y más de 2 decimales.
  - `formatMoney(money)` → `Bs 12,50` / `US$ 45,00` (formato boliviano: punto de miles, coma decimal).
  - `convertToBase(money, tasaRef, base)` → Money en la base (BOB por defecto).
- Listado de movimientos: tabla/lista con fecha, categoría (icono+color), nota, cuenta, monto con signo y color (`money-plus`/`money-minus`), saldo running opcional (se decide en wireframes).
- Editar y borrar (borrado real, con confirmación) — borrar recalcula saldos.
- Alta/edición en `USlideover`/`UModal` con teclado numérico en móvil (`inputmode="decimal"`).
- Ruta `/movimientos` (global y por fondo activo).
- Los ingresos suman al saldo de la cuenta, los gastos restan.
- Cálculo de saldo: NO almacenado; se computa con SQL agregado filtrado por `user_id` y `cuenta_id`.

## Criterios de aceptación

- [ ] `parseAmount('12,50')` → 1250; `parseAmount('12.50')` → 1250; `parseAmount('1.250')` → 125000; `parseAmount('3,14')` y `parseAmount('-5')` fallan con mensaje claro. (test)
- [ ] `formatMoney({centavos:1250,moneda:'BOB'})` → `Bs 12,50`; USD → `US$ 12,50`. (test)
- [ ] Registrar un gasto BOB de Bs 12,50 baja el saldo de la cuenta exactamente 1250 centavos. (test)
- [ ] Registrar un ingreso USD US$ 45 con `tasa_ref=6,96` no pide tasa a la cuenta BOB y consolida a Bs 313,20 en el reporte. (test)
- [ ] Una transacción con fecha pasada aparece en su día (no en el de hoy).
- [ ] El formulario no permite elegir categoría de otro fondo ni cuenta de otro fondo (validación server).
- [ ] Captura 390px del formulario (con `inputmode` numérico) y del listado con signos/colores.