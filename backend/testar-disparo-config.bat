@echo off
chcp 65001 >nul
title Teste Disparo Config

echo.
echo ========================================
echo   TESTE DISPARO CONFIG
echo ========================================
echo.

echo [1] Testando health check...
curl -s http://localhost:3001/health
echo.
echo.

echo [2] Testando rota GET config...
curl -s http://localhost:3001/api/disparos/config
echo.
echo.

echo [3] Testando rota POST config...
curl -s -X POST http://localhost:3001/api/disparos/config -H "Content-Type: application/json" -d "{\"mensagem\":\"Teste automatico\",\"item_id\":1,\"item_tipo\":\"produto\",\"item_nome\":\"Produto Teste\",\"quantidade\":10,\"intervalo_valor\":1.0,\"intervalo_unidade\":\"horas\"}"
echo.
echo.

echo [4] Verificando se salvou...
curl -s http://localhost:3001/api/disparos/config
echo.
echo.

echo ========================================
echo   TESTE CONCLUIDO
echo ========================================
echo.
pause
