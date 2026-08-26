@echo off
title Luna Server - Inicializando...
color 0A

echo.
echo ==========================================
echo   LUNA SERVER - INICIANDO
echo ==========================================
echo.

cd /d "f:\luna_cosmeticos\backend"

echo [1/3] Matando processos antigos...
taskkill /F /IM luna-server.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1
timeout /t 2 >nul

echo [2/3] Iniciando servidor...
echo.
echo O painel vai abrir automaticamente!
echo Aguarde 10-15 segundos...
echo.

npm run tauri dev

pause
