# Script para verificar e reiniciar o backend do Luna

Write-Host "`n=== VERIFICANDO BACKEND LUNA ===" -ForegroundColor Cyan
Write-Host ""

# 1. Verifica se o Node está rodando na porta 3000
Write-Host "[1/4] Verificando se o backend está rodando na porta 3000..." -ForegroundColor Yellow
$processo3000 = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if ($processo3000) {
    Write-Host "  ✓ Backend está RODANDO na porta 3000" -ForegroundColor Green
    $pid = $processo3000.OwningProcess
    $processInfo = Get-Process -Id $pid -ErrorAction SilentlyContinue
    Write-Host "  → Processo: $($processInfo.ProcessName) (PID: $pid)" -ForegroundColor Gray
} else {
    Write-Host "  ✗ Backend NÃO está rodando na porta 3000" -ForegroundColor Red
    Write-Host "  → Você precisa iniciar o backend primeiro!" -ForegroundColor Yellow
}

# 2. Verifica se o Cloudflare tunnel está ativo
Write-Host "`n[2/4] Verificando túnel Cloudflare..." -ForegroundColor Yellow
$cloudflaredProcessos = Get-Process -Name "cloudflared" -ErrorAction SilentlyContinue

if ($cloudflaredProcessos) {
    Write-Host "  ✓ Cloudflare Tunnel está ATIVO" -ForegroundColor Green
    Write-Host "  → $($cloudflaredProcessos.Count) processo(s) rodando" -ForegroundColor Gray
} else {
    Write-Host "  ✗ Cloudflare Tunnel NÃO está ativo" -ForegroundColor Red
}

# 3. Testa a URL do Cloudflare
Write-Host "`n[3/4] Testando conexão com Cloudflare..." -ForegroundColor Yellow
$cloudflareUrl = "https://shield-required-enjoy-trained.trycloudflare.com/health"

try {
    $response = Invoke-WebRequest -Uri $cloudflareUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✓ URL Cloudflare está ACESSÍVEL" -ForegroundColor Green
    Write-Host "  → Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ URL Cloudflare INACESSÍVEL" -ForegroundColor Red
    Write-Host "  → Erro: $($_.Exception.Message)" -ForegroundColor Gray
}

# 4. Testa localhost diretamente
Write-Host "`n[4/4] Testando conexão com localhost:3000..." -ForegroundColor Yellow
$localhostUrl = "http://localhost:3000/health"

try {
    $response = Invoke-WebRequest -Uri $localhostUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✓ Backend local está RESPONDENDO" -ForegroundColor Green
    Write-Host "  → Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ Backend local NÃO responde" -ForegroundColor Red
    Write-Host "  → Erro: $($_.Exception.Message)" -ForegroundColor Gray
}

# Resumo e instruções
Write-Host "`n=== RESUMO ===" -ForegroundColor Cyan

if (-not $processo3000) {
    Write-Host "`n⚠️  AÇÃO NECESSÁRIA: Inicie o backend" -ForegroundColor Yellow
    Write-Host "Execute:" -ForegroundColor White
    Write-Host "  cd f:\luna_cosmeticos\backend" -ForegroundColor Gray
    Write-Host "  node server.js" -ForegroundColor Gray
}

if (-not $cloudflaredProcessos) {
    Write-Host "`n⚠️  AÇÃO NECESSÁRIA: Inicie o Cloudflare Tunnel" -ForegroundColor Yellow
    Write-Host "Execute em OUTRO terminal:" -ForegroundColor White
    Write-Host "  cloudflared tunnel --url http://localhost:3000" -ForegroundColor Gray
}

Write-Host "`n"
