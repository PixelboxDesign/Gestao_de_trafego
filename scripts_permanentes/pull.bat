@echo off
:: ============================================================
:: SCRIPT DE PULL / SYNC
:: Sincroniza com origin/main
:: Uso: pull.bat
:: ============================================================

cd /d "f:\luna_cosmeticos"

echo [GIT] Puxando atualizacoes de origin/main...
git pull origin main

if %ERRORLEVEL% == 0 (
    echo [OK] Repositorio sincronizado com sucesso.
) else (
    echo [ERRO] Falha ao sincronizar. Verifique conflitos.
    exit /b 1
)
