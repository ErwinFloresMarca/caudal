# SPC-015 — Reportes y gráficas

Estado: propuesta
Depende de: SPC-008, SPC-009, SPC-010, SPC-012

## Problema

El usuario necesita entender tendencias: en qué se va el dinero, cómo evoluciona el saldo, cuánto gastó por categoría, y todo eso **sin que la volatilidad del dólar distorsione la historia**. Es el módulo que justifica la tasa histórica (decisión 0002).

## Requerimientos

- `/reportes` con filtros: rango de fechas (mes actual, mes pasado, personalizado), fondo(s), moneda base de consolidación (`BOB` por defecto).
- Reportes mínimos:
  - **Flujo del período**: ingresos, egresos y neto (con desglose por moneda y consolidado).
  - **Gastos por categoría**: donut o barras horizontales, top N, con leyenda/valores.
  - **Ingresos vs egresos por mes**: barras agrupadas (últimos 12 meses).
  - **Evolución del saldo** (línea) por cuenta o total del fondo.
- **Consolidación multimoneda (0002)**: cada transacción se convierte a la base con SU `tasa_ref`; no se usa una tasa única del período. El reporte muestra la nota "equivalente histórico".
- **Transferencias (SPC-009)**: excluidas de resultado. **Aportes/retiros entre fondos (SPC-010)**: cuentan como resultado del fondo individual; en reporte multi-fondo se pueden netear como "movimiento interno".
- Todas las gráficas nativas o con una única lib decidida en implementación (ponytail: si Nuxt UI/svg alcanzan, no añadir chart.js; decidir y documentar).
- Exportación CSV del período (opcional v1; si es barato).
- Persistencia del último filtro en la URL (para compartir/recargar).
- Consultas agregadas en el servidor; el cliente solo pinta.

## Criterios de aceptación

- [ ] Un gasto USD de US$ 10 con `tasa_ref=6,96` suma Bs 69,60 al consolidado aunque hoy el paralelo sea otro. (test — la clave de la decisión 0002)
- [ ] Un gasto BOB de Bs 69,60 suma Bs 69,60 sin requerir tasa. (test)
- [ ] Las transferencias no alteran ingresos/egresos/ni neto. (test)
- [ ] Un aporte entre fondos aparece como gasto en el origen y ingreso en el destino (y no como transferencia). (test)
- [ ] El reporte por categoría suma exactamente el total de gastos del período (cuadre).
- [ ] Capturas 390px/1280px de `/reportes` con datos de prueba, mostrando la nota de equivalente histórico.