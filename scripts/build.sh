#!/usr/bin/env bash
# build.sh — Minifica todos los archivos HTML al directorio /dist/
# Requiere: html-minifier-terser (npm install)
#
# Uso: npm run build
#   ó: bash scripts/build.sh

set -euo pipefail

ROOT="$(dirname "$0")/.."
DIST="$ROOT/dist"

# Verificar que html-minifier-terser esté disponible
if ! npx html-minifier-terser --version &>/dev/null; then
  echo "ERROR: html-minifier-terser no encontrado. Ejecuta: npm install"
  exit 1
fi

echo "🔨 Construyendo versión de producción en: $DIST"
rm -rf "$DIST"
mkdir -p "$DIST"

# Copiar activos estáticos
cp -r "$ROOT/img" "$DIST/img"
cp -r "$ROOT/shared" "$DIST/shared"

MINIFY_OPTS=(
  --collapse-whitespace
  --remove-comments
  --minify-css true
  --minify-js true
  --remove-optional-tags
  --remove-redundant-attributes
  --use-short-doctype
)

minify_html() {
  local src="$1"
  local dst="$2"
  mkdir -p "$(dirname "$dst")"
  npx html-minifier-terser "${MINIFY_OPTS[@]}" "$src" -o "$dst"
  orig=$(wc -c < "$src")
  minified=$(wc -c < "$dst")
  pct=$(( (orig - minified) * 100 / orig ))
  echo "  $(basename "$src"): ${orig}B → ${minified}B  (−${pct}%)"
}

echo ""
echo "Minificando HTML..."

# Dashboard principal
minify_html "$ROOT/index.html" "$DIST/index.html"

# Módulos
for module in funcionrenal guiaempirica polimedicados antidoto infucalc ictus gasometria sepsis lecturacritica; do
  if [ -f "$ROOT/$module/index.html" ]; then
    mkdir -p "$DIST/$module"
    minify_html "$ROOT/$module/index.html" "$DIST/$module/index.html"
  fi
done

echo ""
echo "✅ Build completado en: $DIST"
echo "Para servir localmente: npx serve $DIST"
