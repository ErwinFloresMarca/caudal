# SPC-005 — Fondos

Estado: verificada
Depende de: SPC-002

## Problema

El usuario maneja dinero por separado: lo personal y cada emprendimiento (impresión 3D, chocolates, velas…). Necesita una entidad "fondo" — con su moneda base, color e icono — que agrupe cuentas y categorías, y poder elegir en qué fondo está pensando en cada momento.

## Requerimientos

- CRUD de fondos: `tipo` = `personal` | `negocio`, `nombre`, `moneda_base` (`BOB`|`USD`), `color`, `icono` (Material Symbols), `activo`.
- `activo=0` no elimina el fondo: oculta del listado principal pero conserva el histórico (SPC-002).
- **Uno por defecto**: al primer login el sistema sugiere crear "Personal" (tipo personal) — predefinido opcional, editable.
- Selector de **fondo activo**: se guarda en la sesión del usuario (SPC-004) y se usa como filtro por defecto en cuentas/transacciones/reportes.
- Vista lista: tarjetas con nombre, tipo, moneda base, y saldo total del fondo (suma de sus cuentas; se calcula en SPC-006/008 — aquí semilla vacía).
- Vista detalle: el fondo y sus cuentas; se completa con SPC-006/014.
- Rutas: `/fondos`, y `/fondos/nuevo`, `/fondos/:id` (editar).

## Criterios de aceptación

- [x] Crear, editar y ocultar fondos con CRUD completo (repositorio `server/utils/fondos.ts` + API incl. tests vitest `tests/fondos.test.ts` y E2E).
- [x] Solo el dueño ve/edita sus fondos (test de aislamiento con dos usuarios en repo y en E2E).
- [x] Al registrar sin fondos, la app sugiere crear "Personal" (`GET /api/fondos` devuelve `sugerir_personal: true`; la pantalla que lo muestra llega con SPC-004).
- [x] El fondo activo persiste entre recargas de la sesión del usuario (`fondo_activo_id` en la sesión vía `GET/POST /api/fondos/activo`; no se crea sesión para peticiones por API key).
- [x] Una cuenta pertenece a un solo fondo (FK `cuentas.fondo_id` en SPC-002); su saldo se agrega al total del fondo desde SPC-006/008.