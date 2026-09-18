# SPC-024 — Presupuestos por categoría

Estado: propuesta
Depende de: SPC-002, SPC-005, SPC-007, SPC-008

## Problema

El usuario sabe a dónde va su dinero después de que sale, no antes. Sin un límite mensual por categoría no hay control preventivo: se decide en el wireframe `09.presupuestos` (docs/stitch_caudal_wireframe_specs) que Caudal trae presupuestos con alertas en vivo (en ritmo / alerta >80 % / sobregiro) para que el gasto se frene a tiempo, no se recuerde.

## Requerimientos

- Un presupuesto por (fondo, categoría de gasto, mes): `monto_limite` (en la moneda del fondo) y `mes` (`YYYY-MM`).
- La categoría presupuestada se consume con las transacciones de gasto del fondo y mes, en su moneda (sin conversión; filtro por cuenta.moneda == moneda del presupuesto). Si hay que filtrar por categoría oculta/activa, aplicar las reglas de SPC-007.
- Estado por categoría en el mes: **En ritmo** (consumido < 80 % del límite), **Alerta** (≥ 80 %), **Sobregiro** (consumido > límite). El umbral 80 % es constante configurable en `shared/presupuestos.ts`.
- Cálculos puros en `shared/presupuestos.ts` (importable por tests, sin imports de server):
  - `estadoPresupuesto(consumido, limite, umbral=0.8)` → `en_ritmo | alerta | sobregiro`.
  - `disponible(consumido, limite)` y `disponiblePorDia(consumido, limite, diasRestantesDelMes)`.
  - `compensar(limiteA, consumidoA, montoA, limiteB, consumidoB, montoB)` → mueve `monto` entre presupuestos sin cambiar el total asignado (validando que no quede negativo).
- Ruta `/presupuestos` (por fondo activo): KPIs del mes (Asignado, Consumido, Disponible restante, Gasto diario permitido), pills de filtro por estado, cards por categoría con barra de progreso, porcentaje y ritmo diario.
- Widgets: distribución del ingreso (regla 50/30/20) e histórico de cumplimiento por los últimos 6 meses (progreso mensual real).
- Presupuesto **base cero (ZBB)**: un presupuesto existe porque se asignó; sin asignaciones el mes está vacío (estado vacío con CTA «Asignar presupuesto»).
- Alta/edición en `USlideover`/`UModal`: categoría de gasto del fondo, monto límite, mes. Compensar sobregiro → otro slideover que mueve monto a otra categoría (o reduce el límite de otra) validando no negativos.
- Al registrar/editar/borrar una transacción del mes (SPC-008) los presupuestos del fondo se recalculan sin tocar la transacción.
- No hay transacción automática por presupuestos: solo lectura + límites; nada precarga ni bloquea el registro real.

## Criterios de aceptación

- [ ] `estadoPresupuesto` devuelve `alerta` exactamente desde 80% del límite y `sobregiro` desde >100%. (test)
- [ ] `disponiblePorDia` protege días restantes = 0 y límite alcanzado. (test)
- [ ] `compensar` mueve monto A→B y no permite dejar negativo una categoría. (test)
- [ ] Asignar presupuesto a una categoría de gasto del fondo: aparece su card en `/presupuestos` con progreso 0%.
- [ ] Se consume con transacciones del fondo y mes; un gasto que cruza 80% marca la card en Alerta (amber) y antes de 80% en En ritmo.
- [ ] Región de sobregiro: gasto que excede el límite muestra monto por encima en coral y acción «Compensar categoría».
- [ ] Captura 390px y 1280px de `/presupuestos` con estado sobregiro y con alerta.