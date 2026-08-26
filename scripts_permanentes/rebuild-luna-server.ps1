# Rebuild Luna Server com forcado kill de processos
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  REBUILD LUNA SERVER" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Passo 1: Matar processos
Write-Host "[1/4] Fechando processos..." -ForegroundColor Yellow
$lunaProcess = Get-Process luna-server -ErrorAction SilentlyContinue
if ($lunaProcess) {
    Write-Host "  - Fechando luna-server.exe (PID: $($lunaProcess.Id))" -ForegroundColor Gray
    Stop-Process -Name luna-server -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "  OK Processo fechado" -ForegroundColor Green
} else {
    Write-Host "  OK Nenhum processo rodando" -ForegroundColor Green
}

Write-Host ""

# Passo 2: Build do Rust
Write-Host "[2/4] Compilando backend Rust..." -ForegroundColor Yellow
Write-Host "  (Isso pode demorar 2-5 minutos)" -ForegroundColor Gray
Write-Host ""

Set-Location "f:\luna_cosmeticos\backend\src-tauri"
$buildResult = cargo build --release 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "  OK Build concluido com sucesso!" -ForegroundColor Green
} else {
    Write-Host "  ERRO no build!" -ForegroundColor Red
    Write-Host $buildResult -ForegroundColor Gray
    exit 1
}

Write-Host ""

# Passo 3: Verificar executavel
Write-Host "[3/4] Verificando executavel..." -ForegroundColor Yellow
$exePath = "f:\luna_cosmeticos\backend\src-tauri\target\release\luna-server.exe"
if (Test-Path $exePath) {
    $fileInfo = Get-Item $exePath
    Write-Host "  OK Executavel gerado:" -ForegroundColor Green
    Write-Host "     Tamanho: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Gray
    Write-Host "     Modificado: $($fileInfo.LastWriteTime)" -ForegroundColor Gray
} else {
    Write-Host "  ERRO: Executavel nao encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Passo 4: Atualizar atalho
Write-Host "[4/4] Atualizando atalho na area de trabalho..." -ForegroundColor Yellow
$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = "$Desktop\Luna Server - Painel de Controle.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $exePath
$Shortcut.WorkingDirectory = "f:\luna_cosmeticos\backend\src-tauri\target\release"
$Shortcut.Description = "Luna Server - Sistema de Catalogos com Cloudflare Tunnel"
$Shortcut.IconLocation = "$exePath,0"
$Shortcut.Save()
Write-Host "  OK Atalho atualizado!" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  CONCLUIDO!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Abra o painel usando o atalho na area de trabalho" -ForegroundColor White
Write-Host ""
