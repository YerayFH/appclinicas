#!/usr/bin/env bash
# convert-webp.sh
# Convierte todas las imágenes PNG de /img/ a formato WebP.
# Requiere: cwebp (instalar con: sudo apt install webp  /  brew install webp)
#
# Uso: bash scripts/convert-webp.sh
# Los archivos WebP se crean junto a los originales PNG (img/X.webp).
# Los PNG originales se conservan como fallback para navegadores sin soporte WebP.

set -euo pipefail

IMG_DIR="$(dirname "$0")/../img"

if ! command -v cwebp &> /dev/null; then
  echo "ERROR: cwebp no encontrado."
  echo "Instala con: sudo apt install webp  (Linux) o  brew install webp  (Mac)"
  exit 1
fi

echo "Convirtiendo imágenes PNG a WebP en: $IMG_DIR"
converted=0
for png in "$IMG_DIR"/*.png; do
  webp="${png%.png}.webp"
  if [ -f "$webp" ]; then
    echo "  Ya existe: $(basename "$webp") — omitiendo"
    continue
  fi
  echo "  Convirtiendo: $(basename "$png")"
  cwebp -q 85 -m 6 "$png" -o "$webp"
  orig_size=$(wc -c < "$png")
  new_size=$(wc -c < "$webp")
  pct=$(( (orig_size - new_size) * 100 / orig_size ))
  echo "    ${orig_size} → ${new_size} bytes  (ahorro: ${pct}%)"
  converted=$((converted + 1))
done

echo ""
echo "Completado: $converted imagen(s) convertida(s)."
echo "Los HTML usan <picture> con fallback PNG para compatibilidad total."
