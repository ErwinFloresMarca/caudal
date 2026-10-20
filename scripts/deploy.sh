#!/usr/bin/env bash
set -euo pipefail

# Deploy de Caudal en la VPS (SPC-020, versionado en SPC-032, autocontenido en SPC-041).
#   bash deploy.sh [tag]
# Descarga el release (el tag pasado, o el último), lo extrae en un staging,
# aplica las migraciones que trae el artefacto ANTES de tocar el código, cambia
# .output, reinicia pm2 y verifica el health check. Si el health falla, vuelve
# al .output anterior.
# No necesita checkout del repo, ni node_modules, ni pnpm: solo gh, node, pm2 y curl.
# La CI ejecuta la copia de este script que viene dentro del release.

REPO="ErwinFloresMarca/caudal"
APP_DIR="${CAUDAL_APP_DIR:-/var/www/caudal}"
CURRENT="$APP_DIR/current"

TAG="${1:-$(gh release list --repo "$REPO" --limit 1 --json tagName --jq '.[0].tagName')}"
if [ -z "$TAG" ] || [ "$TAG" = "null" ]; then
  echo "✗ No hay releases publicados todavía."
  exit 1
fi
echo "> Desplegando release: $TAG"

mkdir -p "$APP_DIR"
STAGING="$(mktemp -d "$APP_DIR/staging-XXXXXX")"
trap 'rm -rf "$STAGING"' EXIT

gh release download "$TAG" --repo "$REPO" --pattern 'caudal-output.tar.gz' --clobber --dir "$STAGING"
tar -xzf "$STAGING/caudal-output.tar.gz" -C "$STAGING"

if [ ! -f "$STAGING/.output/server/migrate.mjs" ] || [ ! -d "$STAGING/.output/migrations" ]; then
  echo "✗ El artefacto $TAG no trae el runner de migraciones (release anterior a SPC-041)."
  exit 1
fi

# Migrar antes de tocar el código: si la migración falla, producción sigue intacta.
echo "> Migraciones..."
( set -a && . "$CURRENT/.env" && set +a && node "$STAGING/.output/server/migrate.mjs" )

echo "> Cambiando .output..."
rm -rf "$CURRENT/.output.anterior"
[ -d "$CURRENT/.output" ] && mv "$CURRENT/.output" "$CURRENT/.output.anterior"
cp -a "$STAGING/.output" "$CURRENT/.output"
cp -a "$STAGING/ecosystem.config.cjs" "$CURRENT/ecosystem.config.cjs"

pm2 restart caudal --update-env || pm2 start "$CURRENT/ecosystem.config.cjs"
pm2 save

sleep 3
if curl -sf http://127.0.0.1:3071/api/_health > /dev/null; then
  rm -rf "$CURRENT/.output.anterior"
  echo "> Deploy OK: $TAG"
else
  echo "✗ Health check FALLIDO: vuelvo al .output anterior"
  rm -rf "$CURRENT/.output"
  mv "$CURRENT/.output.anterior" "$CURRENT/.output"
  pm2 restart caudal --update-env
  exit 1
fi
