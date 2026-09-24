# Decisión 0008 — Transporte del servidor MCP: Streamable HTTP stateless, sin SDK

Estado: aprobada. Fecha: 2026-09-24.

## Contexto

SPC-018 exige exponer un servidor MCP autenticado por usuario para que el asistente consulte y registre dinero. El spec pide transporte **Streamable HTTP** y deja abierta la implementación.

## Decisión

- **Streamable HTTP sin streaming**: endpoint `POST /api/mcp` que recibe JSON-RPC 2.0 (una o varias mensajes) y responde `application/json` con la respuesta (o `202` para notificaciones). Es válido en el spec de Streamable HTTP (el servidor puede devolver un único JSON en vez de `text/event-stream`).
- **Sin SDK oficial**: no se añade `@modelcontextprotocol/sdk`. Las tools son request/response simples; el subconjunto de protocolo (`initialize`, `tools/list`, `tools/call`, notificaciones) se implementa en `server/api/mcp.post.ts` (~80 líneas).
- **Stateless**: sin `Mcp-Session-Id`. `GET /api/mcp` responde `405`.
- **Auth**: `Authorization: Bearer caudal_...` (SPC-003); sin key o con key inválida → `401`. Las tools operan **solo** sobre el `user_id` de la key.
- **Errores de tool**: se devuelven como `result` con `isError: true` y `{"error": "..."}` (el asistente puede reaccionar), no como error de protocolo.
- **Escritura**: `create_transaction`/`create_transfer` usan los repositorios existentes (validan pertenencia cuenta/categoría/fondo) y marcan `fuente='asistente'`. La confirmación previa es responsabilidad del cliente (se documenta).

## Impacto

- 0 dependencias nuevas; se reusan `fondos`, `cuentas`, `categorias`, `transacciones`, `transferencias`, `recurrentes`, `deudas`, `resumen`.
- Tools v1: `list_funds`, `list_accounts`, `get_balances`, `list_categories`, `list_transactions`, `create_transaction`, `create_transfer`, `get_month_summary`, `list_pending`.

## Alternativas descartadas

- **SDK oficial MCP**: dependencia y superficie de streaming que no se necesita para tools síncronas.
- **SSE (`text/event-stream`)**: innecesario al no haber notificaciones del servidor ni progreso.
