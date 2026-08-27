@echo off
echo Copiando WhatsApp sidecar para diretorio do executavel...

set RELEASE_DIR=src-tauri\target\release
set SIDECAR_SRC=whatsapp-sidecar
set SIDECAR_DEST=%RELEASE_DIR%\whatsapp-sidecar

REM Cria diretorio se nao existir
if not exist "%SIDECAR_DEST%" mkdir "%SIDECAR_DEST%"

REM Copia arquivos do sidecar
xcopy /Y /E /I "%SIDECAR_SRC%\*" "%SIDECAR_DEST%\"

echo Sidecar copiado com sucesso!
