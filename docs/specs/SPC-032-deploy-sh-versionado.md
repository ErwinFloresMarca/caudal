# SPC-032 — Versionar `deploy.sh`

Estado: verificada · Issue: SEL-270

Verificado en el run [38983068375](https://github.com/ErwinFloresMarca/caudal/actions/runs/38983068375)
(tag `v1.3.0`): el job `deploy` ejecutó
`bash /root/apps/opencode-workdir/caudal/scripts/deploy.sh "v1.3.0"` — el script **del repo**, no una
copia suelta — y terminó con `> Deploy OK: v1.3.0`. En la VPS `/var/www/caudal/current` ya no queda
`deploy.sh`. `scripts/release.sh` también imprime el comando nuevo. Producción: pm2 `caudal` 1.3.0
online, health 200.

Depende de: [SPC-020](./SPC-020-deploy.md) (deploy en VPS), [SPC-029](./SPC-029-migraciones-en-deploy-ci.md) (la CI invoca `deploy.sh`)

## Problema

`/var/www/caudal/current/deploy.sh` es el script que despliega producción, y **vive solo en la VPS**:
no está en git, no tiene historial, no pasa por revisión y no se puede reproducir en otra máquina.

Desde SPC-029 la CI lo invoca por SSH, es decir: **un cambio roto en ese archivo rompe todos los
deploys**, y no hay forma de revertirlo ni de ver qué cambió. El AGENTS.md lo documenta como si fuera
parte del proyecto, pero no lo es.

## Requerimientos

- El script **MUST** vivir en el repo, en `scripts/deploy.sh`, con el mismo comportamiento que hoy
  (aceptar el tag como argumento, validar el checkout antes de tocar `.output`, aplicar migraciones,
  reiniciar pm2 y verificar el health check).
- La CI **MUST** ejecutar el script **del repo** (`scripts/deploy.sh` del checkout de la VPS), no una
  copia suelta.
- El comando de deploy manual **MUST** quedar documentado con su ruta real y **MUST** seguir
  funcionando sin pasos extra.
- **MUST NOT** quedar dos copias del script que puedan divergir.
- El `.env` de producción **MUST** seguir leyéndose de `/var/www/caudal/current/.env` (no se mueve ni
  se versiona).

## Criterios de aceptación

- `git log -- scripts/deploy.sh` muestra historial de cambios en el repo.
- Un release desplegado por la CI ejecuta `scripts/deploy.sh` desde el checkout y termina con
  `> Deploy OK: <tag>` (mismo output que hoy).
- El deploy manual documentado funciona igual que antes.
- No queda ninguna copia del script fuera del repo.
- `pnpm lint` / `pnpm typecheck` / `pnpm test` sin cambios (es un script de shell: no toca código de
  la app).

## Fuera de alcance

- Meter el runner de migraciones dentro del artefacto del release (sigue haciendo falta el checkout
  con `node_modules`).
- Cambiar el mecanismo de deploy, el health check o el flujo de release.
- Automatizar el deploy sin tag (sigue siendo `deploy.sh [tag]` o el último release).

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `scripts/deploy.sh` | Nuevo: el script que hoy vive solo en la VPS |
| `.github/workflows/build-release.yml` | El step SSH ejecuta `scripts/deploy.sh` del checkout |
| `/var/www/caudal/current/deploy.sh` (VPS) | Se elimina (queda una sola copia) |
| `AGENTS.md` | Comando de deploy real y su ruta |
| `docs/specs/README.md` | Fila de este spec |
