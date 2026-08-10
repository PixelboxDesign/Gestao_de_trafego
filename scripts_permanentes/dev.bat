@echo off
echo ========================================
echo   Luna Cosmeticos - Ambiente DEV
echo ========================================
echo.
echo [1] Iniciando Cloudflare Tunnel...
start "Cloudflare Tunnel" cmd /k "cloudflared tunnel --url http://localhost:3001"
timeout /t 3 /nobreak >nul

echo [2] Iniciando Tauri Dev...
f:
cd f:\luna_cosmeticos\backend
npm run tauri dev
