# SPC-013 — Metas de ahorro

Estado: verificada
Depende de: SPC-006

## Problema

El usuario quiere ahorrar para algo concreto (una impresora nueva, fondo de emergencia, un viaje) y ver el avance. Necesita una meta con monto objetivo y registrar aportes, opcionalmente reservando dinero de una cuenta.

## Requerimientos

- Meta: `nombre`, `monto_objetivo_centavos`, `moneda`, `fecha_objetivo` (opcional), `activa`, `fondo_id`.
- Aportes: `aportes_meta` (monto, fecha, cuenta de origen opcional, nota). Suma al progreso.
- Progreso = Σ aportes / objetivo; barra de progreso + porcentaje + restante.
- Meta cumplida (Σ ≥ objetivo) se marca como completada/alcanzada visualmente.
- Retirar de una meta (aporte negativo) para corregir o usar el dinero — se registra como aporte negativo o movimiento de retiro (se decide en wireframes; mínimo: permitir eliminar/editar aportes).
- Opcional: al aportar, **descontar de una cuenta** (crea una transacción clasificada como ahorro) o solo llevar el registro de la meta sin tocar cuentas. En v1 se decide en la spec de UI: mínimo = aportes como registro, sin transacción automática, para no duplicar con la cuenta.
- Vista `/metas`: tarjetas con progreso; detalle con historial de aportes.
- (`ponytail:` si "aportar y descontar de cuenta" complica, v1 = registro simple; marcar y ampliar si se pide.)

## Criterios de aceptación

- [x] Crear meta de Bs 5000; aportar Bs 1200 muestra 24% y Bs 3800 restantes. (test)
- [x] Sumar aportes que superen el objetivo marca la meta como alcanzada (100% tope).
- [x] Editar o borrar un aporte recalcula el progreso. (test)
- [x] Las metas se listan por fondo activo.
- [ ] Captura 390px/1280px de la lista de metas con progreso. — pendiente del pase visual (SPC-021).

## Implementación (decisiones)

- **Lógica pura** (`shared/metas.ts`): `calcularProgreso(aportes, objetivo)`. El porcentaje se topa a 100 para la barra; `alcanzada` en cuanto Σ ≥ objetivo; `restante = max(0, objetivo − Σ)`. Los aportes negativos (retiros) restan.
- **Cambio de modelo**: `aportes_meta.cuenta_id` pasa a **nullable** (migración `0001_curvy_famine.sql`) porque el spec y el wireframe piden cuenta **opcional**. Contradecía el `NOT NULL` de SPC-002.
- **v1 = registro simple**: el aporte **no** crea transacción ni toca saldos (wireframe 6.9). `cuenta_id` solo referencia la cuenta de origen como dato.
- **Aporte negativo = retiro**: `parseAporteMeta` acepta enteros ≠ 0 (positivo o negativo).
- **Validación**: la cuenta (si viene) debe ser del usuario y del **mismo fondo** de la meta. `aportes_meta` no tiene `user_id` (hija de `metas_ahorro`); todo se filtra por meta del usuario.
- **Rutas**: `/api/metas` (GET/POST), `/api/metas/:id` (GET/PATCH/DELETE), `/api/metas/:id/aportes` (POST), `/api/metas/:id/aportes/:aporteId` (PATCH/DELETE).

Archivos: `shared/metas.ts`, `server/utils/metas.ts`, `server/api/metas*.ts`, `server/db/schema.ts` + `server/db/migrations/0001_*`, `tests/metas.test.ts`.