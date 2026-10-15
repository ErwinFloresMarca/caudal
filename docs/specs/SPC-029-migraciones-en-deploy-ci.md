# SPC-029 — Migraciones de BD en el deploy de CI

Estado: propuesta · Issue: SEL-265

Depende de: [SPC-020](./SPC-020-deploy.md) (deploy en VPS + nginx), [SPC-022](./SPC-022-release.md) (release)

## Problema

El job `deploy` de `.github/workflows/build-release.yml` intenta aplicar las migraciones así:

```bash
cd /var/www/caudal/current && bash -lc 'set -a; . ./.env; set +a; pnpm db:migrate' || true
```

`/var/www/caudal/current` solo contiene `.output`, `.env`, `ecosystem.config.cjs` y `deploy.sh`:
**no tiene `package.json`, ni `node_modules`, ni `drizzle-kit`, ni el esquema**. Ese comando no
puede funcionar nunca, y el `|| true` se come el error. El health check posterior
(`:3071/api/_health`) tampoco lo detecta, porque la app arranca sin problema contra el esquema
viejo.

Mientras el deploy por CI no se ejecutaba (faltaban los secrets `VPS_*`, ya configurados) el
hueco no tenía efecto. **Ahora sí lo tiene**, y el camino que se va a usar es justo el roto.

El deploy **manual** sí lo hace bien: `/var/www/caudal/current/deploy.sh` migra desde un checkout
con `node_modules` (`CAUDAL_REPO_DIR`, por defecto `/root/apps/opencode-workdir/caudal`) y sin
`|| true`. Es decir: hoy hay dos caminos para lo mismo y solo uno es correcto.

## Requerimientos

- El deploy por CI **MUST** aplicar las migraciones Drizzle pendientes antes de reiniciar pm2.
- Un fallo de migración **MUST** abortar el deploy: nada de `|| true`, nada de continuar.
- Si no hay checkout con `node_modules` para migrar, el job **MUST** fallar con un mensaje
  explícito, en vez de continuar en silencio.
- El deploy manual y el de CI **MUST** usar la misma mecánica: un solo camino, no dos.
- El health check **MUST** seguir pasando tras el deploy.

## Criterios de aceptación

- Un release con una migración pendiente la aplica, y el health check de `:3071/api/_health` pasa.
- Si `pnpm db:migrate` falla, el job `deploy` queda en rojo (visible, no silenciado).
- Sin checkout en `CAUDAL_REPO_DIR`, el job falla con un mensaje explícito.
- `deploy.sh` y el workflow ejecutan el mismo comando de migración, con la misma fuente de
  `DATABASE_URL` (el `.env` de `current/`, que persiste entre deploys).

## Opciones (a decidir en la implementación)

1. **Migrar desde el checkout del VPS por SSH** (lo que ya hace `deploy.sh`): el script del job
   hace `cd "$CAUDAL_REPO_DIR" && set -a && . /var/www/caudal/current/.env && set +a && pnpm db:migrate`,
   sin `|| true`, y falla si no existe el checkout.
   - A favor: un solo camino, reutiliza lo que ya funciona y está probado; `drizzle-kit` no viaja
     en el artefacto.
   - En contra: el VPS necesita un checkout con `node_modules` al día.
2. **Meter el runner de migraciones en el artefacto** (p. ej. incluir `drizzle-kit` y el esquema
   en el tar, o una tarea de Nitro que migre al arrancar).
   - A favor: el deploy se vuelve autosuficiente y desaparece la dependencia del checkout.
   - En contra: engorda el artefacto y añade una ruta de ejecución nueva.
3. **Migrar desde el runner de CI**: descartada, la BD de producción escucha en loopback del VPS
   (`127.0.0.1:5432/caudal_prod`) y no es alcanzable desde GitHub, y publicarla para eso es
   exactamente lo que no queremos.

Recomendación: **opción 1**, porque es la que ya funciona y convierte dos caminos en uno.

## Fuera de alcance

- Publicar el puerto de Postgres de producción.
- Versionar `deploy.sh` (hoy vive solo en el VPS). Se puede proponer en otro cambio.
- Cambiar el mecanismo de release o el health check.

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `.github/workflows/build-release.yml` | Script del job `deploy`: migración real desde el checkout, sin `|| true` |
| `/var/www/caudal/current/deploy.sh` (VPS, no versionado) | Alinear con el mismo comando si diverge |
| `docs/specs/README.md` | Añadir la fila de este spec al índice |
| `AGENTS.md` | Dejar dicho dónde se aplican las migraciones en cada camino |
