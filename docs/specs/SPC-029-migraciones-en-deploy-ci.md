# SPC-029 — Migraciones de BD en el deploy de CI

Estado: implementada · Issue: SEL-265

Depende de: [SPC-020](./SPC-020-deploy.md) (deploy en VPS + nginx), [SPC-022](./SPC-022-release.md) (release)

## Problema

El job `deploy` de `.github/workflows/build-release.yml` intentaba aplicar las migraciones así:

```bash
cd /var/www/caudal/current && bash -lc 'set -a; . ./.env; set +a; pnpm db:migrate' || true
```

`/var/www/caudal/current` solo contiene `.output`, `.env`, `ecosystem.config.cjs` y `deploy.sh`:
**no tiene `package.json`, ni `node_modules`, ni `drizzle-kit`, ni el esquema**. Ese comando no
puede funcionar nunca, y el `|| true` se come el error. El health check posterior
(`:3071/api/_health`) tampoco lo detecta, porque la app arranca sin problema contra el esquema
viejo.

Mientras el deploy por CI no se ejecutaba (faltaban los secrets `VPS_*`, configurados el
2026-10-15) el hueco no tenía efecto: los steps de deploy se saltaban por su `if` y el job salía
verde en 10 s sin desplegar nada. **Con los secrets puestos, el camino que se ejecuta es justo el
roto.**

El deploy **manual** sí lo hacía bien: `/var/www/caudal/current/deploy.sh` migra desde un checkout
con `node_modules` (`CAUDAL_REPO_DIR`, por defecto `/root/apps/opencode-workdir/caudal`) y sin
`|| true`. Y el job de CI duplicaba a mano (extract, pm2, health check) lo que ese script ya hace:
dos caminos para lo mismo y solo uno correcto.

## Decisión (implementación)

**El job `deploy` invoca `deploy.sh`**, el mismo script del deploy manual, pasándole el tag del
release que acaba de publicar el job `build`. Un solo camino, cero lógica duplicada.

Se descartó la opción 1 original (arreglar la línea de migración dentro del workflow) porque
mantenía dos caminos que pueden divergir: el script y el workflow tendrían que cambiar juntos para
seguir haciendo lo mismo.

`deploy.sh` ahora:

- acepta el tag como argumento (`deploy.sh v1.2.0`) y sin argumento sigue usando el último release;
- valida el checkout **antes** de reemplazar `.output`, de modo que un fallo de validación no deja
  un deploy a medias (código nuevo contra esquema viejo);
- falla —en vez de avisar y seguir— si el checkout no tiene `node_modules` o si no está sincronizado
  con `origin/main`. Migrar con un checkout atrasado o adelantado aplica el esquema equivocado en
  silencio, que es la misma clase de fallo que este spec elimina.

Consecuencias en el workflow: desaparecen el artifact del build y el `scp`, y la CI ya no
reimplementa el deploy. El artifact no hacía falta porque `deploy.sh` descarga el tarball del
release. `DATABASE_URL` sigue sin usarlo el pipeline.

## Requerimientos

- El deploy por CI **MUST** aplicar las migraciones Drizzle pendientes antes de reiniciar pm2.
- Un fallo de migración **MUST** abortar el deploy: nada de `|| true`, nada de continuar.
- Si no hay checkout con `node_modules`, o el checkout no está sincronizado con `origin/main`, el
  deploy **MUST** fallar con un mensaje explícito, y **MUST** fallar antes de reemplazar `.output`.
- El deploy manual y el de CI **MUST** usar la misma mecánica: el job invoca `deploy.sh`, no duplica
  lógica.
- El job **MUST** desplegar el tag del release que publicó el job `build`, no "el último release".
- El health check **MUST** seguir pasando tras el deploy.

## Criterios de aceptación

- Un release con una migración pendiente la aplica, y el health check de `:3071/api/_health` pasa.
  → **no verificable hoy**: producción tiene 4 migraciones aplicadas y el repo 4 `.sql`; la primera
  migración nueva es la prueba real.
- Si `pnpm db:migrate` falla, el job `deploy` queda en rojo (visible, no silenciado).
- Sin checkout en `CAUDAL_REPO_DIR`, o con el checkout desincronizado, el job falla con un mensaje
  explícito.
- `deploy.sh` y el workflow ejecutan el mismo comando de migración, con la misma fuente de
  `DATABASE_URL` (el `.env` de `current/`, que persiste entre deploys).

## Fuera de alcance

- Publicar el puerto de Postgres de producción.
- Versionar `deploy.sh` (sigue viviendo solo en el VPS). Ahora que la CI depende de él, versionarlo
  es un cambio aparte con sentido propio.
- Cambiar el mecanismo de release o el health check.
- Probar el caso de una migración pendiente (ver criterios de aceptación).

## Archivos que toca

| Archivo | Cambio |
|---|---|
| `.github/workflows/build-release.yml` | Job `deploy`: un solo step que invoca `deploy.sh "$TAG"`. Fuera el artifact del build, el `scp` y la migración silenciada |
| `/var/www/caudal/current/deploy.sh` (VPS, no versionado) | Tag como argumento; validación del checkout antes de tocar `.output`; migración que ya no se salta |
| `docs/specs/README.md` | Fila de SPC-029 al día |
| `AGENTS.md` | Dónde se aplican las migraciones en cada camino y qué secrets usa el pipeline |
