# SPC-011 — Movimientos recurrentes

Estado: propuesta
Depende de: SPC-008

## Problema

Sueldos, alquiler, suscripciones y servicios se repiten. Registrarlos a mano cada mes es tedioso y propenso a olvido. Se necesita plantillas recurrentes que generen (o recuerden) el movimiento cuando toca.

## Requerimientos

- Plantilla: `cuenta`, `categoria`, `tipo`, `monto_centavos`, `moneda` (heredada de la cuenta), `cadencia` (JSON: `semanal` | `quincenal` | `mensual` | `anual`, y día/semana), `proxima_fecha`, `activo`, `nota`.
- `proxima_fecha` se calcula al definir la cadencia; al generar movimiento, avanza a la siguiente.
- Generación: al abrir la app, los recurrentes con `proxima_fecha <= hoy` se muestran como **pendientes por confirmar** (evita crear movimientos erróneos por adelantado). El usuario confirma → se crea la transacción (`fuente='recurrente'`) y avanza `proxima_fecha`.
- Opción "registrar y saltar": crea sin moverse; y "saltar este" avanza sin crear.
- Nada se crea automáticamente sin confirmación (decisión ponytail/seguridad: no inventar gastos).
- Vista `/recurrentes`: lista con próximo vencimiento, estado y monto; alta/edición en slideover.
- Lógica de cadencia en `shared/recurrentes.ts` (pura, testeable): `nextDate(fecha, cadencia)`.

## Criterios de aceptación

- [ ] `nextDate('2026-01-31', {tipo:'mensual'})` → siguiente mes con ajuste de fin de mes (31 → 28/29 si aplica). (test)
- [ ] `nextDate` cubre semanal, quincenal y anual con casos borde (fin de mes, 15 vs 30). (test)
- [ ] Un recurrente con `proxima_fecha` pasada aparece como pendiente; confirmar crea una transacción con la fecha esperada y avanza `proxima_fecha`.
- [ ] "Saltar este" avanza la fecha sin crear transacción.
- [ ] Pausar (`activo=0`) lo saca de pendientes sin borrar la plantilla.
- [ ] El movimiento generado aparece en `/movimientos` con `fuente='recurrente'`.