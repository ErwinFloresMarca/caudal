# SPC-043 — Saldo continuo en Movimientos

Estado: verificada · Issue: SEL-283
Depende de: SPC-008 (transacciones), SPC-009 (transferencias), SPC-042 (KPIs y CSV), pantalla 03 del mockup

## Problema

La lista de Movimientos dice cuánto se movió en cada fila, pero no **cuánto quedaba** después. No se ve el momento en que la plata se fue ni se puede detectar un cobro raro mirando el saldo alrededor.

## Decisiones

1. **El saldo es un dato derivado, nunca se persiste.** Se calcula en cada lectura. Editar o borrar un movimiento no obliga a recalcular ni reescribir nada: la próxima lectura vuelve a sumar. Un saldo guardado se desincroniza con la primera edición o concurrencia.
2. **Es el total consolidado de las cuentas del alcance**, en la moneda base del usuario. No es el saldo de una cuenta por fila (eso multiplicaría las columnas). Si se filtra por una cuenta, el alcance es esa cuenta.
3. **El alcance ignora los filtros de pantalla** (tipo, texto, monto, categoría, fuente). El saldo es del dinero, no de lo que se está mirando: filtrar gastos no debe "reiniciar" el saldo.
4. **Las transferencias entran en la suma aunque no se listen.** Mueven plata entre cuentas: a nivel de fondo se cancelan, a nivel de cuenta explican el movimiento. Se ignoran en el resultado (regla de neutralidad) pero no en el saldo.
5. **El saldo se ancla en el total actual de las cuentas** y se camina hacia atrás restando lo que movieron las filas posteriores.

## Requerimientos

- `GET /api/movimientos` devuelve `saldo_continuo_centavos` en cada fila (o `null` si falta la tasa para consolidar).
- `server/utils/movimientos-saldo.ts`: cálculo del mapa `id → saldo` sobre el alcance (fondo/cuenta).
- La fila muestra el saldo debajo del monto, en tabular y discreto, con una nota al pie que explica qué es y que las transferencias no cambian el total.
- Si falta la tasa, la columna simplemente no aparece (sin romper la pantalla).

## Criterios de aceptación

- [ ] El saldo de la fila más nueva coincide **exacto** con la suma de los saldos actuales de las cuentas del alcance, consolidada a la moneda base.
- [ ] Cada fila cumple `saldo(fila) = saldo(fila anterior) − efecto(fila anterior)`.
- [ ] Con `tipo=gasto` (o texto, categoría, monto) los saldos siguen siendo absolutos, no incrementales.
- [ ] Con `cuenta_id`, el alcance y el saldo son de esa cuenta.
- [ ] Las transferencias mueven el saldo a nivel de cuenta y se cancelan a nivel de fondo.
- [ ] Sin tasa configurada y cuentas en otra moneda, la API devuelve `null` y la UI no muestra la columna.
- [ ] Editar o borrar un movimiento actualiza los saldos de las filas siguientes sin ningún recálculo persistido.
- [ ] Se lee en claro y oscuro, a 390 y 1280.

## Verificación local (pendiente deploy)

- **Cuadre exacto**: la fila más nueva devuelve `3.171.503` centavos = suma de las cuentas del alcance (USD 2.627,16 × 6,96 + Bs 13.430 = Bs 31.715,03).
- **Cadena coherente**: cada fila cumple `saldo = saldo anterior − efecto anterior` (verificado a mano en las 9 filas visibles, incluyendo movimientos en USD).
- **Filtros**: con `tipo=gasto` los saldos siguen siendo absolutos (no se reinician); con `cuenta_id` el alcance y el saldo son de esa cuenta (Caja USD → Bs 2.868,63 = US$ 412,16 al cambio).
- **Transferencias**: incluidas en la suma; a nivel de fondo su delta es 0 (BOB→BOB), a nivel de cuenta mueven el saldo.
- Capturas en claro/oscuro a 1280 y 390: el saldo se lee discreto bajo el monto y la nota al pie explica qué es.
- **Verificado en el deploy de v1.6.0** (run 39389083195; el bundle desplegado incluye `saldo_continuo_centavos` y no re-aplicó migraciones).
