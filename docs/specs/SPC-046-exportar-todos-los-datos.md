# SPC-046 — Exportar todos los datos desde Ajustes

Estado: implementada · Issue: SEL-286
Depende de: SPC-002 (modelo de datos), SPC-017 (ajustes), SPC-039 (CSV de movimientos)

## Problema

Los datos viven solo dentro de la app: no hay respaldo ni forma de llevárselos. El CSV de Reportes cubre transacciones, pero no categorías, deudas, metas, presupuestos ni configuración.

## Requerimientos

- `GET /api/ajustes/exportar` → archivo JSON adjunto `caudal-datos-YYYY-MM-DD.json`.
- Estructura versionada:
  ```json
  {
    "version": 1,
    "exportado_at": "…",
    "usuario": { "id", "email", "name", "avatar_url", "timezone", "created_at" },
    "datos": {
      "fondos": [], "cuentas": [], "categorias": [], "transacciones": [],
      "transferencias": [], "recurrentes": [], "deudas": [], "cuotas": [],
      "metas": [], "aportes_meta": [], "presupuestos": [], "ajustes": [],
      "api_keys": [], "oauth": []
    }
  }
  ```
- Solo los datos del usuario autenticado. Los ids se incluyen para poder reconstruir relaciones.
- **Sin secretos**: nada de `password_hash` ni `key_hash`. De las API keys solo nombre y fechas; de OAuth, proveedor y cuenta (sin `provider_id`).
- Los datos van en su forma cruda (centavos, fechas ISO, ids), sin formateos ni conversiones: es un respaldo, no un reporte.
- `cuotas` y `aportes_meta` no tienen `user_id`: se filtran por sus padres (`deuda_id`, `meta_id`).
- Botón **Descargar JSON** en Ajustes, con una línea que diga qué incluye y qué no.

## Criterios de aceptación

- [ ] El archivo incluye una fila de cada tabla del usuario (incluida una cuota y un aporte a meta) y **ninguna** de otro usuario.
- [ ] No aparecen `password_hash` ni `key_hash` en el JSON.
- [ ] Se descarga como adjunto con nombre y fecha.
- [ ] El JSON es válido y tiene `version: 1`.
- [ ] `pnpm test` cubre inclusión, ausencia de hashes y aislamiento entre usuarios.

## Verificación local (pendiente deploy)

- `tests/exportar.test.ts`: 4 casos — incluye todas las tablas (14 filas de cuota y aportes por padre), no exporta `password_hash`/`key_hash`, aísla al otro usuario y el JSON vuelve a parsearse con los datos intactos. 232 tests en total, lint, typecheck y build en verde.
- En navegador (390px): la tarjeta "Exportar datos" y el botón se ven sin desbordes; la **descarga real** genera `caudal-datos-2026-10-21.json` (48 KB) con `version: 1`, tablas `fondos 5 / cuentas 7 / categorías 56 / transacciones 33 / transferencias 1 / recurrentes 3 / deudas 4 / cuotas 6 / metas 3 / aportes 3 / presupuestos 4 / ajustes 2 / api_keys 3` y **sin ningún hash**.
- Falta el deploy para pasar a `verificada`.
