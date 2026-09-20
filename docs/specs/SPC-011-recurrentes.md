# SPC-011 — Movimientos recurrentes

Estado: verificada
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

- [x] `nextDate('2026-01-31', {tipo:'mensual'})` → siguiente mes con ajuste de fin de mes (31 → 28/29 si aplica). (test)
- [x] `nextDate` cubre semanal, quincenal y anual con casos borde (fin de mes, 15 vs 30). (test)
- [x] Un recurrente con `proxima_fecha` pasada aparece como pendiente; confirmar crea una transacción con la fecha esperada y avanza `proxima_fecha`.
- [x] "Saltar este" avanza la fecha sin crear transacción.
- [x] Pausar (`activo=0`) lo saca de pendientes sin borrar la plantilla.
- [x] El movimiento generado aparece en `/movimientos` con `fuente='recurrente'`.

## Implementación (decisiones)

- **Lógica pura**: `shared/recurrentes.ts` — `nextDate`, `normalizarCadencia`, `esVencida`. Las frecuencias por mes calendario (mensual…anual) conservan el **día ancla** en `cadencia.dia` para sobrevivir al recorte de fin de mes (31 → 28/29); `normalizarCadencia` lo fija al crear/editar si no viene. Las de suma de días no usan ancla.
- **Interpretación de `quincenal`**: +15 días (sin desbordes de mes). La cadencia `semanal` es +7 días (conserva el día de la semana; `dia_semana` queda informativo).
- **`proxima_fecha` se avanza UNA ocurrencia** por acción (confirmar/saltar), como pide el spec. Si queda vencida, sigue apareciendo en pendientes.
- **Rutas**: `/api/recurrentes` (GET lista + `pendientes`, POST), `/api/recurrentes/:id` (GET/PATCH/DELETE), `/api/recurrentes/:id/confirmar` (POST), `/api/recurrentes/:id/saltar` (POST).
- **Confirmar** acepta `fecha` (registro en fecha distinta a la programada) y `tasa_ref` (cuentas USD, SPC-008); el avance siempre se ancla en la fecha programada. El spec menciona «registrar y saltar» como acción aparte: queda cubierta por **confirmar con `fecha` propia**; el wireframe la rotula «Registrar y editar» (UI, SPC-021).
- **`fuente='recurrente'`**: se añadió `fuente` a `DatosTransaccion`/`transaccionPublica`; el movimiento generado la lleva y se expone en `/movimientos`.
- **Moneda heredada de la cuenta** al crear/editar. Se puede cambiar de cuenta (es plantilla, a diferencia de una transacción).

Archivos: `shared/recurrentes.ts`, `server/utils/recurrentes.ts`, `server/utils/transacciones.ts` (fuente), `server/db/schema.ts` (tipo `Cadencia` centralizado en shared), `server/api/recurrentes*.ts`, `tests/recurrentes.test.ts`.