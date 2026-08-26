Write-Host "🔍 Buscando URL do Cloudflare Tunnel..." -ForegroundColor Cyan
Write-Host ""

$response = Invoke-WebRequest -Uri "http://127.0.0.1:2000/metrics" -UseBasicParsing -TimeoutSec 5 -ErrorAction SilentlyContinue

if ($response) {
    $content = $response.Content
    
    if ($content -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
        $url = $matches[0]
        Write-Host "✅ URL encontrada!" -ForegroundColor Green
        Write-Host ""
        Write-Host $url -ForegroundColor White
        Write-Host ""
        
        $url | Out-File -FilePath "f:\luna_cosmeticos\backend\tunnel-url.txt" -Encoding UTF8 -NoNewline
        Write-Host "💾 Salva em: backend\tunnel-url.txt" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ URL não encontrada nas métricas" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Não foi possível acessar http://127.0.0.1:2000/metrics" -ForegroundColor Red
    Write-Host "   Verifique se o cloudflared está rodando" -ForegroundColor Gray
}
