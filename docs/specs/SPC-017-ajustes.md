# SPC-017 — Ajustes

Estado: verificada
Depende de: SPC-003, SPC-007

## Problema

El usuario necesita un lugar para su perfil, la tasa del dólar, sus categorías, y — clave para el asistente — **gestionar sus API keys**. Sin esta pantalla, el MCP no es usable con seguridad.

## Requerimientos

- `/ajustes` con secciones:
  - **Perfil**: nombre, email (solo lectura/editable con validación), timezone.
  - **Seguridad**: cambiar contraseña (pide la actual).
  - **Moneda y tasa**: moneda base de consolidación por defecto (BOB|USD) y **tasa paralelo actual** (se usa para auto-sugerir en transacciones USD, SPC-008). Historial de la última tasa usada.
  - **Categorías**: gestionar las del fondo activo (crear, editar, ocultar) — reutiliza SPC-007.
  - **Fondos**: acceso a su gestión (enlaza a SPC-005) sin duplicar.
  - **API keys (MCP)**: listar, crear (muestra la key **una sola vez**, luego solo el nombre y `last_used_at`), revocar. Instrucciones de conexión al asistente.
  - **Sesión**: cerrar sesión (y cerrar todas las sesiones, si es barato).
  - **Datos**: borrar datos/ cuenta (con confirmación explícita) o exportar.
- Formularios en `USlideover`/`UModal`; validaciones del servidor con mensajes en español.
- Nada de secretos en texto plano persistidos: la API key se hashea.

## Criterios de aceptación

- [x] Cambiar contraseña exige la actual y, al cambiar, la sesión sigue válida (la cookie no se rota). (test)
- [x] La tasa paralelo guardada aparece auto-sugerida al registrar una transacción USD (SPC-008). (test/integración)
- [~] Crear API key la muestra una única vez; al recargar ya no es visible. — el backend ya devuelve la key solo al crear (SPC-003); la recarga es UI (SPC-021).
- [x] Revocar una API key la invalida de inmediato (prueba con Bearer rechazado). (test)
- [x] Cambiar la moneda base por defecto cambia la base de los reportes nuevos.
- [ ] Capturas 390px/1280px de las secciones Perfil y API keys. — pase visual (SPC-021).

## Implementación (decisiones)

- **Settings por usuario** (`server/utils/settings.ts`): get/set key-value en `settings` (jsonb). Claves: `moneda_base` y `tasa`.
- **`server/utils/ajustes.ts`**: `getPerfil`/`actualizarPerfil` (nombre, email con validación y unicidad, timezone), `cambiarPassword` (verifica la actual con scrypt; **no rota la sesión**, por eso sigue válida), `getMonedaBase`/`setMonedaBase`, `getTasa`/`setTasa`, `borrarCuenta(confirmacion='BORRAR')`.
- **Auto-sugerencia de tasa**: `crearTransaccion` guarda en `settings` la última tasa USD usada (historial de 20). La escritura no bloquea el registro si falla. Se expone en `GET /api/ajustes/tasa`.
- **Moneda base en reportes**: `generarReporte` usa `moneda_base` del usuario si no se pasa `base`. Para base **USD** los movimientos BOB (que no guardan tasa) se convierten con la **tasa actual** del usuario como `tasaFallback`; se añadió ese parámetro a la consolidación (`shared/resumen.ts`, `shared/reportes.ts`).
- **Borrar cuenta**: transacción que borra todas las tablas del usuario (cuotas/aportes_meta primero, por las FK) y el usuario. Confirmación explícita (`BORRAR`).
- **Cerrar todas las sesiones**: no implementado — la sesión es una cookie firmada sin store servidor, invalidar las otras no es barato (nuxt-auth-utils). Logout ya existe (SPC-003).
- **Exportar datos**: diferido (fuera de los criterios de aceptación).
- **Categorías y Fondos** reutilizan SPC-007/SPC-005 (enlaces, sin duplicar).

Rutas: `GET /api/ajustes`, `PATCH /api/ajustes/perfil`, `POST /api/ajustes/password`, `PATCH /api/ajustes/preferencias`, `GET /api/ajustes/tasa`, `POST /api/ajustes/borrar-cuenta` (más `/api/api-keys` de SPC-003).

Archivos: `server/utils/settings.ts`, `server/utils/ajustes.ts`, `server/api/ajustes*.ts`, `server/utils/transacciones.ts` (registra tasa), `server/utils/reportes.ts` + `shared/resumen.ts` + `shared/reportes.ts` (tasaFallback), `shared/money.ts`, `tests/ajustes.test.ts`.