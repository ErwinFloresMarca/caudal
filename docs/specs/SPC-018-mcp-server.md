# SPC-018 — MCP server

Estado: verificada
Depende de: SPC-003, SPC-008, SPC-015

## Problema

El asistente personal (app Nuxt aparte, cliente MCP) debe poder consultar y registrar dinero por voz sin tocar la base por su cuenta. Eso exige que Caudal exponga un **servidor MCP** autenticado por usuario, con herramientas acotadas y seguras.

## Requerimientos

- Endpoint MCP en Nitro con transporte **Streamable HTTP** (spec MCP vigente), autenticado con `Authorization: Bearer caudal_...` (SPC-003). Sin key → 401.
- Las tools operan SOLO sobre el `user_id` de la API key; nunca reciben `user_id` del cliente.
- Set de tools v1 (nombres estables, en inglés snake_case):
  - `list_funds` → fondos del usuario.
  - `list_accounts(fund_id?)` → cuentas + `saldo_actual_centavos` + moneda.
  - `get_balances(fund_id?)` → saldo por cuenta y consolidado a moneda base (con tasa histórica, 0002).
  - `list_categories(fund_id, tipo?)` → categorías del fondo.
  - `list_transactions(fund_id?, from?, to?, categoria?, tipo?, limite?)` → movimientos.
  - `create_transaction(cuenta_id, categoria_id, tipo, monto, fecha?, nota?, tasa_ref?)` → crea gasto/ingreso. `monto` en formato humano (`"12,50"`), parseado con `shared/money.ts`.
  - `create_transfer(cuenta_origen_id, cuenta_destino_id, monto, fecha?, nota?, tasa_ref?)` → transferencia intra-fondo (SPC-009).
  - `get_month_summary(fund_id?, mes?)` → ingresos, egresos, neto del mes (SPC-015).
  - `list_pending(fund_id?)` → recurrentes por confirmar + próximas cuotas (SPC-011/012).
- Escritura segura: `create_*` valida pertenencia de cuenta/categoría al usuario y al mismo fondo; devuelve el objeto creado.
- Errores claros y en JSON (ej. `{"error":"cuenta no encontrada"}`), sin filtrar datos de otros usuarios.
- Tool de solo lectura por defecto para consultas; confirmación explícita del asistente antes de `create_*` (responsabilidad del cliente, se documenta).
- Sin CORS abierto: mismo mecanismo de auth que la API.
- Documentar en `README`/spec cómo conectar el asistente (URL + key).

## Criterios de aceptación

- [x] Sin Bearer o con key inválida el endpoint MCP responde 401. (test/curl)
- [x] `get_balances` devuelve el consolidado calculado con tasas históricas, no con la tasa actual. (test)
- [x] `create_transaction` con `"12,50"` en una cuenta BOB crea 1250 centavos y afecta el saldo. (test)
- [x] `create_transaction` con `cuenta_id` de otro usuario responde error y NO crea nada. (test)
- [x] Las tools aparecen correctamente en una sesión MCP de prueba (initialize + tools/list). (curl)
- [x] Un `create_*` exitoso referencia un movimiento visible en `/movimientos` con `fuente='asistente'`. (test)

## Implementación (decisiones)

- **Transporte Streamable HTTP stateless sin SDK** (decisión `0008`): `POST /api/mcp` con JSON-RPC 2.0 (`initialize`, `tools/list`, `tools/call`, notificaciones → 202); `GET /api/mcp` → 405. Respuesta `application/json` (sin SSE).
- **Auth**: `authUserId(event)` (Bearer `caudal_...` o sesión); sin key → 401. Las tools operan solo sobre el `user_id` de la key.
- **Tools** (`server/utils/mcp.ts`): las 9 del spec, reusando los repositorios (`listarFondos`, `listarCuentas`, `listarCategorias`, `listarTransacciones`, `crearTransaccion`, `crearTransferencia`, `listarPendientes`, `proximasCuotas`, `ultimaTasa`, `resumenPeriodo`). `monto` en formato humano → `parseAmount`.
- **Fondo**: `fund_id` opcional; por defecto el primero del usuario. En `create_*` el fondo se deriva de la cuenta (validación de pertenencia).
- **Errores de tool**: `result` con `isError:true` y `{"error":"..."}`.
- **`fuente='asistente'`** en las transacciones creadas por MCP.

Archivos: `server/utils/mcp.ts`, `server/api/mcp.post.ts`, `server/api/mcp.get.ts`, `tests/mcp.test.ts`, `docs/decisions/0008-mcp-transporte.md`.

Verificado con curl (build de producción): `401` sin Bearer; `initialize` → `protocolVersion/capabilities/serverInfo`; `tools/list` → las 9 tools; `tools/call` `list_funds` → content JSON; tool inexistente → `isError` con error JSON.