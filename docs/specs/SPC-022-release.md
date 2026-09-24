# SPC-022 — Release y cierre de v1

Estado: verificada
Depende de: todos los specs anteriores

## Problema

Cerrar la v1 de Caudal: empaquetar, publicar y entregar una versión usada de verdad, con los datos en orden y las decisiones registradas. Es el punto en que los specs pasan de `implementada` a `verificada`.

## Requerimientos

- Pipeline de release reproducible (`scripts/release.sh` + `.github/workflows/build-release.yml`), según SPC-020.
- Versionado semántico; `CHANGELOG` resumido por release (borrador con la lista de features).
- Revisión de cierre: recorrer los 22 specs y marcar `verificada` los cumplidos; los no cumplidos quedan `implementada`/`propuesta` con nota.
- `AGENTS.md`, `README.md`, `docs/ROADMAP.md` y `DESIGN.md` actualizados a la realidad.
- `docs/decisions/` con todas las decisiones importantes del proyecto (modelo, multimoneda, transporte MCP, librería de gráficas, etc.).
- Verificación end-to-end en `https://caudal.erfm.dev`: registrar usuario nuevo, crear fondo+cuentas, registrar gasto/ingreso, transferencia, aporte, cuota, meta, ver reporte y crear una transacción vía MCP.
- Lista de deuda técnica (`ponytail:` pendientes) y próximas features (presupuestos, importar CSV, sync bancaria).

## Criterios de aceptación

- [x] Pipeline de release reproducible (`scripts/release.sh` + `.github/workflows/build-release.yml`). Publicado `v0.1.1`…`v0.1.5`.
- [x] `pnpm release major` publica `v1.0.0` y el pipeline termina en verde. (desde `0.1.5`, `major` → `1.0.0`)
- [x] Deploy en producción sirve la versión publicada. (`pm2 caudal` v1.0.0)
- [x] Flujo E2E completo (usuario nuevo → movimiento → reporte → MCP) funciona en producción. (`pnpm e2e` 10/10)
- [x] Todos los specs indican su estado real; los verificados, `verificada`. (23/23)
- [x] Bitácora de decisiones y deuda técnica registrada. (`docs/decisions/0001..0008`, `docs/DEUDA-TECNICA.md`)
- [x] README/ROADMAP reflejan la v1 entregada.

## Cierre

v1.0.0 entregada y desplegada en `https://caudal.erfm.dev`.

- **Specs**: 23/23 en `verificada` (SPC-001…024, sin SPC-021→024 gaps).
- **Verificación E2E** (`scripts/e2e-prod.mjs`, `pnpm e2e`): registro, fondo + cuentas, ingreso/gasto, transferencia, aporte, cuota, meta, reporte y `create_transaction` vía MCP → **10/10** en producción.
- **Deuda técnica y próximos pasos**: `docs/DEUDA-TECNICA.md`.
- **Decisiones**: `docs/decisions/0001…0008` (modelo, multimoneda, Postgres/Drizzle, wireframes, Nuxt UI v4, gráficas SVG, identidad v1, transporte MCP).