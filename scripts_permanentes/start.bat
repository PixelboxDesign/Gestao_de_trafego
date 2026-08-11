@echo off
REM Inicia Luna Server (versão release otimizada)
REM Se o executável não existir, roda o build primeiro

if not exist "f:\luna_cosmeticos\backend\src-tauri\target\release\luna-server.exe" (
    echo Executavel nao encontrado. Rodando build...
    call f:\luna_cosmeticos\scripts_permanentes\build.bat
)

cd /d "f:\luna_cosmeticos\backend\src-tauri"
start "" "f:\luna_cosmeticos\backend\src-tauri\target\release\luna-server.exe"
