@echo off
title SupplIA
color 0A
if not exist ".next" (
  echo Compilando el sistema por primera vez, puede tardar 1-2 minutos...
  call npm run build
  if errorlevel 1 (
    echo.
    echo Hubo un error al compilar. Revisa el mensaje de arriba.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando SupplIA...
echo Se va a abrir en el navegador en unos segundos: http://localhost:3000
echo No cierres esta ventana mientras lo estes usando.
echo.
start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
call npm start
