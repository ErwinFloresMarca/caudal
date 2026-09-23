# Changelog

## v0.1.1

Primera versión funcional de Caudal (backend completo + shell).

- Fundación: Nuxt 4, PostgreSQL + Drizzle, auth multiusuario (scrypt) + API keys, shell con sidebar/barra móvil, login con Google.
- Núcleo del dinero: fondos, cuentas (saldo vivo, multimoneda BOB/USD), categorías, transacciones (tasa histórica), transferencias, aportes/retiros entre fondos.
- Inteligencia: recurrentes (pendientes por confirmar), deudas/MSI, metas de ahorro, presupuestos por categoría, dashboard, reportes, búsqueda y filtros, ajustes.
- Release: `pnpm release` + pipeline que publica `caudal-output.tar.gz`; deploy en VPS con pm2 + nginx.
