# SPC-017 — Ajustes

Estado: propuesta
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

- [ ] Cambiar contraseña exige la actual y, al cambiar, la sesión sigue válida. (o invalida las otras si se decide)
- [ ] La tasa paralelo guardada aparece auto-sugerida al registrar una transacción USD (SPC-008). (test/integración)
- [ ] Crear API key la muestra una única vez; al recargar ya no es visible.
- [ ] Revocar una API key la invalida de inmediato (prueba con Bearer rechazado). (test)
- [ ] Cambiar la moneda base por defecto cambia la base de los reportes nuevos.
- [ ] Capturas 390px/1280px de las secciones Perfil y API keys.