# 0005 — Nuxt UI v4 (no v3)

- Decisión: el bootstrap usa **Nuxt UI v4.11** en lugar de Nuxt UI v3.
- Motivo: `@nuxt/ui` en npm resuelve hoy a v4 (rama estable, 125+ componentes open-source, unifica Nuxt UI/Pro). El MCP `nuxt-ui` y la documentación canónica (`ui.nuxt.com`) ya sirven v4. Instalar v3 sería remar contra la corriente actual.
- Impacto: AGENTS.md, SPC-001 y README actualizados a "Nuxt UI v4" en el mismo commit. API compatible con lo que documenta el MCP.
- Fecha: 2026-09-19 (SPC-001).