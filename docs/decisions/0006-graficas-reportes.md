# Decisión 0006 — Gráficas de reportes: SVG/CSS nativo, sin librería

Estado: aprobada. Fecha: 2026-09-21.

## Contexto

SPC-015 pide cuatro visualizaciones: barras agrupadas (ingresos vs egresos por mes), donut/barras por categoría, línea de evolución del saldo y una nota de «equivalente histórico». El spec obliga a **decidir y documentar** la lib: "si Nuxt UI/svg alcanzan, no añadir chart.js".

## Decisión

- **Sin librería de gráficas.** Se dibujan con **SVG inline + utilidades CSS de Tailwind/Nuxt UI** (los tokens del DESIGN.md).
  - Barras: `div`/`flex` con alturas proporcionales.
  - Donut: `circle` SVG con `stroke-dasharray`/`stroke-dashoffset`.
  - Línea: `polyline` SVG con `viewBox` normalizado.
- **Los datos ya vienen agregados del servidor** (`server/api/reportes.get.ts`). El cliente solo pinta y recorta el top N de categorías.
- **Exportar CSV**: no en v1 (el spec lo marca opcional). Se difiere al pase visual (SPC-021) junto con la pantalla `/reportes`.

## Impacto

- 0 dependencias nuevas; bundle menor.
- Control total de colores/tokens y responsive.
- Las gráficas se implementan en el pase visual (SPC-021); el backend de agregación queda listo y testeado.

## Alternativas descartadas

- **Chart.js / ApexCharts / ECharts**: peso, theming a mano y comodidad que no se paga con 4 gráficas simples.
- **CSS puro para el donut**: `conic-gradient` no permite separación ni hover por segmento con la misma facilidad que `stroke-dasharray`.
