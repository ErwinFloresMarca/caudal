# SPC-033 — Validar los argumentos del MCP contra su `inputSchema`

Estado: verificada · Issue: SEL-271

Verificado en el run [38983068375](https://github.com/ErwinFloresMarca/caudal/actions/runs/38983068375)
(tag `v1.3.0`): **`Test Files 21 passed (21)` / `Tests 180 passed (180)`** (incluye los tests puros del
validador y el de contrato). Antes, contra el dev server, con una API key real y `POST /api/mcp`:
`list_funds` válido responde normal; `{"fond_id": 2}` → `-32602 "argumento desconocido «fond_id»;
acepta: fund_id"`; `activo: "false"` → `«activo» debe ser boolean`; required faltante → `falta el
argumento obligatorio`; `update_aporte` con `cuenta_origen_id` → `-32602`; ids como string (`"3"`)
siguen funcionando; una tool inexistente mantiene el `isError` de tool.

Verificado en local: `pnpm test` **180/180** (21 archivos, incluye 8 tests puros del validador y el
test de contrato en las dos direcciones), `pnpm lint`, `pnpm typecheck`. Contra el dev server, con una
API key real y `POST /api/mcp`: `list_funds` válido responde normal; `{"fond_id": 2}` →
`-32602 "argumento desconocido «fond_id»; acepta: fund_id"`; `activo: "false"` →
`«activo» debe ser boolean`; required faltante → `falta el argumento obligatorio`; `update_aporte`
con `cuenta_origen_id` → `-32602`; ids como string (`"3"`) siguen funcionando; una tool inexistente
mantiene el `isError` de tool (no cambia).

Depende de: [SPC-018](./SPC-018-mcp-server.md) (MCP server), [SPC-031](./SPC-031-mcp-fund-id-y-tests-en-ci.md) (`fund_id` declarado)

## Problema

`server/api/mcp.post.ts:42-51` pasa los `arguments` crudos a `callTool`: los `inputSchema` de las 54
tools (con `required`, `enum`, `type` y `additionalProperties: false`) son **solo descriptivos**. Un
cliente que se equivoque de nombre de propiedad no recibe error: la tool corre con valores por
defecto y la consecuencia aparece lejos, o nunca.

El caso que ya nos mordió (SPC-031): `create_deuda`, `create_meta` y `upsert_budget` leían
`args.fund_id` sin declararlo, así que un cliente que respetaba el schema no podía elegir el fondo y
el que lo mandaba funcionaba de casualidad. Con validación, ese desajuste se habría visto en el
primer intento.

Una auditoría de las 54 tools confirmó que hoy **ninguna lee un `args.X` fuera de sus `properties`** y
que todos los `required` se leen: activar el rechazo de propiedades extra no rompe nada.

## Requerimientos

- `callTool` **MUST** validar los argumentos contra el `inputSchema` de la tool **antes** de
  ejecutarla. Al hacerlo ahí, los tests que llaman `callTool` también ejercitan la validación.
- La validación **MUST** rechazar propiedades no declaradas (las 54 tools declaran
  `additionalProperties: false`) y **MUST** exigir las `required`.
- La validación **MUST** comprobar `type` y `enum`, con la misma tolerancia que ya tienen los
  handlers: un `integer`/`number` **MUST** aceptarse también como string numérico (`Number()` los
  coerce hoy) y un `string` declarado (`MONTO`) **MUST** aceptar un número. `boolean` **MUST** ser
  booleano de verdad (hoy `Boolean('false')` da `true`: un cliente que manda `"false"` activa algo
  creyendo que lo desactiva).
- Un argumento inválido **MUST** producir un mensaje accionable (nombra la propiedad y los valores
  aceptados) y **MUST** responderse como error JSON-RPC **-32602** (Invalid params), no como un
  resultado de tool con `isError`: es un problema del protocolo, no del dominio.
- `array` **MUST** validar cada elemento con su `items` (`get_report.fund_ids`). `object` **MUST**
  comprobar solo el tipo (`cadencia` no declara sus propiedades internas).
- El validador **MUST** ser lógica pura en `shared/`, importable por tests sin tocar el servidor.
- `update_aporte` **MUST NOT** declarar `cuenta_origen_id`: el dominio **prohíbe** cambiar las
  cuentas de un aporte (`server/utils/aportes.ts:287-292` responde 400) y el propio
  `editarAporte` reescribe el origen con el valor de la BD (`:297`). Declararlo prometía un cambio
  que nunca ocurría: hoy un cliente que lo manda no recibe nada. Con la validación pasa a recibir un
  error explícito, que es la verdad.

## Criterios de aceptación

- Test puro del validador cubriendo: objeto válido, propiedad extra, `required` ausente, tipo
  incorrecto, `enum` inválido, id numérico como string (válido), `boolean` string (inválido), array
  con un elemento inválido, y `object` sin `properties`.
- Todos los tests del MCP que ya existen (llaman `callTool` con argumentos reales) siguen verdes: es
  la prueba de que los schemas describen lo que las tools necesitan.
- Test de contrato: ningún `case` de `callTool` lee un `args.X` que su tool no declare (evita que
  vuelva a pasar lo de SPC-031).
- Una llamada con una propiedad inventada devuelve `-32602` con un mensaje que la nombra.
- `update_aporte` ya no declara `cuenta_origen_id` (el dominio prohíbe cambiar las cuentas de un
  aporte); un cliente que lo mande recibe `-32602` en vez de un no-op silencioso.
- Test de contrato en las **dos** direcciones: ningún `case` lee un `args.X` que su tool no declare,
  y ninguna propiedad declarada queda sin leerse.
- `pnpm test` (171 + nuevos) + `pnpm lint` + `pnpm typecheck` verdes.

## Fuera de alcance

- Unificar la coerción inconsistente que ya existe (`list_transactions.categoria`/`limite` no
  coercen, `update_settings.moneda_base` pasa el valor crudo). Queda anotado, no se toca acá.
- Validar en profundidad `cadencia` (el schema no declara sus propiedades): se puede proponer aparte.
- Añadir tools, cambiar su lógica (salvo `update_aporte`) o adoptar una dependencia de validación
  (`zod`/`ajv`): el validador es propio porque los schemas son un subconjunto chico y conocido.

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `shared/mcp-schema.ts` | Nuevo: validador puro de argumentos contra un `inputSchema` |
| `server/utils/mcp.ts` | `callTool` valida antes de ejecutar; `update_aporte` deja de declarar `cuenta_origen_id` |
| `server/api/mcp.post.ts` | Los errores de argumentos se responden como `-32602` |
| `tests/mcp-schema.test.ts` | Nuevo: tests puros del validador |
| `tests/mcp.test.ts` | Test de contrato (args leídos vs declarados) y caso de `update_aporte` |
| `docs/specs/README.md` | Fila de este spec |
