@echo off
title Deploy Disparo Config

echo.
echo ========================================
echo   DEPLOY DISPARO CONFIG
echo ========================================
echo.
echo Este script vai:
echo   1. Criar tabela no MySQL
echo   2. Recompilar Luna Server
echo   3. Iniciar Luna Server
echo.
pause

echo.
echo [ETAPA 1/3] Criando tabela no MySQL...
echo.

cd /d "%~dp0"
node criar-tabela-disparo-config.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERRO ao criar tabela no MySQL!
    echo Verifique se Node.js esta instalado.
    echo.
    pause
    exit /b 1
)

echo.
echo [ETAPA 2/3] Parando processos anteriores...
echo.

taskkill /F /IM luna-server.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo [ETAPA 3/3] Recompilando Luna Server...
echo.
echo Isso pode levar alguns minutos. Aguarde...
echo.

cd /d "%~dp0src-tauri"
cargo build --release

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   ERRO ao compilar!
    echo ========================================
    echo.
    pause
    exit /b 1
)

echo.
echo Compilacao concluida!
echo.
echo Iniciando Luna Server...

cd target\release
start "" luna-server.exe

timeout /t 3 >nul

echo.
echo ========================================
echo   DEPLOY CONCLUIDO!
echo ========================================
echo.
echo Luna Server: http://localhost:3001
echo.
echo Teste agora:
echo   1. Acesse http://localhost:3001
echo   2. Configure o disparo
echo   3. Clique em "Salvar Configuracao"
echo   4. Recarregue (F5)
echo.
echo ========================================
echo.

timeout /t 10
