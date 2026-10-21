# Deuda técnica y próximos pasos — Caudal

Registro de atajos deliberados (`ponytail:`), pendientes menores del pase visual y features fuera de v1. El estado entregado y en qué versión quedó cada spec: `docs/PROGRESO.md`.

## Deuda técnica (con techo conocido)

**No hay pendientes abiertos.** Todo lo que quedó es simplificación deliberada (abajo) o Fase 2.

<!-- Resueltos: cerrar todas las sesiones (SPC-047, versión de sesión sin store), exportar datos
     (SPC-046), 50/30/20 (SPC-045), aportes a metas (SPC-044), KPIs/saldo de Movimientos
     (SPC-042/043), migraciones en el artefacto (SPC-041), CSV de movimientos (SPC-039),
     Google OAuth (v1.0.0). -->

## Notas de simplificación (deliberadas, sin acción)

- `server/utils/ajustes.ts` — la escritura de la tasa (auto-sugerencia) no bloquea el registro del movimiento si falla.
- `shared/money.ts` — soporta exactamente BOB y USD (multimoneda acotada por diseño).

## Próximas features (Fase 2, fuera de v1)

- Importar CSV / estados de cuenta.
- Sincronización bancaria (agregadores).
- Multi-divisa avanzada / valuación real.

## Estado del pase visual

Iconos PWA y tokens **congelados** en `DESIGN.md` v1 (decisión 0007). Capturas en `.screenshots/` (regenerables con `pnpm screenshots`).
