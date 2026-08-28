@echo off
title SupplIA - Instalador
color 0A
echo.
echo ============================================
echo    SupplIA - Instalador
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo No se encontro Node.js instalado en esta computadora.
  echo.
  echo Instalalo primero desde https://nodejs.org ^(version LTS, boton verde^)
  echo y despues volve a hacer doble click en este archivo.
  echo.
  pause
  exit /b 1
)

echo Instalando componentes del sistema, puede tardar unos minutos...
echo.
call npm install
if errorlevel 1 (
  echo.
  echo Hubo un error instalando los componentes. Revisa el mensaje de arriba.
  echo Si no sabes que hacer, mandale este mensaje a quien te entrego el sistema.
  echo.
  pause
  exit /b 1
)

echo.
node scripts\setup.mjs

echo.
pause
