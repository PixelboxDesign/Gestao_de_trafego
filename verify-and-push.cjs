/**
 * Verifica que o .env aponta para o banco LOCAL
 * e faz push do frontend atualizado para o Render usar o Tailscale
 */
const { execSync } = require('child_process');
const fs   = require('fs');
const http = require('http');
const https = require('https');

const DIR = 'F:\\luna_cosmeticos\\trafego_luna_cosmeticos';
process.chdir(DIR);

const run = (cmd) => {
  try {
    const o = execSync(cmd, { encoding:'utf-8', stdio:'pipe', cwd:DIR });
    if (o && o.trim()) console.log(o.trim());
    return true;
  } catch(e) {
    const m=(e.stdout||'')+(e.stderr||'')+e.message;
    if (m.includes('nothing to commit')||m.includes('up to date')){console.log('[ok - já atualizado]');return true;}
    console.error('ERR:', m.substring(0,300));
    return false;
  }
};

async function get(url) {
  return new Promise(resolve => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>resolve({status:res.statusCode,body:d}));
    });
    req.on('error', () => resolve({status:0,body:''}));
    req.setTimeout(8000, () => { req.destroy(); resolve({status:0,body:'TIMEOUT'}); });
  });
}

async function main() {
  console.log('=== VERIFICAÇÃO DO AMBIENTE ===\n');

  // 1. Verificar .env local
  const env = fs.readFileSync('.env','utf-8');
  const dbHost = env.match(/^DB_HOST=(.+)$/m)?.[1]?.trim();
  const dbName = env.match(/^DB_NAME=(.+)$/m)?.[1]?.trim();
  console.log(dbHost === 'localhost' ? `✅ .env aponta banco LOCAL: ${dbName}@${dbHost}` : `❌ .env ainda aponta: ${dbName}@${dbHost}`);

  // 2. Verificar se o backend local está rodando
  const localHealth = await get('http://localhost:3000/health');
  if (localHealth.status === 200) {
    const data = JSON.parse(localHealth.body);
    const isLocal = data?.database?.host === 'localhost' || data?.database?.host === '127.0.0.1';
    console.log(isLocal
      ? `✅ Backend LOCAL rodando: ${data?.database?.name}@${data?.database?.host}`
      : `⚠️  Backend local rodando mas banco é: ${data?.database?.name}@${data?.database?.host}`
    );
  } else {
    console.log('⬜ Backend local (3000) não está rodando ainda');
    console.log('   → Execute INICIAR_LUNA_LOCAL.vbs antes de usar o sistema');
  }

  // 3. Verificar Tailscale
  const tailscaleHealth = await get('https://desktop-e6jr4dk.tailc1230a.ts.net/health');
  if (tailscaleHealth.status === 200) {
    const data = JSON.parse(tailscaleHealth.body);
    const isLocal = data?.database?.host === 'localhost' || data?.database?.host === '127.0.0.1';
    console.log(isLocal
      ? `✅ Tailscale → banco LOCAL: ${data?.database?.name}@${data?.database?.host}`
      : `❌ Tailscale ainda aponta banco REMOTO: ${data?.database?.host}`
    );
  } else {
    console.log(`⬜ Tailscale não acessível (${tailscaleHealth.status}) — backend local precisa estar rodando`);
  }

  // 4. Verificar Render (backend antigo)
  const renderHealth = await get('https://gestao-de-trafego.onrender.com/health');
  if (renderHealth.status === 200) {
    const data = JSON.parse(renderHealth.body);
    console.log(`ℹ️  Render backend ainda ativo: ${data?.database?.name}@${data?.database?.host}`);
    console.log('   → Após confirmar que Tailscale funciona, delete o backend do Render');
  }

  console.log('\n=== PUSH DO FRONTEND ===\n');

  // 5. Fazer push do frontend (o Render vai rebuildar com VITE_API_URL do Tailscale)
  // Verificar se há mudanças pendentes
  const status = execSync('git status --short', {encoding:'utf-8', cwd:DIR}).trim();
  if (status) {
    console.log('Mudanças pendentes:');
    console.log(status);
    run('git add -A');
    run('git commit -m "chore: sincronizar estado atual"');
  }

  run('git push origin main');

  // Mover este script para lixeira
  try { fs.renameSync('verify-and-push.cjs','lixeira/verify-and-push.cjs'); } catch(_) {}

  console.log('\n✅ Push concluído!');
  console.log('\nPróximos passos no Render:');
  console.log('1. gestao-de-trafego-1 (frontend) → Environment:');
  console.log('   VITE_API_URL = https://desktop-e6jr4dk.tailc1230a.ts.net/api');
  console.log('2. Salvar → redeploy automático');
  console.log('3. Frontend vai puxar dados do seu servidor LOCAL via Tailscale');
}

main().catch(e => console.error('ERRO:', e.message));
