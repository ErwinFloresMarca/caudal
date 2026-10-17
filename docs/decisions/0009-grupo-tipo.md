# 0009 — Tipo de grupo en las transacciones (`grupo_tipo`)

- **Fecha**: 2026-10-17
- **Spec**: [SPC-038](../specs/SPC-038-tipo-de-grupo.md)

## Contexto

SPC-035 liga las dos patas del pago de una cuota con `grupo_id`, el mismo mecanismo que usan los
aportes/retiros entre fondos (SPC-010). Como `listarAportes` agrupa por `grupo_id`, el pago de una
cuota aparecía en la pestaña de aportes de Transferencias, y desde ahí `borrarAporte` lo borraba
entero: **la cuota quedaba marcada como pagada sin ningún movimiento que la respaldara**.

No había forma de distinguir un grupo de otro: las patas se parecen (un `gasto` y un `ingreso` con el
mismo `grupo_id`) y `transacciones` no guardaba de qué operación venía el grupo.

## Decisión

Se agrega `transacciones.grupo_tipo text` (**nullable**):

- `'aporte'` → patas creadas por `crearAporte`.
- `'pago_cuota'` → patas creadas por `pagarCuota`.
- `NULL` → grupos anteriores a esta migración (se tratan como `'aporte'`).

`listarAportes` muestra solo grupos `'aporte'` o `NULL`; `borrarAporte` rechaza los `'pago_cuota'` con
un error explícito. Un pago de una sola pata no lleva `grupo_tipo` (no tiene `grupo_id`, no es un
grupo y nunca apareció en aportes).

## Por qué así

- **Columna nullable y sin migrar datos**: los grupos viejos siguen funcionando sin backfill, y la
  migración es un `ALTER TABLE ... ADD COLUMN` (sin riesgo ni bloqueo relevante).
- **El tipo vive en la transacción, no en una tabla de grupos**: no existe tabla de grupos y crear una
  sería maquinaria para dos valores. Si algún día hay muchos tipos, se promueve a tabla.
- **Alternativa descartada**: deducir el tipo por la forma de las patas o por la `nota` — frágil y sin
  garantía ante cambios futuros.

## Consecuencias

- El deploy aplica la migración **antes** de reiniciar pm2 (`deploy.sh`: `pnpm db:migrate` →
  `pm2 restart`), así que el código nuevo nunca corre contra una base sin la columna.
- **Los entornos de desarrollo también necesitan migrar**: el gate local de `pnpm release` corre los
  tests contra el `.env` (base `caudal_dev`), así que si no se aplica la migración ahí, el release
  falla con "column does not exist". Pasó una vez (v1.4.2) y se resolvió con `pnpm db:migrate`.
- Queda pendiente (otra feature): **deshacer un pago de cuota** (devolver la cuota a pendiente y
  borrar sus patas), que es lo que antes se intentaba hacer —mal— desde la pestaña de aportes.
