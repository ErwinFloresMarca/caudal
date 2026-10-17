# SPC-035 — Pago de cuota con dos patas (elegir fondo y cuenta del otro lado)

Estado: implementada · Issue: SEL-273

Depende de: [SPC-012](./SPC-012-deudas.md) (deudas/MSI), [SPC-010](./SPC-010-aportes-retiros.md) (aportes entre fondos), [SPC-008](./SPC-008-transacciones.md) (transacciones)

## Problema

Pagar una cuota crea **una sola** transacción en el fondo de la deuda (`server/utils/deudas.ts:299-352`,
`d.fondo_id` fijo, sin `grupo_id`). La cuenta de pago tiene que ser del fondo de la deuda
(`validarOrigen`, `server/utils/transacciones.ts:84-92` → `400 "Cuenta no encontrada en este fondo"`),
así que **no hay forma de registrar que la plata salió de otro fondo mío ni que otro fondo recibió el
importe**. El caso real del usuario: la deuda es de un fondo (el negocio) y la paga con plata de otro
(personal) — hoy eso no se puede representar, o se hace mintiendo sobre qué cuenta pagó.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Cómo se eligen los lados | El pago tiene **dos patas explícitas**: una que **sale de** una cuenta (gasto) y otra que **entra a** una cuenta (ingreso). La segunda es opcional: sin ella todo funciona como hoy |
| Qué une las patas | `grupo_id`, igual que los aportes/retiros entre fondos (`server/utils/aportes.ts:174-227`) |
| Fondo de la deuda | **MUST** ser el de una de las dos patas: si no, el pago no está atado a la deuda |
| Fondos | **MUST** ser distintos entre las patas (mismo fondo = movimiento sin sentido: usar el pago simple) |
| Multimoneda | Cada pata con la moneda de su cuenta; si una es USD, `tasa_ref` obligatoria y montos coherentes (mismo algoritmo que `resolverAporte`) |
| Por cobrar | Simétrico: también dos patas, con los signos invertidos según cuál lado sale y cuál entra |

Así se cubren los dos casos sin que la app decida por el usuario: "otro fondo mío la paga" (sale de
personal → entra al fondo de la deuda) y "otro fondo recibe el importe / me reembolsan" (sale del
fondo de la deuda → entra al elegido). Los **saldos de las cuentas siempre reflejan el movimiento
real**: la pata de gasto está en la cuenta de donde salió la plata.

## Requerimientos

- `pagarCuota` **MUST** aceptar una cuenta destino opcional (`otra_cuenta_id`); con ella **MUST** crear
  dos transacciones ligadas por `grupo_id` en una sola transacción de BD, con signos opuestos.
- **MUST NOT** cambiar el comportamiento actual cuando no se usa la opción (una pata, en el fondo de
  la deuda, y el mismo resultado).
- **MUST** validar que una de las dos cuentas sea del fondo de la deuda y que los fondos sean
  distintos, con errores explícitos.
- **MUST** respetar el aislamiento: las dos cuentas **MUST** ser del usuario de la sesión.
- La cuota **MUST** marcarse pagada y la deuda saldada igual que hoy (el estado de la deuda no depende
  de las transacciones).
- El endpoint de pago **MUST** aceptar el campo nuevo y el MCP (`pay_cuota`) **MUST** poder hacer lo
  mismo, declarando el argumento en su `inputSchema`.
- La UI **MUST** ofrecer la opción en el modal "Pagar cuota", dejando claro por texto qué cuenta paga
  y qué cuenta recibe, y **MUST** seguir funcionando sin elegir nada.
- Si se borra la deuda, las patas creadas al pagar **MUST** seguir el criterio que ya existe hoy (hoy
  no se borran): documentarlo, no cambiarlo en este spec.

## Criterios de aceptación

- Pago simple: idéntico a hoy (misma transacción, mismo resultado).
- Pago con dos patas: se crean dos transacciones con el mismo `grupo_id`, una `gasto` y una `ingreso`,
  cada una en el fondo de su cuenta; los saldos de las dos cuentas cambian en el sentido correcto.
- Cuenta de otro usuario → error; fondos iguales → error; ninguna cuenta del fondo de la deuda → error.
- Deuda `por_cobrar`: la pata en el fondo de la deuda es `ingreso` y la otra `gasto` (espejado).
- Cuenta USD en cualquier pata sin `tasa_ref` → error explícito.
- Test de aislamiento: las patas no se cruzan entre usuarios.
- `pnpm test`, `pnpm lint`, `pnpm typecheck` verdes; capturas en 390/1280 y claro/oscuro del modal.

## Fuera de alcance

- Pagos parciales reales (hoy `pagarCuota` sobrescribe el monto de la cuota: `deudas.ts:335`).
- Que la operación aparezca en la lista de aportes/retiros (queda en el detalle de la deuda y en
  movimientos; si se quiere agrupar con aportes, es otro spec).
- Borrar o desligar transacciones al borrar la deuda.
- Intereses, MSI o amortización (no existen: `shared/cuotas.ts` reparte en partes iguales).

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `server/utils/deudas.ts` | `parsePago` + `pagarCuota`: segunda pata con `grupo_id`, validaciones |
| `server/utils/aportes.ts` | Reusar (o extraer) el helper de conversión entre patas si hace falta |
| `server/api/deudas/[id]/cuotas/[cuotaId]/pagar.post.ts` | Pasa el campo nuevo |
| `server/utils/mcp.ts` | `pay_cuota`: argumento nuevo declarado y aplicado |
| `app/components/DetalleDeuda.vue` | Modal de pago: selector de fondo/cuenta del otro lado |
| `tests/deudas.test.ts` | Casos de dos patas, errores y aislamiento |
| `docs/specs/README.md` | Fila de este spec |
