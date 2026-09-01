# Script para atualizar URL do Cloudflare no Render manualmente
$ErrorActionPreference = "Stop"

Write-Host "=== Atualização Manual do Render ===" -ForegroundColor Yellow
Write-Host ""

# Carregar URL atual do Cloudflare
$tunnelUrl = Get-Content "tunnel-url.txt" -ErrorAction Stop
Write-Host "✅ URL do Cloudflare: $tunnelUrl" -ForegroundColor Green

# Solicitar configuração do Render
Write-Host "`nInsira os dados do Render:" -ForegroundColor Cyan
$apiKey = Read-Host "API Key do Render"
$serviceId = Read-Host "Service ID"
$envVarName = Read-Host "Nome da variável (padrão: VITE_API_BASE_URL)" 

if ([string]::IsNullOrWhiteSpace($envVarName)) {
    $envVarName = "VITE_API_BASE_URL"
}

Write-Host "`n🔄 Atualizando variável '$envVarName'..." -ForegroundColor Yellow

# Atualizar variável de ambiente
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
    $response = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/env-vars" `
        -Headers $headers `
        -Method PUT `
        -Body $body

    Write-Host "✅ Variável atualizada com sucesso!" -ForegroundColor Green

    # Triggerar deploy
    Write-Host "`n🚀 Triggerando deploy..." -ForegroundColor Yellow
    
    $deployBody = @{
        clearCache = "do_not_clear"
    } | ConvertTo-Json

    $deployResponse = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys" `
        -Headers $headers `
        -Method POST `
        -Body $deployBody

    Write-Host "✅ Deploy iniciado! ID: $($deployResponse.id)" -ForegroundColor Green
    Write-Host "`n⏱️  Aguarde ~2-5 minutos para o deploy completar" -ForegroundColor Cyan
    Write-Host "🌐 Acompanhe em: https://dashboard.render.com/web/$serviceId/deploys" -ForegroundColor Cyan

} catch {
    Write-Host "❌ Erro: $_" -ForegroundColor Red
    exit 1
}
