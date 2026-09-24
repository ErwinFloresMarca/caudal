# Deuda técnica y próximos pasos — Caudal v1.0.0

Registro de atajos deliberados (`ponytail:`), pendientes menores del pase visual y features fuera de v1.

## Deuda técnica (con techo conocido)

| # | Dónde | Qué | Por qué / cuándo arreglar |
|---|---|---|---|
| 1 | `deploy.sh` (VPS) | Las migraciones corren `pnpm db:migrate` desde un **checkout del repo** en el VPS (el bundle de Nitro no incluye el migrator de Drizzle). | Mover migraciones + runner al artefacto del release cuando el VPS deje de tener el repo. |
| 2 | Movimientos (mockup 03) | Faltan las 4 **tarjetas KPI** del encabezado, el **panel lateral** de gastos por categoría y la columna de **saldo running**. | Añadir cuando se quiera más contexto en la lista. |
| 3 | Presupuestos (SPC-024) | **Widget 50/30/20** no implementado. | Requiere clasificar cada categoría en necesidad/deseo/ahorro (campo nuevo). |
| 4 | Metas (SPC-013) | El aporte es **solo registro** (no descuenta de una cuenta). | v1 deliberado; ampliar si se pide "aportar y descontar". |
| 5 | Reportes / Ajustes | **Exportar CSV** (reportes) y **exportar datos** (ajustes) no implementados. | Baratos de añadir si se piden. |
| 6 | Ajustes | **Cerrar todas las sesiones** no implementado (cookie firmada sin store servidor). | Requiere store de sesiones o versión de token. |
| 7 | Google OAuth | El round-trip real requiere `NUXT_OAUTH_GOOGLE_ID/SECRET`. | Configurar en `.env` (dev y prod) para cerrar el login con Google. |
| 8 | Transferencias/aportes | `resolverMontos` asume monedas BOB/USD (dos monedas). | Ampliar si se agrega una tercera moneda. |

## Notas de simplificación (deliberadas, sin acción)

- `server/utils/ajustes.ts` — la escritura de la tasa (auto-sugerencia) no bloquea el registro del movimiento si falla.
- `shared/money.ts` — soporta exactamente BOB y USD (multimoneda acotada por diseño).

## Próximas features (Fase 2, fuera de v1)

- Importar CSV / estados de cuenta.
- Sincronización bancaria (agregadores).
- Multi-divisa avanzada / valuación real.

## Estado del pase visual

Iconos PWA y tokens **congelados** en `DESIGN.md` v1 (decisión 0007). Capturas en `.screenshots/` (regenerables con `pnpm screenshots`).
