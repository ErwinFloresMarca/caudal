# SPC-015 — Reportes y gráficas

Estado: verificada
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

- [x] Un gasto USD de US$ 10 con `tasa_ref=6,96` suma Bs 69,60 al consolidado aunque hoy el paralelo sea otro. (test — la clave de la decisión 0002)
- [x] Un gasto BOB de Bs 69,60 suma Bs 69,60 sin requerir tasa. (test)
- [x] Las transferencias no alteran ingresos/egresos/ni neto. (test)
- [x] Un aporte entre fondos aparece como gasto en el origen y ingreso en el destino (y no como transferencia). (test)
- [x] El reporte por categoría suma exactamente el total de gastos del período (cuadre).
- [ ] Capturas 390px/1280px de `/reportes` con datos de prueba, mostrando la nota de equivalente histórico. — pendiente del pase visual (SPC-021).

## Implementación (decisiones)

- **Agregación en servidor**: `server/api/reportes.get.ts` → `server/utils/reportes.ts#generarReporte(userId, { fondoIds, desde, hasta, base })`. Lógica pura en `shared/reportes.ts` (`mesesAtras`, `serieMensual`, `evolucionSaldo`, `rangoDias`), reusando `resumenPeriodo`/`gastosPorCategoria` de `shared/resumen.ts`.
- **Consolidación histórica (0002)**: cada movimiento se convierte a la base con **su** `tasa_ref`; la nota lo declara. Se extendió `convertToBase` para soportar base **USD** (BOB→USD divide por la tasa), no solo BOB.
- **Filtros por URL**: `?desde=&hasta=&fondos=1,2&base=BOB|USD`. Por defecto, mes en curso y todos los fondos.
- **Multi-fondo**: se suman las transacciones de los fondos elegidos; los aportes/retiros entre fondos se **netean** al incluir ambos (gasto en el origen + ingreso en el destino). Las transferencias no están en `transacciones`, así que quedan fuera por construcción.
- **Cuadre de categorías**: el endpoint devuelve **todas** las categorías (la UI recorta a top N) y expone `total_gastos_centavos`, para que Σ categorías = egresos del período.
- **Evolución del saldo**: parte del saldo inicial de las cuentas + movimientos previos al período y acumula día a día; las transferencias se cancelan en el total del fondo.
- **Gráficas**: SVG/CSS nativo, sin librería — decisión `docs/decisions/0006-graficas-reportes.md`.
- **CSV**: diferido (opcional v1) junto con la pantalla.

Archivos: `shared/reportes.ts`, `server/utils/reportes.ts`, `server/api/reportes.get.ts`, `shared/money.ts` (base USD), `docs/decisions/0006-graficas-reportes.md`, `tests/reportes.test.ts`.