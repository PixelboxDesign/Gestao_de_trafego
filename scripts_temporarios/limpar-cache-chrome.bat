@echo off
echo Limpando cache do Chrome...
echo.
echo [1] Fechando Chrome...
taskkill /F /IM chrome.exe 2>nul
timeout /t 2 /nobreak >nul

echo [2] Limpando arquivos de cache...
del /q /s /f "%LocalAppData%\Google\Chrome\User Data\Default\Cache\*.*" 2>nul
del /q /s /f "%LocalAppData%\Google\Chrome\User Data\Default\Code Cache\*.*" 2>nul
rd /s /q "%LocalAppData%\Google\Chrome\User Data\Default\Service Worker\CacheStorage" 2>nul

echo [3] Limpando localStorage...
del /q /f "%LocalAppData%\Google\Chrome\User Data\Default\Local Storage\*.db" 2>nul

echo.
echo ✅ Cache limpo! Abrindo site...
timeout /t 2 /nobreak >nul
start chrome "https://luna-disparo.onrender.com"
