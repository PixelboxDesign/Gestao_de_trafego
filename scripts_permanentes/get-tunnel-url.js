/**
 * GET TUNNEL URL
 * Captura a URL pública do Cloudflare Tunnel
 */

const { spawn } = require('child_process');

console.log('🔍 Buscando URL do Cloudflare Tunnel...\n');

// Busca processo cloudflared
const process = spawn('netstat', ['-ano']);
let output = '';

process.stdout.on('data', (data) => {
  output += data.toString();
});

process.on('close', () => {
  // Procura porta 3001 (nossa API)
  const lines = output.split('\n');
  const tunnelLine = lines.find(line => line.includes(':3001') && line.includes('LISTENING'));
  
  if (tunnelLine) {
    console.log('✅ Cloudflare Tunnel detectado rodando!\n');
    console.log('📋 Para acessar o site, você precisa da URL do tunnel.');
    console.log('   Execute no PowerShell:\n');
    console.log('   cloudflared tunnel list\n');
    console.log('💡 OU acesse o painel localmente:\n');
    console.log('   http://localhost:3001\n');
  } else {
    console.log('❌ Cloudflare Tunnel não está rodando.');
    console.log('   Inicie o painel Luna Server primeiro!\n');
  }
});

process.stderr.on('data', (data) => {
  console.error('Erro:', data.toString());
});
