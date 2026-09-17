# SPC-022 — Release y cierre de v1

Estado: propuesta
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

- [ ] `pnpm release minor` publica `v1.0.0` y el pipeline termina en verde.
- [ ] Deploy en producción sirve la versión publicada.
- [ ] Flujo E2E completo (usuario nuevo → movimiento → reporte → MCP) funciona en producción.
- [ ] Todos los specs indican su estado real; los verificados, `verificada`.
- [ ] Bitácora de decisiones y deuda técnica registrada.
- [ ] README/ROADMAP reflejan la v1 entregada.