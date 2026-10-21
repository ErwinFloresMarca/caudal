# SPC-044 — Aportes a metas que mueven dinero

Estado: verificada · Issue: SEL-284
Depende de: SPC-013 (metas), SPC-008 (transacciones), SPC-035 (patrón de pago de cuota)

## Problema

El formulario de aporte a una meta deja elegir una **cuenta de origen**, pero el aporte no descuenta nada: solo suma al progreso. La app dice que ahorraste Bs 500 y que además tenés esos Bs 500 en la cuenta. En v1 fue deliberado (registro simple), pero la UI promete algo que no hace.

## Decisiones

1. **Con cuenta, el aporte crea una transacción** en esa cuenta: aporte positivo → `gasto`, retiro (negativo) → `ingreso`. Sin cuenta, sigue siendo solo registro.
2. **La transacción es espejo del aporte**: el progreso sigue sumando `aportes_meta` (no cambia `shared/metas.ts`); la transacción se sincroniza al editar y se borra al borrar el aporte.
3. **Una sola puerta de entrada**: las transacciones con `fuente='meta'` no se editan ni borran desde Movimientos (409 con mensaje que remite a la meta). Evita que el monto de la meta y el del movimiento diverjan.
4. **Borrar una meta no reescribe la historia**: se borran los aportes, las transacciones quedan (la plata salió de verdad).
5. **La cuenta debe ser de la misma moneda que la meta** (400 si no). Convertir aportes con tasa queda como límite anotado, con su camino de ampliación.
6. El gasto lleva la categoría **"Ahorro"** del fondo (se crea si no existe), para que los reportes la muestren como tal y no como "Otros".

## Requerimientos

- `aportes_meta.transaccion_id` (nullable, FK a `transacciones`), migración `0005`.
- `crearAporteMeta`: valida cuenta y moneda, crea la transacción y el aporte en **una sola transacción de BD**.
- `editarAporteMeta`: actualiza monto/tipo/fecha/nota de la transacción vinculada; **no** permite cambiar de cuenta (400).
- `borrarAporteMeta`: borra la transacción vinculada y el aporte.
- `borrarMeta`: borra aportes, **conserva** transacciones.
- `editarTransaccion` y `borrarTransaccion`: 409 si `fuente='meta'`.
- `aportePublico` expone `transaccion_id`.
- UI: aviso en el formulario ("se descuenta de la cuenta elegida"), selector de cuenta deshabilitado al editar un aporte ya vinculado.

## Criterios de aceptación

- [ ] Aporte de Bs 500 con cuenta: el saldo de la cuenta baja 500 y el progreso sube 500.
- [ ] Retiro de Bs 200 con cuenta: el saldo sube 200 y el progreso baja 200.
- [ ] Aporte sin cuenta: no crea transacción y el progreso se comporta como siempre.
- [ ] Editar el monto del aporte actualiza la transacción (mismo id, importe nuevo).
- [ ] Borrar el aporte borra su transacción.
- [ ] Borrar la meta borra los aportes y **deja** las transacciones.
- [ ] Aportar desde una cuenta en otra moneda responde 400.
- [ ] Editar o borrar la transacción desde Movimientos responde 409.
- [ ] Si falla la creación de la transacción, no queda aporte (atomicidad).
- [ ] `pnpm test` cubre los casos anteriores.

## Verificación local (pendiente deploy)

- `tests/metas.test.ts`: 20 casos (8 nuevos) — saldo baja/sube, transacción `fuente='meta'` con categoría "Ahorro", edición en la misma transacción, borrado en cascada, meta borrada conserva transacciones, moneda distinta, 409 desde Movimientos.
- E2E en dev (`:3072`) con la API real: aporte de US$ 50 desde "Caja" → saldo 41.216 → 36.216 centavos, movimiento 4351 con categoría Ahorro y `fuente=meta`; `PATCH`/`DELETE` de ese movimiento → **409**; retiro de US$ 20 → ingreso y saldo 38.216; meta en BOB con cuenta USD → **400** "La cuenta debe estar en BOB, como la meta"; borrar el aporte borra su transacción.
- Gates: 222 tests, lint, typecheck y build en verde.
- **Verificado en navegador** (Playwright, 390px): modal de alta muestra el aviso y la cuenta seleccionable; modal de edición muestra "La cuenta no se puede cambiar" con el selector **deshabilitado** y el valor de la cuenta.
- De paso se corrigió un desborde real en Movimientos móvil (ver nota del commit): la fila no encogía (`scrollWidth` 523 en 390) y las acciones de editar/borrar eran invisibles en táctil.
- **Verificado en el deploy de v1.7.0** (run 39538062648, job `deploy` success): la migración `0005` se aplicó desde el artefacto (`drizzle.__drizzle_migrations` pasó a **6**) y la columna `aportes_meta.transaccion_id` existe en producción; `pm2 caudal` 1.7.0 online y health `200`.
