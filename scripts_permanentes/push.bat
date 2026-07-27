@echo off
:: ============================================================
:: SCRIPT DE PUSH
:: Repositorio: https://github.com/PixelboxDesign/Gestao_de_trafego
:: Branch: main
:: Uso: push.bat
:: ============================================================

cd /d "f:\luna_cosmeticos"

echo [GIT] Enviando para origin/main...
git push origin main

if %ERRORLEVEL% == 0 (
    echo [OK] Push realizado com sucesso.
    echo [INFO] https://github.com/PixelboxDesign/Gestao_de_trafego
) else (
    echo [ERRO] Falha ao realizar push.
    exit /b 1
)
