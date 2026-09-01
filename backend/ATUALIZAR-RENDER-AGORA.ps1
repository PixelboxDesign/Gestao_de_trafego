# Script RÁPIDO para atualizar Render
$ErrorActionPreference = "Stop"

Write-Host "=== ATUALIZAÇÃO RÁPIDA DO RENDER ===" -ForegroundColor Cyan
Write-Host ""

# URL do Cloudflare
$tunnelUrl = "https://express-zip-manga-shopper.trycloudflare.com"
Write-Host "✅ URL do Cloudflare: $tunnelUrl" -ForegroundColor Green

# Configuração do Render (FIXO)
$serviceId = "srv-d9roha7avr4c739pjlu0"
$envVarName = "VITE_API_BASE_URL"

# Pedir apenas a API Key
Write-Host "`n🔑 Cole sua API Key do Render:" -ForegroundColor Yellow
Write-Host "(Pegue em: https://dashboard.render.com/u/settings/api-keys)" -ForegroundColor Gray
$apiKey = Read-Host "API Key"

if ([string]::IsNullOrWhiteSpace($apiKey)) {
    Write-Host "❌ API Key não pode ser vazia!" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔄 Atualizando variável '$envVarName'..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

$body = @(
    @{
        key = $envVarName
        value = $tunnelUrl
    }
) | ConvertTo-Json

try {
    Write-Host "📡 Enviando para Render..." -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/env-vars" `
        -Headers $headers `
        -Method PUT `
        -Body $body

    Write-Host "✅ Variável atualizada!" -ForegroundColor Green

    # Triggerar deploy
    Write-Host "`n🚀 Iniciando deploy..." -ForegroundColor Yellow
    
    $deployBody = @{
        clearCache = "do_not_clear"
    } | ConvertTo-Json

    $deployResponse = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys" `
        -Headers $headers `
        -Method POST `
        -Body $deployBody

    Write-Host "✅ Deploy iniciado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "⏱️  Aguarde ~2-5 minutos" -ForegroundColor Cyan
    Write-Host "🌐 Acompanhe: https://dashboard.render.com/web/$serviceId/deploys" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Quando terminar, acesse: https://luna-disparo.onrender.com" -ForegroundColor Yellow

} catch {
    Write-Host ""
    Write-Host "❌ ERRO:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "1. API Key inválida" -ForegroundColor Gray
    Write-Host "2. Service ID incorreto" -ForegroundColor Gray
    Write-Host "3. Sem permissão para modificar o serviço" -ForegroundColor Gray
    exit 1
}
