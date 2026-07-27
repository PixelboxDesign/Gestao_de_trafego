@echo off
:: ============================================================
:: SCRIPT DE STATUS
:: Mostra estado atual do repositorio
:: Uso: status.bat
:: ============================================================

cd /d "f:\luna_cosmeticos"

echo [GIT] Status do repositorio:
echo ============================================================
git status
echo ============================================================
echo [GIT] Ultimos 5 commits:
git log --oneline -5
