@echo off
cd /d "F:\luna_cosmeticos\trafego_luna_cosmeticos"
git add frontend/package.json
git commit -m "fix: mover Vite para dependencies para build no Render"
git push origin main
echo.
echo ========================================
echo PUSH CONCLUIDO COM SUCESSO!
echo ========================================
pause
