# SPC-013 — Metas de ahorro

Estado: propuesta
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

- [ ] Crear meta de Bs 5000; aportar Bs 1200 muestra 24% y Bs 3800 restantes. (test)
- [ ] Sumar aportes que superen el objetivo marca la meta como alcanzada (100% tope).
- [ ] Editar o borrar un aporte recalcula el progreso. (test)
- [ ] Las metas se listan por fondo activo.
- [ ] Captura 390px/1280px de la lista de metas con progreso.