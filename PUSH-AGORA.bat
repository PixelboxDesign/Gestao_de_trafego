@echo off
chcp 65001 > nul
cd /d "f:\luna_cosmeticos\trafego_luna_cosmeticos"
echo.
echo === FAZENDO COMMIT E PUSH ===
echo.
git add .
git commit -m "fix: corrigir queries SQL com colunas reais do banco"
git push origin main
echo.
echo === CONCLUIDO ===
echo.
pause
