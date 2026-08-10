@echo off
echo ========================================
echo   Cloudflare Tunnel - Setup Luna Server
echo ========================================
echo.
echo Este script vai:
echo 1. Instalar cloudflared (se nao estiver instalado)
echo 2. Fazer login na sua conta Cloudflare
echo 3. Criar um tunel chamado "luna-server"
echo 4. Expor a porta 3001 publicamente
echo.
pause

echo.
echo [1/3] Verificando cloudflared...
where cloudflared >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo cloudflared nao encontrado. Instalando via winget...
    winget install --id Cloudflare.cloudflared -e
    if %ERRORLEVEL% NEQ 0 (
        echo ERRO: Falha ao instalar cloudflared
        pause
        exit /b 1
    )
) else (
    echo cloudflared ja instalado
)

echo.
echo [2/3] Fazendo login na Cloudflare...
echo Uma janela do browser vai abrir. Faca login e autorize.
cloudflared tunnel login
if %ERRORLEVEL% NEQ 0 (
    echo ERRO: Falha no login
    pause
    exit /b 1
)

echo.
echo [3/3] Criando tunnel 'luna-server'...
cloudflared tunnel create luna-server
if %ERRORLEVEL% NEQ 0 (
    echo Tunnel pode ja existir. Continuando...
)

echo.
echo ========================================
echo   Setup concluido!
echo ========================================
echo.
echo Proximo passo:
echo 1. Copie o UUID do tunnel que apareceu acima
echo 2. Execute: cloudflared tunnel route dns luna-server luna.seudominio.com
echo 3. Ou me passe o UUID e eu configuro o resto
echo.
pause
