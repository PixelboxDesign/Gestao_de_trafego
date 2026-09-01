# Script para forçar deploy no Render via API
$ErrorActionPreference = "Stop"

Write-Host "🚀 Forçando deploy no Render..." -ForegroundColor Yellow

# Você precisa da API Key do Render
# Pegue em: https://dashboard.render.com/u/settings/api-keys

$apiKey = Read-Host "Cole sua API Key do Render"
$serviceId = "srv-d9roha7avr4c739pjlu0"

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

Write-Host "`n1️⃣ Verificando serviço..." -ForegroundColor Cyan

try {
    $service = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId" -Headers $headers -Method GET
    Write-Host "✅ Serviço encontrado: $($service.service.name)" -ForegroundColor Green
    Write-Host "   Branch: $($service.service.branch)" -ForegroundColor Gray
    Write-Host "   Repo: $($service.service.repo)" -ForegroundColor Gray
    Write-Host "   Auto-deploy: $($service.service.autoDeploy)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Erro ao buscar serviço: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n2️⃣ Verificando último deploy..." -ForegroundColor Cyan

try {
    $deploys = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys?limit=5" -Headers $headers -Method GET
    Write-Host "Últimos deploys:" -ForegroundColor Gray
    $deploys | Select-Object -First 5 | ForEach-Object {
        $deploy = $_.deploy
        Write-Host "   - $($deploy.commit.id.Substring(0,7)) | $($deploy.status) | $($deploy.finishedAt)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Não foi possível buscar deploys" -ForegroundColor Yellow
}

Write-Host "`n3️⃣ Triggerando novo deploy..." -ForegroundColor Cyan

$body = @{
    clearCache = "clear"
} | ConvertTo-Json

try {
    $deploy = Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys" `
        -Headers $headers `
        -Method POST `
        -Body $body

    Write-Host "✅ Deploy iniciado!" -ForegroundColor Green
    Write-Host "   Deploy ID: $($deploy.id)" -ForegroundColor Gray
    Write-Host "   Commit: $($deploy.commit.id)" -ForegroundColor Gray
    Write-Host "`n⏱️  Aguarde 2-5 minutos..." -ForegroundColor Yellow
    Write-Host "🌐 Acompanhe: https://dashboard.render.com/web/$serviceId/deploys/$($deploy.id)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erro ao triggerar deploy: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Script concluído!" -ForegroundColor Green
Write-Host "Aguarde o deploy completar e teste: https://luna-disparo.onrender.com" -ForegroundColor Cyan
