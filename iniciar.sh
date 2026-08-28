#!/usr/bin/env bash
set -e
if [ ! -d ".next" ]; then
  echo "Compilando el sistema por primera vez, puede tardar 1-2 minutos..."
  npm run build
fi

echo ""
echo "Iniciando SupplIA en http://localhost:3000"
echo "No cierres esta ventana mientras lo estés usando."
echo ""
( sleep 4 && (open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null || true) ) &
npm start
