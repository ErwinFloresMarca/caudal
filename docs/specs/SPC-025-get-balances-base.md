# SPC-025 — get_balances: base configurable y consolidación correcta

Estado: verificada
Depende de: SPC-018, decisión 0002

## Problema

La tool MCP `get_balances` acepta `base: "BOB" | "USD"`, pero la consolidación
asume siempre base BOB. Al pedir `base: "USD"` con cuentas BOB presentes (lo
habitual), `convertToBase` recibe `tasaRef: undefined` y lanza
`Falta tasa de cambio para convertir`: la tool devuelve error en vez de una
cifra. Además, sin parámetro `base` ignora la moneda base del usuario
(`getMonedaBase`) y asume BOB, a diferencia de `get_report`.

## Requerimientos

- `get_balances` DEBE consolidar cualquier cuenta cuya moneda difiera de la
  base (BOB→USD divide, USD→BOB multiplica), no solo de USD hacia BOB.
- La tasa usada DEBE resolverse igual que en SEL-112: última tasa histórica del
  fondo y, si no existe, la tasa paralelo configurada en Ajustes.
- Si hay conversión pendiente y NO hay tasa disponible, el consolidado DEBE ser
  `null` (degradación elegante), nunca un error.
- Si no se pasa `base`, DEBE usarse la moneda base **del fondo** (`fondos.moneda_base`), no la del usuario (alineado con el dashboard en SEL-114).
- `base: "BOB"` DEBE conservar el comportamiento actual (compatibilidad con
  SEL-112).
- El campo `nota` DEBE describir la conversión sin afirmar que la tasa es
  histórica (puede venir de Ajustes).

## Criterios de aceptación

- [x] `base: "USD"` con fondo mixto BOB+USD devuelve el consolidado en USD, sin
  lanzar. (test)
- [x] `base: "USD"` con solo cuentas BOB divide por la tasa. (test)
- [x] `base: "USD"` sin tasa disponible → `consolidado: null`. (test)
- [x] Sin `base`, se usa la `moneda_base` del fondo. (test)
- [x] `base: "BOB"` con fondo mixto sigue devolviendo lo de SEL-112. (test)

## Fuera de alcance

- El dashboard (`resumenDashboard`) consolida siempre a BOB; no expone `base`.
- `get_report` ya maneja la base con su propio `tasaFallback`.
