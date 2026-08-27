@echo off
title Luna Server - Inicializando...

echo.
echo ========================================
echo   Luna Server - Inicializacao Completa
echo ========================================
echo.

REM Matar processos anteriores
taskkill /F /IM luna-server.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM cloudflared.exe >nul 2>&1

echo [1/3] Limpando processos anteriores...
timeout /t 2 >nul

REM Iniciar sidecar WhatsApp em background
echo [2/3] Iniciando WhatsApp sidecar na porta 3002...
cd /d "%~dp0whatsapp-sidecar"
start /B node server.js

timeout /t 3 >nul

REM Iniciar Luna Server
echo [3/3] Iniciando Luna Server...
cd /d "%~dp0src-tauri\target\release"
start "" luna-server.exe

echo.
echo ========================================
echo   Luna Server iniciado com sucesso!
echo ========================================
echo.
echo WhatsApp: http://localhost:3002
echo API: http://localhost:3001
echo.
timeout /t 5
