#!/usr/bin/env bash
set -euo pipefail

# Deploy de Caudal en la VPS (SPC-020, versionado en SPC-032).
#   bash scripts/deploy.sh [tag]
# Descarga el release (el tag pasado, o el último), extrae .output, aplica
# migraciones, reinicia pm2 y verifica el health check. La CI ejecuta este mismo
# archivo desde el checkout, pasándole el tag que acaba de publicar (SPC-029):
# un solo camino de deploy, con historial en git.
# Requiere: gh autenticado en la VPS, pm2, y un checkout del repo con
# node_modules (para drizzle-kit) sincronizado con origin/main.

REPO="ErwinFloresMarca/caudal"
APP_DIR="/var/www/caudal"
CURRENT="$APP_DIR/current"

TAG="${1:-$(gh release list --repo "$REPO" --limit 1 --json tagName --jq '.[0].tagName')}"
if [ -z "$TAG" ] || [ "$TAG" = "null" ]; then
  echo "✗ No hay releases publicados todavía."
  exit 1
fi
echo "> Desplegando release: $TAG"

# Migraciones: el bundle de Nitro no incluye drizzle-kit. Se aplican desde un
# checkout del repo en la VPS (con node_modules) que debe estar igual a
# origin/main: migrar con un checkout viejo o adelantado aplica el esquema
# equivocado en silencio. Se valida antes de tocar .output para no dejar un
# deploy a medias.
# ponytail: si algún día no hay checkout, mover migraciones+runner al artefacto.
REPO_DIR="${CAUDAL_REPO_DIR:-/root/apps/opencode-workdir/caudal}"
if [ ! -d "$REPO_DIR/node_modules" ]; then
  echo "✗ Sin checkout con node_modules en $REPO_DIR: no se pueden aplicar migraciones."
  exit 1
fi
git -C "$REPO_DIR" fetch -q origin main
if [ "$(git -C "$REPO_DIR" rev-parse HEAD)" != "$(git -C "$REPO_DIR" rev-parse FETCH_HEAD)" ]; then
  echo "✗ El checkout $REPO_DIR no está sincronizado con origin/main (commitá/pusheá o hacé pull antes de desplegar)."
  exit 1
fi

cd "$APP_DIR"
gh release download "$TAG" --repo "$REPO" --pattern 'caudal-output.tar.gz' --clobber --dir "$APP_DIR"

rm -rf "$CURRENT/.output"
tar -xzf "caudal-output.tar.gz" -C "$CURRENT"

echo "> Migraciones (desde $REPO_DIR)..."
( cd "$REPO_DIR" && set -a && . "$CURRENT/.env" && set +a && pnpm db:migrate )

pm2 restart caudal --update-env || pm2 start "$CURRENT/ecosystem.config.cjs"
pm2 save

sleep 3
curl -sf http://127.0.0.1:3071/api/_health > /dev/null && echo "> Deploy OK: $TAG" || { echo "✗ Health check FALLIDO"; exit 1; }
