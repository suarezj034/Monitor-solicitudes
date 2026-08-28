#!/usr/bin/env bash
set -e
echo ""
echo "============================================"
echo "   SupplIA - Instalador"
echo "============================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "No se encontró Node.js instalado en esta computadora."
  echo ""
  echo "Instalalo primero desde https://nodejs.org (versión LTS)"
  echo "y después volvé a ejecutar este script."
  exit 1
fi

echo "Instalando componentes del sistema, puede tardar unos minutos..."
echo ""
npm install

echo ""
node scripts/setup.mjs
