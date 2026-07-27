@echo off
:: ============================================================
:: SCRIPT DE AMEND
:: Corrige o ultimo commit (mensagem ou arquivos)
:: Uso: amend.bat "nova mensagem"  -> altera mensagem
::      amend.bat                  -> mantém mensagem, adiciona arquivos staged
:: ============================================================

cd /d "f:\luna_cosmeticos"

if "%~1"=="" (
    echo [GIT] Amend sem alterar mensagem...
    git add -A
    git commit --amend --no-edit
) else (
    echo [GIT] Amend com nova mensagem: %~1
    git add -A
    git commit --amend -m "%~1"
)

if %ERRORLEVEL% == 0 (
    echo [OK] Amend realizado. Lembre de usar push --force se ja fez push antes.
) else (
    echo [ERRO] Falha ao realizar amend.
    exit /b 1
)
