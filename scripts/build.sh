#!/usr/bin/env bash
# build.sh — Versión optimizada y automatizada
#
# Uso: npm run build

set -euo pipefail

ROOT="$(dirname "$0")/.."
DIST="$ROOT/dist"
VERSION=$(date +%Y%m%d%H%M)

# 1. Verificar herramientas
if ! npx html-minifier-terser --version &>/dev/null; then
  echo "ERROR: html-minifier-terser no encontrado. Ejecuta: npm install"
  exit 1
fi

# 2. Auditoría de Seguridad
echo "🛡️ Ejecutando auditoría de seguridad..."
node "$ROOT/scripts/security-audit.js"
echo ""

echo "🔨 Preparando entorno en: $DIST"
rm -rf "$DIST"
mkdir -p "$DIST"

# 3. Copiar activos estáticos
echo "📦 Copiando activos..."
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

# Función para minificar y aplicar cache-busting
process_html() {
  local src="$1"
  local dst="$2"
  local tmp_file=$(mktemp)
  
  mkdir -p "$(dirname "$dst")"
  
  # Aplicar cache-busting a .js y .css en el archivo temporal
  # Busca href="...css" o src="...js" y añade ?v=VERSION
  sed -E "s/(\.js|\.css)(\"|')/\1?v=${VERSION}\2/g" "$src" > "$tmp_file"
  
  # Minificar desde el temporal al destino
  npx html-minifier-terser "${MINIFY_OPTS[@]}" "$tmp_file" -o "$dst"
  
  orig=$(wc -c < "$src")
  minified=$(wc -c < "$dst")
  pct=$(( (orig - minified) * 100 / (orig + 1) )) # +1 evita división por cero
  echo "  $(basename "$(dirname "$src")")/$(basename "$src"): ${orig}B → ${minified}B  (−${pct}%)"
  
  rm "$tmp_file"
}

echo "📄 Procesando HTML con descubrimiento dinámico..."

# Dashboard principal
process_html "$ROOT/index.html" "$DIST/index.html"

# Descubrimiento dinámico de módulos (carpetas con index.html)
# Excluimos dist, node_modules, shared, scripts, img, .git, tests
for dir in "$ROOT"/*/; do
  dir_name=$(basename "$dir")
  case "$dir_name" in
    dist|node_modules|shared|scripts|img|.git|tests|artifacts)
      continue
      ;;
  esac
  
  if [ -f "${dir}index.html" ]; then
    process_html "${dir}index.html" "$DIST/$dir_name/index.html"
  fi
done

echo ""
echo "✅ Build completado exitosamente con versión: $VERSION"
echo "🚀 Listo para producción en /dist/"
