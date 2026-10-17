# SPC-036 — Cerrar los huecos de validación del MCP

Estado: verificada · Issue: SEL-274

Verificado en local: **184/184 tests** (21 archivos; 12 tests puros del validador, incluidos los de
objetos anidados, fechas y montos), `pnpm lint`, `pnpm typecheck`. `list_transactions` con
`categoria: "<id>"` y `limite: "1"` (strings) devuelve lo mismo que con números.
Nota: `parseAmount` acepta `"12.5"` (un punto con 1-2 dígitos es decimal) y rechaza `"0"` (centavos
≤ 0): el validador de montos hereda exactamente ese criterio.

Depende de: [SPC-033](./SPC-033-validar-argumentos-mcp.md) (validación de argumentos), [SPC-018](./SPC-018-mcp-server.md) (MCP server)

## Problema

SPC-033 activó la validación contra el `inputSchema`, pero quedaron cuatro huecos anotados en su
sección "Fuera de alcance":

1. **`cadencia` no se valida por dentro**: el schema la declara como objeto sin `properties`
   (`server/utils/mcp.ts:88`), así que el validador solo comprueba el tipo. Un `{ frecuncia: 'mensual' }`
   (typo) pasa, llega al handler y revienta más tarde.
2. **Las fechas no tienen formato**: `FECHA` se declara `{ type: 'string', description: 'Fecha YYYY-MM-DD' }`
   (`mcp.ts:32`): nada impide `"mañana"` ni `"2026-9-1"`.
3. **Los montos no se validan**: `MONTO` es `{ type: 'string' }` (`mcp.ts:33`) y el handler los pasa por
   `parseAmount` (`mcp.ts:138`), que lanza. Un monto inválido llega hasta el repositorio en vez de
   frenarse en la puerta.
4. **Coerción inconsistente**: el resto de los handlers coercen con `Number()`, pero
   `list_transactions` compara `args.categoria` **sin coerción** (`t.categoria?.id === args.categoria`)
   y exige `Number.isInteger(args.limite)` (un `"10"` cae al default 50 en silencio). Es la misma
   familia de bug que SPC-031: un valor que "no hace nada" sin avisar.

## Requerimientos

- El validador **MUST** validar recursivamente los objetos que declaran `properties` (incluido
  `additionalProperties: false` y `required` internos), sin cambiar el comportamiento para los que no
  las declaran.
- `cadencia` **MUST** declarar `properties` (`frecuencia` con `enum` de frecuencias válidas, `dia`,
  `dia_semana`) y **MUST** exigir `frecuencia`.
- `FECHA` **MUST** declarar `format: 'date'` y el validador **MUST** rechazar lo que no sea
  `YYYY-MM-DD` con fecha real.
- `MONTO` **MUST** declarar `format: 'amount'` y el validador **MUST** rechazar lo que no se pueda
  interpretar con `parseAmount` (lo que hoy falla recién en el handler).
- `list_transactions` **MUST** coercer `categoria` y `limite` igual que el resto (`Number()`), de modo
  que `"10"` funcione en vez de caer al default en silencio.
- El validador **MUST** seguir siendo lógica pura en `shared/` y **MUST NOT** agregar dependencias.

## Criterios de aceptación

- Tests puros del validador: objeto anidado válido; propiedad desconocida **dentro** de `cadencia`;
  `required` interno faltante; `frecuencia` fuera del enum; fecha inválida (`"2026-9-1"`, `"mañana"`,
  `"2026-02-31"`); monto inválido (`"abc"`, `""`); fecha y monto válidos.
- `list_transactions` con `limite: "10"` y `categoria: "5"` (string) devuelve lo mismo que con números.
- Los tests del MCP existentes siguen verdes (los schemas describen lo que las tools necesitan).
- `pnpm test`, `pnpm lint`, `pnpm typecheck` verdes.

## Fuera de alcance

- Declarar `properties` para otros objetos anidados (no hay más en los schemas).
- Validar contra un JSON Schema completo o adoptar una dependencia (`zod`/`ajv`).
- Cambiar la semántica de ninguna tool.

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `shared/mcp-schema.ts` | Validación recursiva de objetos + `format: 'date'` y `format: 'amount'` |
| `server/utils/mcp.ts` | `cadencia` con `properties`, `FECHA` con formato, `MONTO` con formato, coerción en `list_transactions` |
| `tests/mcp-schema.test.ts` | Casos nuevos del validador |
| `tests/mcp.test.ts` | Caso de coerción de `limite`/`categoria` |
| `docs/specs/README.md` | Fila de este spec |
