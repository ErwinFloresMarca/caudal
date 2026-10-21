# Caudal — Progreso

Registro histórico de lo entregado. Reparto de fuentes:

- **Linear** — solo trabajo **abierto** (backlog / en curso). Las issues cerradas se borran de Linear.
- **Este archivo** — qué se entregó, en qué versión y con qué commits.
- **`docs/specs/`** — el detalle de cada feature (criterios, alcance, estado).
- **`docs/decisions/`** — el porqué de cada decisión marcada.
- **`docs/DEUDA-TECNICA.md`** — lo pendiente y los atajos deliberados.

Los ids `SEL-xxx` que aparecen en los specs son **históricos**: este archivo es el mapa que los mantiene legibles.

## Specs entregados

Orden de implementación (el del índice de `docs/specs/README.md`), no numérico.

| Spec | Qué | Issue | Estado | Versión | Commit | Nota |
|---|---|---|---|---|---|---|
| SPC-001 | Bootstrap de la app Nuxt 4 | SEL-77 | verificada | v1.0.0 | `7b83b66` | Decisión 0005 (Nuxt UI v4) |
| SPC-002 | Modelo de datos y acceso a BD | SEL-78 | verificada | v1.0.0 | `8a897ef` | Decisiones 0001 y 0003 (Postgres + Drizzle) |
| SPC-003 | Auth multiusuario + API keys para MCP | SEL-79 | verificada | v1.0.0 | `9791bbc` | scrypt para la contraseña; API key hasheada con sha256 |
| SPC-004 | Shell, layout, navegación y UI base | SEL-80 | verificada | v1.0.0 | `3acafc8` | Sidebar en escritorio + barra inferior en móvil |
| SPC-005 | Fondos | SEL-81 | verificada | v1.0.0 | `73bfcb7` | El fondo activo vive en la sesión |
| SPC-006 | Cuentas | SEL-82 | verificada | v1.0.0 | `838cb3c` | Moneda fija por cuenta; saldo vivo calculado |
| SPC-007 | Categorías por fondo | SEL-83 | verificada | v1.0.0 | `e064359` | Presets, ocultado y borrado con reglas |
| SPC-008 | Transacciones (gastos e ingresos) | SEL-84 | verificada | v1.0.0 | `e535d6c` | Moneda heredada de la cuenta; `tasa_ref` en USD (decisión 0002) |
| SPC-009 | Transferencias entre cuentas | SEL-85 | verificada | v1.0.0 | `629e8f4` | Solo entre cuentas del mismo fondo; no afecta resultado |
| SPC-010 | Aportes y retiros entre fondos | SEL-86 | verificada | v1.0.0 | `340e7f1` | Dos transacciones ligadas por `grupo_id` |
| SPC-011 | Movimientos recurrentes | SEL-87 | verificada | v1.0.0 | `50dc6d1` | Cadencia pura en `shared/`; pendientes por confirmar |
| SPC-012 | Deudas y MSI | SEL-88 | verificada | v1.0.0 | `125e007` | Cuotas exactas; el pago genera transacción y recalcula las no pagadas |
| SPC-013 | Metas de ahorro | SEL-89 | verificada | v1.0.0 | `b325063` | El aporte es **solo registro** (deuda #4) |
| SPC-014 | Dashboard | SEL-90 | verificada | v1.0.0 | `0738c2d` | Agregación en servidor, por moneda |
| SPC-015 | Reportes y gráficas | SEL-91 | verificada | v1.0.0 | `ad71b11` | Decisión 0006: SVG nativo, sin chart.js |
| SPC-016 | Búsqueda y filtros | SEL-92 | verificada | v1.0.0 | `6ee3a5f` | Cursor + índice por categoría |
| SPC-017 | Ajustes | SEL-93 | verificada | v1.0.0 | `4e17c06` | La tasa auto-sugerida no bloquea el registro del movimiento |
| SPC-018 | MCP server | SEL-94 | verificada | v1.1.4 | `f40af84` | Decisión 0008 (sin SDK); 9 tools en v0.1.5 → 54 en v1.1.0 |
| SPC-019 | PWA | SEL-95 | verificada | v0.1.3 | `e76e775` | NetworkFirst; no secuestra navegaciones |
| SPC-020 | Deploy en VPS + nginx | SEL-96 | verificada | v1.0.0 | `bf720ab` | pm2 `caudal` en `127.0.0.1:3071`; deuda #1 (migraciones desde checkout) |
| SPC-021 | Pase visual por wireframes | SEL-97 | verificada | v0.1.4 | `563ac11` | Decisiones 0004 (wireframes) y 0007 (identidad v1) |
| SPC-022 | Release y cierre de v1 | SEL-98 | verificada | v1.0.0 | `34b126a` | `scripts/release.sh` + workflow de build/release |
| SPC-023 | Login con Google (OAuth) | SEL-99 | verificada | v1.0.0 | `711670c` | Vincula cuentas por email; no persiste tokens; activo en prod |
| SPC-024 | Presupuestos por categoría | SEL-100 | verificada | v1.0.0 | `6ca75d0` | Widget 50/30/20 pendiente (deuda #3) |
| SPC-025 | `get_balances`: base configurable | SEL-112 | verificada | v1.1.1 | `0cd7f2e` | Consolida con la tasa de Ajustes si no hay tasa histórica |
| SPC-026 | Favicon con la marca | SEL-115 | verificada | v1.1.2 | `fd2c887` | Marca = gota de agua (decisión 0007) |
| SPC-027 | Avatar menu del usuario | SEL-116 | verificada | v1.1.2 | `632f763` | Toggle de tema y cierre de sesión |
| SPC-028 | Modo oscuro | SEL-117 | verificada | v1.1.3 | `14cab12` | Tokens claro/oscuro en `app/assets/css/main.css` |
| SPC-029 | Migraciones de BD en el deploy de CI | SEL-265 | verificada | v1.1.4 | `984cbc3` | El job `deploy` del workflow invoca `deploy.sh` |
| SPC-030 | Fondo predeterminado y selección | SEL-269 | verificada | v1.2.0 | `51a073d` | Fondo activo por defecto en sesión |
| SPC-031 | Contrato de `fund_id` y tests de BD en CI | SEL-268 | verificada | v1.2.0 | `4830751` | Declara `fund_id` en 3 tools; los tests de BD corren en CI |
| SPC-032 | Versionar `deploy.sh` | SEL-270 | verificada | v1.3.0 | `1e2a076` | Pasa al repo (`scripts/deploy.sh`); se elimina la copia de la VPS |
| SPC-033 | Validar los argumentos del MCP | SEL-271 | verificada | v1.3.0 | `cfd645e` | Argumento no declarado → `-32602` |
| SPC-034 | Fondo por defecto en Ajustes | SEL-272 | verificada | v1.3.0 | `045bdec` | Desmarcar borra la fila: `settings.value` es jsonb NOT NULL |
| SPC-035 | Pago de cuota con dos patas | SEL-273 | verificada | v1.4.0 | `e69f219` | Pata 1 en el fondo de la deuda, pata 2 en la cuenta elegida |
| SPC-036 | Cerrar huecos de validación del MCP | SEL-274 | verificada | v1.4.0 | `c723863` | Cierra los huecos que dejó SPC-033 |
| SPC-037 | Convertir la primera pata si la cuenta está en otra moneda | SEL-275 | verificada | v1.4.1 | `b1a2742` | Sin `tasa_ref` y monedas distintas → 400 |
| SPC-038 | El tipo de grupo: los pagos de cuota no son aportes | SEL-277 | verificada | v1.4.2 | `88870a9` | Columna `grupo_tipo` (decisión 0009); migración 0004 |
| SPC-039 | Exportar movimientos a CSV | SEL-279 | verificada | v1.5.0 | `6b1f2cf` | RFC 4180 + BOM; neutraliza fórmulas; botón en Reportes |
| SPC-040 | Barras diarias por categoría | SEL-280 | verificada | v1.5.0 | `6d42d87` | Ingresos arriba / egresos abajo; top 6 + "Otras categorías" |
| SPC-041 | Migraciones en el artefacto (deploy autocontenido) | SEL-281 | verificada | v1.5.1 | `3a9998e` | Runner `drizzle-orm` en `.output/server`; migra antes del swap y hace rollback si el health falla |
| SPC-042 | Movimientos: KPIs, egresos por categoría y CSV | SEL-282 | verificada | v1.6.0 | `47d0597` | KPIs con los filtros de la pantalla; panel top 6 + "Otras categorías" |
| SPC-043 | Saldo continuo en Movimientos | SEL-283 | verificada | v1.6.0 | `c0fceda` | Derivado, nunca persistido; alcance por fondo/cuenta |
| SPC-044 | Aportes a metas que mueven dinero | SEL-284 | verificada | v1.7.0 | `3398a01` | Transacción espejo con categoría "Ahorro"; una sola puerta de entrada (409 desde Movimientos) |

## Releases

- **v0.1.1** — documentación de arranque (AGENTS, DESIGN, specs SPC-001…022), proyecto Linear y mapeo spec↔issue. Sin features.
- **v0.1.2** — PWA (SPC-019) y deploy en VPS (SPC-020).
- **v0.1.3** — PWA offline a prueba de navegaciones; arranque del pase visual (SPC-021 T0/T1).
- **v0.1.4** — pase visual completo (SPC-021 T2…T13), DESIGN v1 y decisión 0007.
- **v0.1.5** — MCP server con 9 tools (SPC-018).
- **v1.0.0** — cierre de v1: specs SPC-001…024, roadmap, deuda técnica y e2e en producción.
- **v1.0.1** — `/cuentas` real (cuentas del fondo activo), se retira el placeholder.
- **v1.1.0** — MCP v2: cobertura total, 54 tools (SPC-018).
- **v1.1.1** — `get_balances` consolida a la moneda base del fondo (SPC-025).
- **v1.1.2** — favicon e iconos de marca (SPC-026) y avatar menu (SPC-027).
- **v1.1.3** — modo oscuro (SPC-028).
- **v1.1.4** — migraciones de BD en el deploy de CI (SPC-029) y `fund_id` en 3 tools (SPC-031).
- **v1.2.0** — fondo predeterminado y selección de fondo (SPC-030).
- **v1.3.0** — `deploy.sh` versionado (SPC-032), validación de argumentos del MCP (SPC-033) y fondo por defecto en Ajustes (SPC-034).
- **v1.4.0** — pago de cuota con dos patas (SPC-035) y huecos de validación del MCP cerrados (SPC-036).
- **v1.4.1** — conversión de la primera pata del pago de cuota (SPC-037).
- **v1.4.2** — tipo de grupo: los pagos de cuota dejan de ser aportes (SPC-038).
- **v1.5.0** — exportar movimientos a CSV (SPC-039) y barras diarias por categoría en Reportes (SPC-040).
- **v1.5.1** — el deploy deja de depender de un checkout en la VPS: migraciones y `deploy.sh` viajan en el artefacto (SPC-041).
- **v1.6.0** — Movimientos con KPIs, egresos por categoría, CSV con sus filtros (SPC-042) y saldo continuo (SPC-043).
- **v1.7.0** — los aportes a metas descuentan de la cuenta elegida (SPC-044) y arreglo del desborde de Movimientos en móvil.

## Pendientes

- **Deuda técnica y atajos deliberados**: `docs/DEUDA-TECNICA.md` (migraciones desde checkout en el VPS, KPIs de movimientos, widget 50/30/20, aportes a metas solo registro, exportar todos los datos desde Ajustes, cerrar todas las sesiones, soporte solo BOB/USD).
- **Fase 2 (fuera de v1)**: importar CSV / estados de cuenta, sincronización bancaria y multi-divisa avanzada.
- **Deuda ponytail anotada**: unificar la conversión de moneda duplicada entre `server/utils/deudas.ts` y `server/utils/aportes.ts`.
