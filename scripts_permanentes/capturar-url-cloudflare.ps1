# Captura URL do Cloudflare Tunnel
Write-Host "🔍 Buscando URL do Cloudflare Tunnel..." -ForegroundColor Cyan

# Tenta via API de métricas (porta 2000)
$metrics = Invoke-WebRequest -Uri "http://127.0.0.1:2000/metrics" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue

if ($metrics) {
    $content = $metrics.Content
    
    # Procura pela URL no conteúdo
    if ($content -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
        $url = $matches[0]
        Write-Host "✅ URL encontrada: $url" -ForegroundColor Green
        Write-Host ""
        Write-Host "📋 Para copiar: Set-Clipboard '$url'" -ForegroundColor Yellow
        
        # Salva em arquivo
        $url | Out-File -FilePath "f:\luna_cosmeticos\backend\tunnel-url.txt" -Encoding UTF8 -NoNewline
        Write-Host "💾 URL salva em: backend\tunnel-url.txt" -ForegroundColor Green
        Write-Host ""
        Write-Host $url
        exit 0
    }
} else {
    Write-Host "⚠️ API de métricas não respondeu (porta 2000)" -ForegroundColor Yellow
}

# Fallback: procura nos processos cloudflared
Write-Host "🔄 Tentando via linha de comando dos processos..." -ForegroundColor Cyan
$processes = Get-Process cloudflared -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "✅ Encontrados $($processes.Count) processos cloudflared rodando" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 A URL deve aparecer no painel Luna automaticamente." -ForegroundColor Cyan
    Write-Host "   Se não aparecer, reinicie o painel Luna Server." -ForegroundColor Gray
} else {
    Write-Host "❌ Nenhum processo cloudflared encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "🚀 Iniciando Cloudflare Tunnel..." -ForegroundColor Yellow
    Start-Process cloudflared -ArgumentList "tunnel","--url","http://localhost:3001" -NoNewWindow
    Start-Sleep -Seconds 5
    Write-Host "✅ Cloudflare Tunnel iniciado! Execute este script novamente para pegar a URL." -ForegroundColor Green
}
