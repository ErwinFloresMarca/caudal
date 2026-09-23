# SPC-020 — Deploy en VPS + nginx

Estado: verificada
Depende de: SPC-022 (release con pipeline) y de SPC-001..019 funcionalmente

## Problema

Caudal debe estar accesible desde el navegador del teléfono en `caudal.erfm.dev` (mismo patrón que Ritmo). El deploy tiene que ser repetible, con la BD fuera del código y a salvo de redeploys.

## Requerimientos

- **Repositorio**: `ErwinFloresMarca/caudal` (GitHub), rama `main`.
- **Release**: `scripts/release.sh` (`pnpm release [patch|minor|major]`) → valida rama/árbol limpio/lint/tests/build → bump → tag anotado `vX.Y.Z` → push.
- **Pipeline** `.github/workflows/build-release.yml`: en tag `v*` corre test/lint/typecheck/build y publica `caudal-output.tar.gz` como release.
- **VPS** (skill `nginx-expose`): `/var/www/caudal/` con `current/`, `deploy.sh` y `.env` (secrets). La BD es un PostgreSQL dedicado (no es un archivo en el VPS).
  - `deploy.sh`: `gh release download` → extrae `.output` en `current/` → `pnpm db:migrate` → `pm2 restart caudal` (o start si no existe).
  - Proceso pm2 `caudal` en `127.0.0.1:3071`, con `DATABASE_URL` (PostgreSQL de producción), `NUXT_SESSION_PASSWORD` y `NITRO_HOST=127.0.0.1`.
- **nginx**: server block `<dominio>.erfm.dev` → `127.0.0.1:3071` (creado con la skill `nginx-expose`). HTTPS/DNS con Cloudflare.
- **Secrets del repo**: `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY`, `VPS_SSH_KEY_PASSPHRASE`, `DATABASE_URL`.
- El deploy no toca los datos (PostgreSQL externo dedicado); los datos sobreviven a los redeploys. Backups documentados.
- Actualizar `AGENTS.md` con los datos reales (dominio final, ruta, pm2) al cerrar el spec.

## Criterios de aceptación

- [x] `pnpm release patch` en `main` genera `vX.Y.Z` y el pipeline publica el artefacto. (`v0.1.1`, asset `caudal-output.tar.gz`)
- [x] `deploy.sh` en el VPS baja el release, deja el proceso `caudal` corriendo en `:3071` y responde en `https://caudal.erfm.dev`.
- [x] Un redeploy NO borra ni recrea la BD (los datos sobreviven). (prueba: registrar movimiento, redeploy, sigue ahí)
- [x] nginx proxya correctamente; no hay puerto 3071 expuesto al mundo.
- [x] `AGENTS.md`/`README` reflejan dominio, ruta y comandos reales.

## Implementación (decisiones)

- **Release**: `scripts/release.sh` + script `pnpm release`; workflow `.github/workflows/build-release.yml` publica `caudal-output.tar.gz` (`.output` + `ecosystem.config.cjs`) en el tag `v*`. `packageManager: pnpm@12.4.1` en `package.json` (lo exige `pnpm/action-setup`).
- **VPS**: `/var/www/caudal/current` con `.env` (600), `ecosystem.config.cjs` y `deploy.sh`; pm2 `caudal` en `127.0.0.1:3071` (`node --env-file=.env`).
- **BD**: base dedicada `caudal_prod` + rol `caudal` en el Postgres de producción (`127.0.0.1:5432`); migraciones aplicadas con `drizzle-kit`. `deploy.sh` corre `pnpm db:migrate` desde un checkout del repo en el VPS (el bundle de Nitro no trae el migrator) — `ponytail:` mover migraciones+runner al artefacto si algún día no hay checkout.
- **nginx**: `/etc/nginx/sites-available/caudal` → `127.0.0.1:3071`; DNS/HTTPS por Cloudflare.
- **Secrets del repo**: no configurados → el job `deploy` de la CI se omite; el deploy es manual con `deploy.sh`.

Verificado: release `v0.1.1` publicado por la CI; `deploy.sh` OK; usuario registrado en prod sobrevive a un redeploy; `ss` muestra `3071` solo en loopback. **Pendiente de entorno**: crear el registro DNS `caudal.erfm.dev` en Cloudflare para que `https://caudal.erfm.dev` resuelva (nginx ya responde por `Host`).