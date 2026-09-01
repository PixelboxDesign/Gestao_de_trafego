@echo off
chcp 65001 >nul
title Setup Disparo Config - Criar Tabela + Rebuild Server

echo.
echo ════════════════════════════════════════════════════════════════
echo   SETUP DISPARO CONFIG - Etapa 1: Criar Tabela MySQL
echo ════════════════════════════════════════════════════════════════
echo.

echo ⚠️  IMPORTANTE: Você precisa criar a tabela no banco de dados!
echo.
echo 📋 Instruções:
echo.
echo 1. Acesse: http://vps.hawktecnologia.com/phpmyadmin
echo 2. Usuário: hawktec_alpha_log
echo 3. Senha: Alpha@3030
echo 4. Selecione o banco de dados: hawktec_alpha_log
echo 5. Clique em "SQL" no menu superior
echo 6. Cole e execute o SQL abaixo:
echo.
echo ────────────────────────────────────────────────────────────────
type "%~dp0sql\create_app_disparo_config.sql"
echo ────────────────────────────────────────────────────────────────
echo.
echo ✅ Após criar a tabela, pressione qualquer tecla para continuar...
pause >nul

echo.
echo ════════════════════════════════════════════════════════════════
echo   SETUP DISPARO CONFIG - Etapa 2: Rebuild Luna Server
echo ════════════════════════════════════════════════════════════════
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
    echo ════════════════════════════════════════════════════════════════
    echo   ❌ ERRO ao compilar!
    echo ════════════════════════════════════════════════════════════════
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
echo ════════════════════════════════════════════════════════════════
echo   ✅ SETUP CONCLUÍDO COM SUCESSO!
echo ════════════════════════════════════════════════════════════════
echo.
echo 🚀 Luna Server está rodando em: http://localhost:3001
echo.
echo 📝 Rotas disponíveis:
echo    - POST /api/disparos/config - Salvar configuração
echo    - GET  /api/disparos/config - Carregar configuração
echo.
echo Aguardando 5 segundos antes de fechar...
timeout /t 5
