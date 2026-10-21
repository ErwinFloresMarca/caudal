# Especificaciones (SDD) — Caudal

Fuente de verdad de qué significa cada feature. Se escribe el spec ANTES de tocar código.

## Ciclo de vida

1. **`propuesta`** — el spec existe, sin revisar.
2. **`aprobada`** — dos personas (o el agente + el usuario) lo revisaron y aceptan. Se puede implementar.
3. **`implementada`** — el código cumple el spec (según sus criterios).
4. **`verificada`** — pasa los criterios de aceptación en tiempo de desarrollo (test + captura + lint/build). Idealmente verificado por alguien distinto de quien implementó.

El estado se actualiza en el propio archivo. Los cambios de alcance se reflejan también en el issue de Linear (proyecto Caudal, ids `SEL-xxx`).

## Orden de implementación

Los specs tienen dependencias; NO se implementan por orden numérico sino por este orden:

1. SPC-001 bootstrap → 2. SPC-002 BD → 3. SPC-003 auth → 4. SPC-005 fondos → 5. SPC-006 cuentas → 6. SPC-007 categorías → 7. SPC-008 transacciones → 8. SPC-009 transferencias → 9. SPC-010 aportes/retiros → 10. SPC-011 recurrentes → 11. SPC-012 deudas/MSI → 12. SPC-013 metas → 13. SPC-014 dashboard → 14. SPC-015 reportes → 15. SPC-016 búsqueda → 16. SPC-017 ajustes → 17. SPC-004 shell → 18. SPC-023 Google OAuth → 19. SPC-024 presupuestos → 20. SPC-018 MCP → 21. SPC-019 PWA → 22. SPC-021 visual → 23. SPC-020 deploy → 24. SPC-022 release.

Ver `docs/ROADMAP.md`.

## Plantilla

```markdown
# SPC-NNN — Nombre del feature

Estado: propuesta
Depende de: SPC-0XX, SPC-0YY   <!-- opcional -->

## Problema

<!-- Por qué existe este feature. Un párrafo. -->

## Requerimientos

<!-- Qué hace y qué no hace. Bullets cortos, imperativos. Sin decisiones de UI
     que se tomarán en wireframes (a menos que sean críticas). -->

## Criterios de aceptación

- [ ] <!-- Verificables. Una acción observable por vez. -->
- [ ]
```

## Índice de specs

Proyecto en Linear: [Caudal](https://linear.app/self-proyects/project/caudal-52321193bd83). Cada spec tiene su issue (`SEL-NNN`).

| # | Slug | Issue | Estado |
|---|---|---|---|
| SPC-001 | bootstrap-nuxt | SEL-77 | verificada |
| SPC-002 | modelo-datos | SEL-78 | verificada |
| SPC-003 | auth | SEL-79 | verificada |
| SPC-004 | shell | SEL-80 | verificada |
| SPC-005 | fondos | SEL-81 | verificada |
| SPC-006 | cuentas | SEL-82 | verificada |
| SPC-007 | categorias | SEL-83 | verificada |
| SPC-008 | transacciones | SEL-84 | verificada |
| SPC-009 | transferencias | SEL-85 | verificada |
| SPC-010 | aportes-retiros | SEL-86 | verificada |
| SPC-011 | recurrentes | SEL-87 | verificada |
| SPC-012 | deudas-msi | SEL-88 | verificada |
| SPC-013 | metas-ahorro | SEL-89 | verificada |
| SPC-014 | dashboard | SEL-90 | verificada |
| SPC-015 | reportes | SEL-91 | verificada |
| SPC-016 | busqueda-filtros | SEL-92 | verificada |
| SPC-017 | ajustes | SEL-93 | verificada |
| SPC-018 | mcp-server | SEL-94 | verificada |
| SPC-019 | pwa | SEL-95 | verificada |
| SPC-020 | deploy | SEL-96 | verificada |
| SPC-021 | pase-visual | SEL-97 | verificada |
| SPC-022 | release | SEL-98 | verificada |
| SPC-023 | google-oauth | SEL-99 | verificada |
| SPC-024 | presupuestos | SEL-100 | verificada |
| SPC-025 | get-balances-base | SEL-112 | verificada |
| SPC-026 | favicon-marca | SEL-115 | verificada |
| SPC-027 | menu-usuario | SEL-116 | verificada |
| SPC-028 | modo-oscuro | SEL-117 | verificada |
| SPC-029 | migraciones-en-deploy-ci | SEL-265 | verificada |
| SPC-030 | fondo-predeterminado | SEL-269 | verificada |
| SPC-031 | mcp-fund-id-y-tests-en-ci | SEL-268 | verificada |
| SPC-032 | deploy-sh-versionado | SEL-270 | verificada |
| SPC-033 | validar-argumentos-mcp | SEL-271 | verificada |
| SPC-034 | fondo-por-defecto-ajustes | SEL-272 | verificada |
| SPC-035 | pago-cuota-dos-patas | SEL-273 | verificada |
| SPC-036 | huecos-validacion-mcp | SEL-274 | verificada |
| SPC-037 | conversion-primera-pata | SEL-275 | verificada |
| SPC-038 | tipo-de-grupo | SEL-277 | verificada |
| SPC-039 | exportar-movimientos-csv | SEL-279 | verificada |
| SPC-040 | barras-diarias-categoria | SEL-280 | verificada |
| SPC-041 | migraciones-en-artefacto | SEL-281 | verificada |
| SPC-042 | movimientos-kpis-y-csv | SEL-282 | verificada |
| SPC-043 | saldo-continuo | SEL-283 | verificada |
| SPC-044 | aportes-metas-mueven-dinero | SEL-284 | verificada |
| SPC-045 | widget-50-30-20 | SEL-285 | verificada |
| SPC-046 | exportar-todos-los-datos | SEL-286 | implementada |

El histórico de cada spec (versión en la que quedó verificada y sus commits) está en `docs/PROGRESO.md`.