@echo off
chcp 65001 >nul
title Deploy Completo - Disparo Config

echo.
echo ════════════════════════════════════════════════════════════════
echo   🚀 DEPLOY COMPLETO - DISPARO CONFIG
echo ════════════════════════════════════════════════════════════════
echo.
echo Este script vai:
echo   1. Criar tabela app_disparo_config no MySQL
echo   2. Recompilar Luna Server com novas rotas
echo   3. Iniciar Luna Server
echo.
echo ════════════════════════════════════════════════════════════════
echo.

pause

echo.
echo ┌────────────────────────────────────────────────────────────────┐
echo │ ETAPA 1/3: Criando tabela no MySQL                            │
echo └────────────────────────────────────────────────────────────────┘
echo.

cd /d "%~dp0"
node criar-tabela-disparo-config.js

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ ERRO ao criar tabela no MySQL!
    echo.
    echo Verifique:
    echo   - Arquivo .env existe e tem credenciais corretas
    echo   - Servidor MySQL está acessível
    echo   - Node.js está instalado
    echo.
    pause
    exit /b 1
)

echo.
echo ┌────────────────────────────────────────────────────────────────┐
echo │ ETAPA 2/3: Parando processos anteriores                       │
echo └────────────────────────────────────────────────────────────────┘
echo.

taskkill /F /IM luna-server.exe >nul 2>&1
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Luna*" >nul 2>&1
echo ✅ Processos parados
timeout /t 2 >nul

echo.
echo ┌────────────────────────────────────────────────────────────────┐
echo │ ETAPA 3/3: Recompilando e iniciando Luna Server               │
echo └────────────────────────────────────────────────────────────────┘
echo.

cd /d "%~dp0src-tauri"

echo 📦 Compilando backend Rust...
echo    (Isso pode levar alguns minutos)
echo.

cargo build --release

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ════════════════════════════════════════════════════════════════
    echo   ❌ ERRO ao compilar backend!
    echo ════════════════════════════════════════════════════════════════
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Compilação concluída!
echo.
echo 🚀 Iniciando Luna Server...

cd target\release
start "" luna-server.exe

timeout /t 3 >nul

echo.
echo ════════════════════════════════════════════════════════════════
echo   ✅ DEPLOY CONCLUÍDO COM SUCESSO!
echo ════════════════════════════════════════════════════════════════
echo.
echo 🌐 Luna Server: http://localhost:3001
echo 📡 Health Check: http://localhost:3001/health
echo.
echo 📝 Rotas de configuração disponíveis:
echo    - POST /api/disparos/config - Salvar configuração
echo    - GET  /api/disparos/config - Carregar configuração
echo.
echo 🎯 Teste agora:
echo    1. Acesse: http://localhost:3001
echo    2. Configure o disparo
echo    3. Clique em "💾 Salvar Configuração"
echo    4. Recarregue a página (F5)
echo    5. Verifique se a configuração foi restaurada
echo.
echo ════════════════════════════════════════════════════════════════
echo.

timeout /t 10
