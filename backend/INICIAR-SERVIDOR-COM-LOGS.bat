@echo off
echo ===================================
echo  INICIANDO SERVIDOR COM LOGS
echo ===================================
echo.
cd src-tauri
echo Logs sendo salvos em: logs-backend.txt
.\target\release\luna-server.exe 2>&1 | tee logs-backend.txt
pause
