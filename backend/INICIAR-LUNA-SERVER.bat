@echo off
chcp 65001 >nul
title Luna Server - Painel de Controle
color 0A

echo.
echo ═══════════════════════════════════════════════════
echo    🌙 LUNA SERVER - PAINEL DE CONTROLE
echo ═══════════════════════════════════════════════════
echo.
echo ⏳ Iniciando servidor...
echo.

cd /d "%~dp0src-tauri\target\release"
start "" "luna-server.exe"

timeout /t 2 /nobreak >nul

echo ✅ Servidor iniciado com sucesso!
echo.
echo 📌 O painel será aberto automaticamente
echo 📌 Você pode fechar esta janela
echo.
timeout /t 3 /nobreak >nul
exit
