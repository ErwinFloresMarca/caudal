# SPC-014 — Dashboard

Estado: propuesta
Depende de: SPC-008, SPC-012, SPC-013

## Problema

Al abrir Caudal el usuario quiere responder de un vistazo: ¿cuánto tengo?, ¿cómo va el mes?, ¿qué me toca pagar?, ¿cómo van mis metas? Sin tener que navegar a cinco pantallas.

## Requerimientos

- Pantalla de inicio `/` (post-login) con el **fondo activo** (selector del shell, SPC-004):
  - **Saldo total** del fondo (grande, `tabular-nums`, por moneda si hay cuentas BOB y USD: no sumar peras con manzanas sin tasa).
  - **Ingresos vs egresos del mes en curso** + neto (con signo/color `money-plus`/`money-minus`).
  - **Saldo por cuenta** (chips o lista compacta, con icono por tipo).
  - **Gastos por categoría del mes** (top categorías, mini barras).
  - **Pendientes**: movimientos recurrentes por confirmar (SPC-011) y próximas cuotas de deuda (SPC-012).
  - **Metas de ahorro** activas con progreso (SPC-013).
- En multimoneda: se muestra el saldo por moneda; el total consolidado a BOB aparece explícito con la leyenda "convertido con tasa histórica" (0002).
- Todo con datos reales (no mock). Si no hay datos, estados vacíos con CTA ("registra tu primer movimiento").
- Rendimiento: el dashboard se arma con varias consultas agregadas en el servidor (`server/api/resumen.get.ts`), no N+1 en el cliente.
- Responsive: móvil apilado (saldo → mes → pendientes), escritorio en grid de cards.

## Criterios de aceptación

- [ ] Con 2 cuentas (BOB/USD) el dashboard muestra saldo por moneda y el consolidado etiquetado como histórico. (test de agregación + captura)
- [ ] El neto del mes = Σ ingresos − Σ egresos del mes (excluye transferencias/aportes internos según SPC-015). (test)
- [ ] Aparecen solo los pendientes reales (recurrentes vencidos y cuotas por vencer), no todos.
- [ ] Estados vacíos correctos sin datos.
- [ ] Capturas 390px y 1280px del dashboard con datos de prueba.