# SPC-041 — Migraciones en el artefacto: deploy autocontenido

Estado: verificada · Issue: SEL-281
Depende de: SPC-020 (deploy), SPC-022 (release), SPC-029 (migraciones en el deploy), SPC-032 (`deploy.sh` versionado)

## Problema

El deploy de producción aplica las migraciones con `pnpm db:migrate` desde un **checkout del repo con `node_modules` en la VPS** (`CAUDAL_REPO_DIR`), porque el bundle de Nitro no lleva `drizzle-kit`. Eso hace que el deploy dependa de una copia de desarrollo del repo en el servidor, y de que esté sincronizada con `origin/main`.

Además el orden actual es peligroso: `deploy.sh` borra `$CURRENT/.output` **antes** de migrar. Si la migración falla, producción queda con pm2 corriendo el proceso viejo en memoria pero sin bundle en disco: el siguiente reinicio no levanta.

## Requerimientos

- El artefacto `caudal-output.tar.gz` pasa a llevar todo lo que el deploy necesita:
  - `.output/` (con `node_modules/pg` y `node_modules/drizzle-orm`, que Nitro ya traza)
  - `.output/server/migrate.mjs` (runner)
  - `.output/migrations/` (`*.sql` + `meta/_journal.json`)
  - `ecosystem.config.cjs`
  - `deploy.sh`
- `scripts/migrate.mjs`: aplica las pendientes con `drizzle-orm/node-postgres/migrator` (la **misma tabla** `drizzle.__drizzle_migrations` que usa `drizzle-kit`, así no re-aplica nada). Lee `DATABASE_URL` del entorno y acepta la carpeta de migraciones como argumento (default `../migrations`).
- `scripts/deploy.sh`: sin `git`, sin `pnpm`, sin `CAUDAL_REPO_DIR`. Descarga el release, extrae en un **staging**, migra **antes** de tocar `$CURRENT`, hace el swap de `.output`, reinicia pm2 y verifica el health check.
- El job `deploy` de la CI deja de usar el checkout: descarga el artefacto, extrae **`deploy.sh` del release** y ejecuta esa copia. El script que corre es el del tag desplegado.
- `CAUDAL_REPO_DIR` desaparece del README/AGENTS y de la deuda técnica.

## Criterios de aceptación

- [ ] `scripts/deploy.sh` no contiene `REPO_DIR`, `git`, ni `pnpm db:migrate`.
- [ ] En una base **vacía**, `node .output/server/migrate.mjs` aplica las 5 migraciones y deja `drizzle.__drizzle_migrations` con 5 filas; una segunda corrida no aplica nada (idempotente).
- [ ] Si la migración falla, `$CURRENT/.output` no se toca: el proceso en curso sigue sirviendo.
- [ ] El tar de la CI contiene `.output/migrations/meta/_journal.json`, `.output/server/migrate.mjs` y `deploy.sh`.
- [ ] Deploy real de v1.6.0 en verde usando el runner del artefacto, y `drizzle.__drizzle_migrations` sigue en 5 (no re-aplicó).
- [ ] Health check de producción OK después del deploy.
- [ ] El deploy manual desde el repo (`bash scripts/deploy.sh`) sigue funcionando.

## Verificación local (pendiente deploy)

- Artefacto empaquetado con los comandos exactos de la CI: `.output/migrations/` (5 SQL + `meta/`), `.output/server/migrate.mjs`, `deploy.sh`; el tar pasa de 3.2 MB a 3.5 MB.
- Extraído como en la VPS y corrido contra una base **vacía** (`caudal_migrate_test`): 5 migraciones aplicadas, `drizzle.__drizzle_migrations` con 5 filas y 15 tablas en `public`. Segunda corrida: no aplica nada (idempotente).
- `bash -n scripts/deploy.sh` OK y sin referencias a `REPO_DIR`, `git` ni `pnpm`.
- Prueba negativa: `CAUDAL_APP_DIR=/tmp/... bash scripts/deploy.sh v1.5.0` → aborta con "El artefacto v1.5.0 no trae el runner" **antes** de tocar nada.
- **Verificado en el deploy real de v1.5.1** (run 39379375767, job `deploy` success): el log de la VPS muestra `> Migraciones desde /var/www/caudal/staging-al6rCt/.output/migrations` y `> Migraciones al día`; `drizzle.__drizzle_migrations` sigue en **5** (no re-aplicó), `pm2 caudal` 1.5.1 online, health `200` y sin restos de staging ni de `.output.anterior`.
