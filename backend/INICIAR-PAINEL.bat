@echo off
cd /d "f:\luna_cosmeticos\backend\src-tauri\target\debug"
start "Luna HTTP Server" /B .\luna-server.exe --server-only
timeout /t 3 /nobreak >nul
start "Luna Painel" .\luna-server.exe
