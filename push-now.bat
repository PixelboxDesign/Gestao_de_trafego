@echo off
echo ================================================
echo  FAZENDO PUSH PARA O GITHUB
echo ================================================
echo.

cd /d "F:\luna_cosmeticos\trafego_luna_cosmeticos"

echo Verificando status...
git status
echo.

echo Fazendo push...
git push https://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@github.com/PixelboxDesign/Gestao_de_trafego.git main

echo.
echo ================================================
echo  PUSH CONCLUIDO!
echo ================================================
echo.

pause
