# SPC-031 — Contrato de `fund_id` en el MCP y tests de BD en CI

Estado: implementada · Issue: SEL-268

Depende de: [SPC-018](./SPC-018-mcp-server.md) (MCP server)

## Problema

Tres cosas, todas del mismo origen: el MCP tiene 54 tools y buena parte de su superficie no se
verifica ni se declara bien.

1. **`fund_id` leído pero no declarado.** `create_deuda` (`server/utils/mcp.ts:90`), `create_meta`
   (`:99`) y `upsert_budget` (`:108`) leen `args.fund_id` pero no lo declaran en su `inputSchema`,
   que además tiene `additionalProperties: false` (las 54 tools lo tienen). Un cliente MCP que
   respete el schema publicado **no puede elegir el fondo** en esas tres tools. Hoy no rompe porque
   `server/api/mcp.post.ts:42-51` pasa los `arguments` crudos a `callTool` sin validarlos contra el
   schema: el `inputSchema` es descriptivo (sirve a `tools/list`), no se aplica en `tools/call`.
2. **Tests que dependen del fondo implícito.** `tests/mcp.test.ts` llama `create_deuda` (`:187`),
   `create_meta` (`:191`) y `upsert_budget` (`:198`) sin `fund_id`, confiando en que
   `resolverFondo` (`:117-126`) caiga en `listarFondos(userId)[0]` — que ordena **por nombre**
   (`server/utils/fondos.ts:75`). El test pasa por casualidad: `'Fondo MCP'` es el primero
   alfabéticamente entre los fondos de ese usuario. Con otro nombre que ordene antes, los tres
   call sites escriben en el fondo equivocado o fallan. Además depende de la **colación** de la BD:
   el orden puede diferir entre la base dev y la de CI.
3. **Los tests con BD no corren en CI.** `tests/mcp.test.ts:69` usa `describe.skipIf(!hasDb)` y la
   CI no define `DATABASE_URL`, así que sus 12 tests se saltan. No es solo el MCP: hay **16
   archivos** de tests que dependen de la BD y quedan en skip en CI. Las tools se despliegan sin
   verificación.

## Requerimientos

- `create_deuda`, `create_meta` y `upsert_budget` **MUST** declarar `fund_id` en su `inputSchema`,
  con el mismo tipo y forma que el resto de las tools del dominio (`FUND`, opcional).
- Los tests del MCP **MUST NOT** depender del fondo implícito: donde el fondo importa, **MUST** pasar
  `fund_id` explícito.
- El job `build` de la CI **MUST** correr con un PostgreSQL 16 y aplicar las migraciones
  (`pnpm db:migrate`) antes de `pnpm test`, para que los tests que necesitan BD se ejecuten en vez
  de saltarse.
- Los tests **MUST** sembrar sus propios datos: **MUST NOT** depender del estado previo de la BD.
- Un fallo de test **MUST** dejar el job en rojo.

## Criterios de aceptación

- `pnpm test` en local: verde, sin regresiones respecto de los 166 tests actuales.
- En CI, el step `Tests`: los 12 tests del MCP (y los de los otros archivos con BD) aparecen
  **ejecutados**, no saltados; el log muestra el total de tests corridos.
- `tools/list` devuelve `create_deuda`, `create_meta` y `upsert_budget` con `fund_id` en
  `properties` y sin exigirlo (`required` no lo incluye).
- `pnpm lint` y `pnpm typecheck` verdes.

## Fuera de alcance

- **El fondo por defecto y el fallback de `resolverFondo`**: eso es
  [SPC-030](./SPC-030-fondo-predeterminado.md). Acá los tests dejan de depender de ese default;
  cambiarlo es trabajo de ese spec.
- Validar los `arguments` de `tools/call` contra `inputSchema` (hoy no se valida). Queda anotado
  para otro spec: mientras el schema sea solo descriptivo, declarar `fund_id` no cambia el
  comportamiento, solo el contrato.
- Añadir tools o cambiar la lógica de las existentes.

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `server/utils/mcp.ts` | Declarar `fund_id` en el `inputSchema` de `create_deuda`, `create_meta` y `upsert_budget` |
| `tests/mcp.test.ts` | Pasar `fund_id: fondoId` en los tres call sites que hoy dependen del default |
| `.github/workflows/build-release.yml` | Job `build`: `services: postgres:16`, `DATABASE_URL` y `pnpm db:migrate` antes de `pnpm test` |
| `docs/specs/README.md` | Fila de este spec |
