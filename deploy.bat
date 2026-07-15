@echo off
echo === DEPLOY AUTOMATICO ===
cd /d f:\luna_cosmeticos\trafego_luna_cosmeticos
git add backend/routes/todos-clientes.js
git add backend/DATABASE-REFERENCE.js
git add backend/DATABASE-CATALOG.json
git add backend/DATABASE-CORRELATIONS.json
git add backend/catalog-database.js
git add catalog.bat
git commit -m "fix: corrigir queries SQL com colunas reais do banco catalogado"
git push origin main
echo === DEPLOY CONCLUIDO ===
pause
