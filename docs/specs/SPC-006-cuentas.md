# SPC-006 — Cuentas

Estado: propuesta
Depende de: SPC-002, SPC-005

## Problema

El dinero de un fondo vive en cuentas reales: efectivo, banco(s), tarjeta(s), ahorro. Cada cuenta tiene **una moneda fija** y un saldo inicial. Varias tarjetas o cuentas de banco por fondo deben ser posibles.

## Requerimientos

- CRUD de cuentas por fondo: `nombre`, `tipo` (`efectivo`|`banco`|`tarjeta`|`ahorro`), `moneda` fija (`BOB`|`USD`), `saldo_inicial_centavos` (entero), `activa` (ocultar sin romper histórico).
- La moneda NO se puede cambiar si la cuenta ya tiene movimientos (decisión de integridad: no re-etiquetar historia).
- `saldo_inicial_centavos` solo se admite al crear (no se puede editar salvo que no haya movimientos) — si no, se ajusta con transacciones (SPC-008).
- Saldo actual = `saldo_inicial` + Σ ingresos − Σ egresos (calculado con repositorio, no almacenado).
- Vista: tarjetas por cuenta (icono por tipo, saldo tabular por moneda, `Bs`/`US$`) dentro del fondo; badges de tipo (efectivo/banco/tarjeta/ahorro).
- Rutas: `/fondos/:id` (sección cuentas) + crear/editar en `USlideover`/`UModal` (AGENTS).
- Iconos Material Symbols por tipo: efectivo (`payments`), banco (`account_balance`), tarjeta (`credit_card`), ahorro (`savings`).

## Criterios de aceptación

- [ ] Crear cuenta en el fondo activo con moneda BOB; otra cuenta USD en el mismo fondo (test: dos cuentas distintas).
- [ ] Saldo actual correcto: saldo inicial + movimientos (test con 3 transacciones).
- [ ] Intentar cambiar la moneda de una cuenta con movimientos da error; se puede editar nombre/tipo/activa.
- [ ] Ocultar una cuenta (`activa=0`) la quita del listado pero conserva su histórico en reportes.
- [ ] El total del fondo = suma de saldos de sus cuentas activas.
- [ ] Captura 390px y 1280px de la sección cuentas de un fondo con 2 cuentas.