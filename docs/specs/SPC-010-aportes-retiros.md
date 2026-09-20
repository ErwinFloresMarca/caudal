# SPC-010 — Aportes y retiros entre fondos

Estado: verificada
Depende de: SPC-008, SPC-009

## Problema

El usuario saca dinero de lo personal y lo mete a un emprendimiento (y a veces al revés). Eso **sí** afecta el resultado de ambos: el emprendimiento recibió un aporte (ingreso) y lo personal hizo una salida (gasto). No es una transferencia neutral. Formalizar esto como "aporte/retiro" evita que los totales mientan.

## Requerimientos

- **Aporte**: dinero que entra a un fondo desde afuera (típico: personal → negocio). En el fondo destino es un **ingreso**; si el origen es otro fondo del mismo usuario, en el origen es un **gasto**.
- **Retiro**: el inverso (negocio → personal): egreso en el fondo origen, ingreso en el destino.
- Se materializa como **dos transacciones ligadas por `grupo_id`** (una en cada fondo cuando hay dos): la de destino `ingreso` con categoría de sistema "Aporte recibido"; la de origen `gasto` con categoría de sistema "Retiro/Aporte entregado".
- La moneda de cada pata es la de su cuenta; si cruzan monedas, la pata que lo requiere guarda `tasa_ref`.
- Una sola operación en UI (alta rápida): elegir fondo destino, cuenta destino, monto, y opcionalmente fondo/cuenta origen; si no hay origen interno se asume aporte externo (solo la pata de ingreso).
- Editar/borrar la operación afecta ambas patas (por `grupo_id`).
- Reportes: cuentan como resultado en cada fondo por separado; en un consolidado multi-fondo se pueden netear/etiquetar como "movimiento interno" (se afina en SPC-015).
- Rutas: dentro de `/movimientos` con tipo especial, o `/transferencias` con pestaña "Entre fondos" (se decide en wireframes).

## Criterios de aceptación

- [x] Aporte personal → negocio de Bs 500: el fondo negocio sube Bs 500 como ingreso; el personal baja Bs 500 como gasto; ambas patas comparten `grupo_id`. (test)
- [x] Retiro en sentido inverso hace el efecto simétrico. (test)
- [x] Borrar la operación elimina/neutraliza ambas patas y restaura ambos fondos. (test)
- [x] Un aporte externo (sin fondo origen) solo crea la pata de ingreso.
- [x] En el reporte del fondo destino cuenta como ingreso; en el origen como gasto (no como transferencia neutral).
- [x] No se puede aportar a un fondo de otro usuario (validación server).

## Implementación (decisiones)

- **Rutas API**: `/api/aportes` (GET listado del fondo activo, POST crear) y `/api/aportes/:id` (GET, PATCH, DELETE). Se separan de `/api/transferencias` porque el aporte **sí** afecta el resultado (crea transacciones) y la transferencia no. La UI las consume luego desde `/transferencias` con la pestaña «Entre fondos» (wireframe 6.6).
- **Fondo derivado de las cuentas**: el body no manda `fondo_id`; cada pata hereda el fondo de su cuenta, validado contra el usuario. Evita IDs de fondo que vienen del cliente.
- **`grupo_id` = id de la pata destino** (ingreso). Es único y sirve de clave de agrupación; el aporte externo también lo fija (a su propio id) para que borrar/editar por grupo funcione igual. `grupo_id` se usa **solo** para aportes en el modelo actual.
- **Categorías de sistema**: `Aporte recibido` (ingreso) y `Retiro/Aporte entregado` (gasto), creadas on-demand por fondo reusando `es_predefinida` (no se añade un campo `es_sistema` al modelo). `categoriaSistema()` en `server/utils/categorias.ts` es idempotente por `(nombre, tipo)`.
- **Multimoneda**: la pata destino deriva su moneda de la cuenta; si cruza moneda, se resuelve el monto origen con `monto_origen_centavos` o `tasa_ref` (misma convención que SPC-009) y toda pata USD exige `tasa_ref`. La moneda es de cada cuenta, no se elige en el body.
- **Editar/borrar**: las cuentas/fondos quedan fijos; editar cambia montos, tasa, fecha y nota de ambas patas. Borrar elimina todas las filas con el `grupo_id`.
- **Atomicidad**: las dos patas se insertan en una `db.transaction`.

Archivos: `server/utils/aportes.ts`, `server/utils/categorias.ts` (`categoriaSistema`), `server/api/aportes*.ts`, `tests/aportes.test.ts`.