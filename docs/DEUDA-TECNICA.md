# Deuda técnica y próximos pasos — Caudal

Registro de atajos deliberados (`ponytail:`), pendientes menores del pase visual y features fuera de v1. El estado entregado y en qué versión quedó cada spec: `docs/PROGRESO.md`.

## Deuda técnica (con techo conocido)

| # | Dónde | Qué | Por qué / cuándo arreglar |
|---|---|---|---|
| 1 | Presupuestos (SPC-024) | **Widget 50/30/20** no implementado. | Requiere clasificar cada categoría en necesidad/deseo/ahorro (campo nuevo). |
| 2 | Metas (SPC-013) | El aporte es **solo registro** (no descuenta de una cuenta). | v1 deliberado; ampliar si se pide "aportar y descontar". |
| 3 | Ajustes | **Exportar todos los datos** desde Ajustes no implementado (el CSV de movimientos ya está en Reportes, SPC-039). | Barato de añadir si se pide. |
| 4 | Ajustes | **Cerrar todas las sesiones** no implementado (cookie firmada sin store servidor). | Requiere store de sesiones o versión de token. |
| 5 | Transferencias/aportes | `resolverMontos` asume monedas BOB/USD (dos monedas). | Ampliar si se agrega una tercera moneda. |

<!-- Resuelto: #7 Google OAuth. `NUXT_OAUTH_GOOGLE_ID/SECRET` están configurados en dev y prod;
     `server/routes/auth/google.ts` + `BotonGoogle` en login/registro funcionan (v1.0.0). -->

## Notas de simplificación (deliberadas, sin acción)

- `server/utils/ajustes.ts` — la escritura de la tasa (auto-sugerencia) no bloquea el registro del movimiento si falla.
- `shared/money.ts` — soporta exactamente BOB y USD (multimoneda acotada por diseño).

## Próximas features (Fase 2, fuera de v1)

- Importar CSV / estados de cuenta.
- Sincronización bancaria (agregadores).
- Multi-divisa avanzada / valuación real.

## Estado del pase visual

Iconos PWA y tokens **congelados** en `DESIGN.md` v1 (decisión 0007). Capturas en `.screenshots/` (regenerables con `pnpm screenshots`).
