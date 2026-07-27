@echo off
:: ============================================================
:: SCRIPT DE COMMIT + PUSH (combo)
:: Uso: commit-push.bat "mensagem do commit"
:: ============================================================

if "%~1"=="" (
    echo [ERRO] Informe a mensagem do commit.
    echo Uso: commit-push.bat "mensagem do commit"
    exit /b 1
)

cd /d "f:\luna_cosmeticos"

echo [GIT] Adicionando todos os arquivos...
git add -A

echo [GIT] Fazendo commit: %~1
git commit -m "%~1"

if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Falha ao realizar commit.
    exit /b 1
)

echo [GIT] Enviando para origin/main...
git push origin main

if %ERRORLEVEL% == 0 (
    echo [OK] Commit e push realizados com sucesso.
    echo [INFO] https://github.com/PixelboxDesign/Gestao_de_trafego
) else (
    echo [ERRO] Falha ao realizar push.
    exit /b 1
)
