@echo off
:: ============================================================
:: SCRIPT DE COMMIT
:: Uso: commit.bat "mensagem do commit"
:: ============================================================

if "%~1"=="" (
    echo [ERRO] Informe a mensagem do commit.
    echo Uso: commit.bat "mensagem do commit"
    exit /b 1
)

cd /d "f:\luna_cosmeticos"

echo [GIT] Adicionando todos os arquivos...
git add -A

echo [GIT] Fazendo commit: %~1
git commit -m "%~1"

if %ERRORLEVEL% == 0 (
    echo [OK] Commit realizado com sucesso.
) else (
    echo [ERRO] Falha ao realizar commit.
    exit /b 1
)
