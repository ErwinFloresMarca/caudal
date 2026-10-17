# SPC-037 — Convertir el importe de la primera pata si la cuenta de pago está en otra moneda

Estado: aprobada · Issue: SEL-275

Depende de: [SPC-035](./SPC-035-pago-cuota-dos-patas.md) (pago con dos patas), [SPC-008](./SPC-008-transacciones.md) (transacciones), [SPC-002](./SPC-002-modelo-datos.md) (multimoneda)

## Problema

`pagarCuota` pasa el importe de la cuota tal cual (`monto_centavos: monto`, `server/utils/deudas.ts`)
a la cuenta de pago, **sin mirar la moneda de esa cuenta**. Si la deuda es de Bs 30 y se paga desde
una cuenta en USD, la pata queda en **30 USD** (`3000` centavos de USD) — verificado en producción:
un pago de Bs 30 desde `Personal / Ahorro USD` restó `109500 → 106500`.

Es un comportamiento previo (no lo introdujo SPC-035) y afecta la exactitud de los saldos. SPC-035 ya
resolvió la conversión de la **segunda** pata con `montoEnMoneda` (`tasa_ref` = BOB por USD, misma
regla que los aportes); falta la primera.

## Requerimientos

- La pata de pago **MUST** expresarse en la moneda de **su** cuenta: si difiere de la de la deuda,
  **MUST** convertirse con `tasa_ref` (misma función `montoEnMoneda` que usa la segunda pata).
- Si las dos monedas difieren y no hay `tasa_ref`, **MUST** fallar con un error explícito (hoy solo
  se exige `tasa_ref` cuando la cuenta es USD, `server/utils/transacciones.ts:107-109`).
- El importe de la **cuota** (`cuotas.monto_centavos`) **MUST** seguir en la moneda de la **deuda**:
  la conversión es de la pata, no de la deuda.
- La UI **MUST** pedir la tasa cuando la moneda de la cuenta de pago difiera de la de la deuda (hoy
  solo la pide si la cuenta es USD: `cuentaPagoUsd` en `app/components/DetalleDeuda.vue`).
- Sin diferencia de monedas, el comportamiento **MUST** ser idéntico al actual.
- Las filas ya guardadas **MUST NOT** modificarse (no hay migración de datos).

## Criterios de aceptación

- Deuda en BOB pagada desde una cuenta USD con tasa 6,96 → la pata queda en **USD** con el importe
  convertido (30 BOB → 4,31 USD) y `tasa_ref` guardada; la cuota sigue en 3000 (BOB).
- Deuda en USD pagada desde una cuenta BOB con tasa → la pata queda en BOB (4,31 USD → 30 BOB).
- Monedas distintas sin `tasa_ref` → error explícito, sin crear ninguna pata.
- Misma moneda → pata idéntica a hoy (test de no regresión).
- Con la opción de dos patas: cada pata en la moneda de su cuenta y coherentes entre sí.
- `pnpm test`, `pnpm lint`, `pnpm typecheck` verdes.

## Fuera de alcance

- Reconvertir o corregir las transacciones ya guardadas con el criterio viejo.
- Unificar la conversión con `aportes.ts` (el `ponytail:` de `deudas.ts` sigue anotado; se hace si
  aparece un tercer caso).
- Cambiar cómo se calcula el reparto de las cuotas (`shared/cuotas.ts`).
- Tasas históricas por fecha: se usa la `tasa_ref` que manda el usuario, como en el resto del sistema.

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `server/utils/deudas.ts` | `pagarCuota`: resolver la moneda de la cuenta de pago y convertir el importe de la pata 1 |
| `app/components/DetalleDeuda.vue` | `tasaNecesaria` según la moneda de la deuda y la de la cuenta de pago |
| `tests/deudas.test.ts` | Casos de conversión en las dos direcciones y de tasa faltante |
| `docs/specs/README.md` | Fila de este spec |
