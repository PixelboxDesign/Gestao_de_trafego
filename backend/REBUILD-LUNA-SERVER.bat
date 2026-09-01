@echo off
title Rebuild Luna Server - Recompilando Backend

echo.
echo ========================================
echo   Rebuild Luna Server
echo ========================================
echo.

echo [1/3] Parando processos anteriores...
taskkill /F /IM luna-server.exe >nul 2>&1
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 >nul

echo [2/3] Recompilando backend Rust/Tauri...
cd /d "%~dp0src-tauri"
cargo build --release

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   ERRO ao compilar!
    echo ========================================
    echo.
    echo Verifique os erros acima.
    pause
    exit /b 1
)

echo.
echo [3/3] Iniciando Luna Server...
cd target\release
start "" luna-server.exe

echo.
echo ========================================
echo   Luna Server recompilado e iniciado!
echo ========================================
echo.
echo API: http://localhost:3001
echo.
timeout /t 5
