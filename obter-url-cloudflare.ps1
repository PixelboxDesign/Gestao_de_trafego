Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  OBTER URL DO CLOUDFLARE TUNNEL" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Verifica se cloudflared esta rodando
$processes = Get-Process cloudflared -ErrorAction SilentlyContinue
if (-not $processes) {
    Write-Host "ERRO: Nenhum processo cloudflared encontrado!" -ForegroundColor Red
    Write-Host "Execute primeiro: cloudflared tunnel --url http://localhost:3001" -ForegroundColor Yellow
    exit 1
}

Write-Host "Processos cloudflared encontrados: $($processes.Count)" -ForegroundColor Green
Write-Host ""

# Inicia um NOVO cloudflared temporario com output redirecionado
Write-Host "Iniciando cloudflared temporario para capturar URL..." -ForegroundColor Yellow

$tempLog = "$env:TEMP\cloudflare-temp-$(Get-Random).log"
$proc = Start-Process cloudflared -ArgumentList "tunnel","--url","http://localhost:3001" -RedirectStandardError $tempLog -NoNewWindow -PassThru

Write-Host "Aguardando URL ser gerada (10 segundos)..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Le o log e busca URL
if (Test-Path $tempLog) {
    $content = Get-Content $tempLog -Raw -ErrorAction SilentlyContinue
    
    if ($content -and ($content -match '(https://[a-z0-9-]+\.trycloudflare\.com)')) {
        $url = $matches[1]
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  URL ENCONTRADA!" -ForegroundColor Green  
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host $url -ForegroundColor White
        Write-Host ""
        
        # Salva em arquivo
        $url | Out-File -FilePath "f:\luna_cosmeticos\backend\tunnel-url.txt" -Encoding UTF8 -NoNewline
        Write-Host "URL salva em: backend\tunnel-url.txt" -ForegroundColor Gray
        Write-Host ""
        
        # Copia para clipboard
        Set-Clipboard $url
        Write-Host "URL copiada para area de transferencia!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Agora va ao painel Luna e clique em:" -ForegroundColor Yellow
        Write-Host "  'Recarregar URL Manualmente'" -ForegroundColor White
        
        # Mata o processo temporario
        Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        
    } else {
        Write-Host "URL ainda nao foi gerada. Aguardando mais 10 segundos..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        $content = Get-Content $tempLog -Raw -ErrorAction SilentlyContinue
        if ($content -and ($content -match '(https://[a-z0-9-]+\.trycloudflare\.com)')) {
            $url = $matches[1]
            Write-Host ""
            Write-Host "URL ENCONTRADA: $url" -ForegroundColor Green
            $url | Out-File -FilePath "f:\luna_cosmeticos\backend\tunnel-url.txt" -Encoding UTF8 -NoNewline
            Set-Clipboard $url
            Write-Host "URL salva e copiada!" -ForegroundColor Green
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        } else {
            Write-Host ""
            Write-Host "ERRO: Nao foi possivel capturar URL" -ForegroundColor Red
            Write-Host "Log temporario: $tempLog" -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
    }
    
    # Limpa log temporario
    Remove-Item $tempLog -Force -ErrorAction SilentlyContinue
    
} else {
    Write-Host "ERRO: Log temporario nao foi criado" -ForegroundColor Red
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
}

Write-Host ""
