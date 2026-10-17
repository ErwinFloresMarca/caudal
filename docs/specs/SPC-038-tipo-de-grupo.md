# SPC-038 — Distinguir el tipo de grupo: los pagos de cuota no son aportes

Estado: verificada · Issue: — (Linear rechaza crear más: límite del plan free alcanzado)

Verificado en el run del tag **v1.4.2**: `Test Files 21 passed (21)` / **`Tests 198 passed (198)**`,
`> Deploy OK: v1.4.2` y la columna `grupo_tipo` aplicada en la base de producción (el deploy migra
antes de reiniciar pm2). Los 4 casos nuevos fallan si se revierte el cambio (comprobado mutando el
código). Registro de la decisión: [`docs/decisions/0009-grupo-tipo.md`](../decisions/0009-grupo-tipo.md).

Depende de: [SPC-035](./SPC-035-pago-cuota-dos-patas.md) (pago con dos patas), [SPC-010](./SPC-010-aportes-retiros.md) (aportes/retiros)

## Problema

SPC-035 liga las dos patas del pago de una cuota con `grupo_id`, **el mismo mecanismo que usan los
aportes/retiros entre fondos**. Como `listarAportes` agrupa por `grupo_id`
(`server/utils/aportes.ts:255-276`), el pago aparece en la **pestaña de aportes** de Transferencias,
y desde ahí `borrarAporte` lo borra entero: las dos patas desaparecen y la cuota queda marcada
`pagada` sin ningún movimiento que la respalde (verificado por API durante SPC-035).

No hay nada que distinga un grupo de otro: las patas se parecen (un `gasto` y un `ingreso` con el
mismo `grupo_id`) y `transacciones` no guarda de qué operación viene el grupo.

## Requerimientos

- `transacciones` **MUST** registrar el tipo de grupo (`aporte` | `pago_cuota`), con `NULL` para los
  grupos viejos (que se tratan como aportes).
- `crearAporte` **MUST** marcar sus patas como `aporte`; `pagarCuota` **MUST** marcar las suyas como
  `pago_cuota`.
- `listarAportes` **MUST** mostrar solo los grupos `aporte` (o `NULL`, por compatibilidad): un pago de
  cuota **MUST NOT** aparecer en la pestaña de aportes.
- `borrarAporte` **MUST** rechazar un grupo que no sea `aporte` con un error explícito (el pago de una
  cuota no se deshace desde ahí).
- El `UPDATE` que marca la cuota pagada **MUST** ocurrir dentro de la misma transacción de BD que
  crea las dos patas: si falla, no queda ninguna pata.
- Los datos existentes **MUST NOT** modificarse (los grupos viejos sin tipo siguen funcionando).

## Criterios de aceptación

- Tras pagar una cuota con dos patas: `GET /api/aportes` **no** la incluye; las dos patas siguen
  visibles en el detalle de la deuda y en los movimientos de cada fondo.
- `borrarAporte` sobre un grupo `pago_cuota` → 400 con mensaje claro, sin borrar nada.
- Un aporte creado después del cambio sigue apareciendo y se sigue pudiendo borrar.
- Si el `UPDATE` de la cuota falla (simulado en test), no queda ninguna pata creada.
- La migración se aplica sola en el deploy (el `deploy.sh` ya corre `pnpm db:migrate`).
- `pnpm test`, `pnpm lint`, `pnpm typecheck` verdes.

## Fuera de alcance

- **Deshacer un pago de cuota** (devolver la cuota a pendiente y borrar sus patas). Es lo que hoy se
  intentaba hacer —mal— desde aportes: merece su propia feature con su endpoint y su UI.
- Excluir estas patas de los listados de movimientos (deben verse: es plata que se movió).
- Unificar `resolverAporte`/`montoEnMoneda` (sigue anotado como `ponytail:`).

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `server/db/schema.ts` | Columna `grupo_tipo` en `transacciones` |
| `server/db/migrations/0004_*.sql` | Migración generada con `pnpm db:generate` |
| `server/utils/aportes.ts` | Marcar `aporte`; `listarAportes` filtra; `borrarAporte` rechaza lo ajeno |
| `server/utils/deudas.ts` | Marcar `pago_cuota` y mover el `UPDATE` de la cuota dentro de la transacción |
| `tests/aportes.test.ts`, `tests/deudas.test.ts` | Casos nuevos |
| `docs/specs/README.md` | Fila de este spec |
