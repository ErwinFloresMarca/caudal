# SPC-018 — MCP server

Estado: propuesta
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

- [ ] Sin Bearer o con key inválida el endpoint MCP responde 401. (test)
- [ ] `get_balances` devuelve el consolidado calculado con tasas históricas, no con la tasa actual. (test)
- [ ] `create_transaction` con `"12,50"` en una cuenta BOB crea 1250 centavos y afecta el saldo. (test)
- [ ] `create_transaction` con `cuenta_id` de otro usuario responde error y NO crea nada. (test)
- [ ] Las tools aparecen correctamente en una sesión MCP de prueba (initialize + tools/list). (test)
- [ ] Un `create_*` exitoso referencia un movimiento visible en `/movimientos` con `fuente='asistente'`.