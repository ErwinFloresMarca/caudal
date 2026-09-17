# SPC-020 — Deploy en VPS + nginx

Estado: propuesta
Depende de: SPC-022 (release con pipeline) y de SPC-001..019 funcionalmente

## Problema

Caudal debe estar accesible desde el navegador del teléfono en `caudal.erfm.dev` (mismo patrón que Ritmo). El deploy tiene que ser repetible, con la BD fuera del código y a salvo de redeploys.

## Requerimientos

- **Repositorio**: `ErwinFloresMarca/caudal` (GitHub), rama `main`.
- **Release**: `scripts/release.sh` (`pnpm release [patch|minor|major]`) → valida rama/árbol limpio/lint/tests/build → bump → tag anotado `vX.Y.Z` → push.
- **Pipeline** `.github/workflows/build-release.yml`: en tag `v*` corre test/lint/typecheck/build y publica `caudal-output.tar.gz` como release.
- **VPS** (skill `nginx-expose`): `/var/www/caudal/` con `current/`, `deploy.sh`, `.env` (secrets), `data/` (BD, fuera de `current/`).
  - `deploy.sh`: `gh release download` → extrae `.output` en `current/` → `pm2 restart caudal` (o start si no existe).
  - Proceso pm2 `caudal` en `127.0.0.1:3071`, con `CAUDAL_DB=/var/www/caudal/data/caudal.db`, `NUXT_SESSION_PASSWORD` y `NITRO_HOST=127.0.0.1`.
- **nginx**: server block `<dominio>.erfm.dev` → `127.0.0.1:3071` (creado con la skill `nginx-expose`). HTTPS/DNS con Cloudflare.
- **Secrets del repo**: `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY`, `VPS_SSH_KEY_PASSPHRASE`.
- La BD NUNCA se toca por el deploy (ruta externa a `current/`); backups manuales/documentados.
- Actualizar `AGENTS.md` con los datos reales (dominio final, ruta, pm2) al cerrar el spec.

## Criterios de aceptación

- [ ] `pnpm release patch` en `main` genera `vX.Y.Z` y el pipeline publica el artefacto.
- [ ] `deploy.sh` en el VPS baja el release, deja el proceso `caudal` corriendo en `:3071` y responde en `https://caudal.erfm.dev`.
- [ ] Un redeploy NO borra ni recrea la BD (los datos sobreviven). (prueba: registrar movimiento, redeploy, sigue ahí)
- [ ] nginx proxya correctamente; no hay puerto 3071 expuesto al mundo.
- [ ] `AGENTS.md`/`README` reflejan dominio, ruta y comandos reales.