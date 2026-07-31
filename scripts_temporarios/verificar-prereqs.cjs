/**
 * verificar-prereqs.cjs
 * Verifica e guia a instalação de todos os pré-requisitos para o Tauri Server.
 *
 * Uso: node scripts_temporarios/verificar-prereqs.cjs
 */

const { execSync } = require('child_process');
const https = require('https');
const fs    = require('fs');

// ── helpers ───────────────────────────────────────────────────────────────────
function cmd(command) {
  try {
    return execSync(command, { encoding: 'utf-8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

function ok(label, value)   { console.log(`  ✅ ${label}: ${value}`); }
function fail(label, hint)  { console.log(`  ❌ ${label} — NÃO ENCONTRADO`); if (hint) console.log(`     👉 ${hint}`); }
function warn(label, msg)   { console.log(`  ⚠️  ${label}: ${msg}`); }
function section(title)     { console.log(`\n${'─'.repeat(55)}\n  ${title}\n${'─'.repeat(55)}`); }

// ── verificações ──────────────────────────────────────────────────────────────
function checkNode() {
  section('1. Node.js');
  const v = cmd('node --version');
  if (v) {
    const major = parseInt(v.replace('v', '').split('.')[0]);
    if (major >= 20) ok('Node.js', v);
    else warn('Node.js', `${v} — versão mínima recomendada: v20 LTS`);
  } else {
    fail('Node.js', 'Baixar em: https://nodejs.org/en/download');
  }

  const npm = cmd('npm --version');
  if (npm) ok('npm', `v${npm}`);
}

function checkRust() {
  section('2. Rust + Cargo');
  const rustc = cmd('rustc --version');
  const cargo = cmd('cargo --version');

  if (rustc) ok('rustc', rustc);
  else fail('rustc', 'Instalar via: https://rustup.rs  (executar rustup-init.exe)');

  if (cargo) ok('cargo', cargo);
  else fail('cargo', 'Instalado junto com rustc via rustup');

  if (!rustc) {
    console.log('\n  📋 Passos para instalar o Rust no Windows:');
    console.log('     1. Acesse: https://rustup.rs');
    console.log('     2. Baixe e execute o rustup-init.exe');
    console.log('     3. Escolha a instalação padrão (opção 1)');
    console.log('     4. Reinicie o terminal após a instalação');
  }
}

function checkTauriCli() {
  section('3. Tauri CLI');
  const tauri = cmd('cargo tauri --version');
  if (tauri) {
    ok('tauri-cli', tauri);
  } else {
    fail('tauri-cli', 'Após instalar Rust, executar: cargo install tauri-cli');
    console.log('\n  📋 Comando para instalar:');
    console.log('     cargo install tauri-cli');
  }
}

function checkWebView2() {
  section('4. WebView2 (Windows)');
  // Verificar no registro do Windows
  const reg = cmd('reg query "HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv 2>nul');
  if (reg && reg.includes('pv')) {
    ok('WebView2', 'Instalado (Evergreen)');
  } else {
    // Windows 11 já tem embutido
    const winVer = cmd('ver');
    if (winVer && winVer.includes('11')) {
      ok('WebView2', 'Windows 11 — já incluído no sistema');
    } else {
      warn('WebView2', 'Verificação inconclusiva. Se falhar ao rodar, baixar em:');
      console.log('     https://developer.microsoft.com/microsoft-edge/webview2');
    }
  }
}

function checkVSBuildTools() {
  section('5. Visual Studio Build Tools (compilação C++)');
  // Verificar se cl.exe está disponível (compilador MSVC)
  const cl = cmd('where cl 2>nul');
  if (cl) {
    ok('MSVC (cl.exe)', cl.split('\n')[0]);
  } else {
    // Verificar via vswhere
    const vswhere = cmd('"C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>nul');
    if (vswhere) {
      ok('VS Build Tools', vswhere.split('\n')[0]);
    } else {
      fail('VS Build Tools', 'Baixar em: https://visualstudio.microsoft.com/visual-cpp-build-tools/');
      console.log('\n  📋 Durante a instalação, selecionar:');
      console.log('     ✓ "Desenvolvimento para Desktop com C++"');
      console.log('     (apenas esse componente é suficiente)');
    }
  }
}

function checkGit() {
  section('6. Git');
  const git = cmd('git --version');
  if (git) ok('Git', git);
  else fail('Git', 'Baixar em: https://git-scm.com/download/win');
}

function checkNpmDeps() {
  section('7. Dependências npm do backend');
  const nodeModules = 'f:\\luna_cosmeticos\\backend\\node_modules';
  if (fs.existsSync(nodeModules)) {
    ok('node_modules', 'Instalados');
  } else {
    warn('node_modules', 'NÃO instalados');
    console.log('     👉 Executar: cd backend && npm install');
  }
}

// ── resumo final ──────────────────────────────────────────────────────────────
function resumo() {
  const rustOk  = !!cmd('rustc --version');
  const nodeOk  = !!cmd('node --version');
  const tauriOk = !!cmd('cargo tauri --version');
  const nmOk    = fs.existsSync('f:\\luna_cosmeticos\\backend\\node_modules');

  section('RESUMO');
  console.log(`  Node.js:     ${nodeOk  ? '✅ OK' : '❌ Instalar'}`);
  console.log(`  Rust:        ${rustOk  ? '✅ OK' : '❌ Instalar — https://rustup.rs'}`);
  console.log(`  Tauri CLI:   ${tauriOk ? '✅ OK' : '❌ cargo install tauri-cli'}`);
  console.log(`  npm deps:    ${nmOk    ? '✅ OK' : '❌ cd backend && npm install'}`);

  if (rustOk && nodeOk && tauriOk && nmOk) {
    console.log('\n  🎉 TUDO PRONTO! Para iniciar o servidor em modo dev:');
    console.log('     cd backend');
    console.log('     npm run tauri dev');
  } else {
    console.log('\n  ⚠️  Instale os itens marcados com ❌ e rode este script novamente.');
  }
  console.log('');
}

// ── main ──────────────────────────────────────────────────────────────────────
console.log('\n🌙 Luna Server — Verificação de Pré-Requisitos\n');
checkNode();
checkRust();
checkTauriCli();
checkWebView2();
checkVSBuildTools();
checkGit();
checkNpmDeps();
resumo();
