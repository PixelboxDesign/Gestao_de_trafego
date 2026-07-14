@echo off
echo ================================================
echo  PUSH FORCADO DE TODOS OS COMMITS
echo ================================================
echo.

cd /d "F:\luna_cosmeticos\trafego_luna_cosmeticos"

echo Commits locais:
git log --oneline -8
echo.

echo Fazendo push forcado...
git push https://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@github.com/PixelboxDesign/Gestao_de_trafego.git main --force

echo.
echo Verificando no GitHub...
timeout /t 3 /nobreak >nul
git ls-remote origin main

echo.
echo ================================================
echo  CONCLUIDO!
echo ================================================
pause
