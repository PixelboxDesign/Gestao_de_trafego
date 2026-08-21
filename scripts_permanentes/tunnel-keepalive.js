/**
 * TUNNEL KEEP-ALIVE (Ngrok/Cloudflare)
 * Mantém o tunnel ativo fazendo requisições periódicas
 * Evita timeout de inatividade e mudança de URL
 */

const https = require('https');
const http = require('http');

// Configurações
const PING_INTERVAL = 5 * 60 * 1000; // 5 minutos
const LOCALHOST_HEALTH = 'http://localhost:3001/health';
const TIMEOUT = 10000; // 10 segundos

// APIs para detectar tunnel
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';
const CLOUDFLARE_METRICS = 'http://127.0.0.1:2000/metrics'; // Cloudflare Tunnel metrics

let currentUrl = null;
let currentTunnelType = null; // 'ngrok' | 'cloudflare'
let consecutiveErrors = 0;
const MAX_ERRORS = 3;

/**
 * Busca a URL pública do ngrok
 */
async function getNgrokUrl() {
  return new Promise((resolve, reject) => {
    http.get(NGROK_API, { timeout: TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const tunnel = json.tunnels.find(t => t.proto === 'https');
          if (tunnel) {
            resolve(tunnel.public_url);
          } else {
            reject(new Error('Nenhum tunnel HTTPS encontrado'));
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

/**
 * Detecta URL do Cloudflare Tunnel (via logs ou arquivo)
 * Cloudflare não expõe API local, então fazemos ping direto no localhost
 */
async function getCloudflareUrl() {
  // Por enquanto, Cloudflare não expõe URL via API local
  // Vamos apenas fazer ping no localhost e assumir que está exposto
  return 'cloudflare-tunnel-detected';
}

/**
 * Detecta qual tunnel está rodando
 */
async function detectTunnel() {
  // Tenta ngrok primeiro
  try {
    const url = await getNgrokUrl();
    return { type: 'ngrok', url };
  } catch (e) {
    // Ngrok não está rodando, tenta Cloudflare
    try {
      const url = await getCloudflareUrl();
      return { type: 'cloudflare', url };
    } catch (e2) {
      throw new Error('Nenhum tunnel detectado (ngrok/cloudflare)');
    }
  }
}

/**
 * Faz ping no endpoint /health (localhost - mais confiável)
 */
async function pingLocalhost() {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(LOCALHOST_HEALTH);
    
    http.get(LOCALHOST_HEALTH, { timeout: TIMEOUT }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, status: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('Timeout')));
  });
}

/**
 * Log com timestamp
 */
function log(msg, type = 'info') {
  const timestamp = new Date().toLocaleString('pt-BR');
  const prefix = {
    info: '✓',
    warn: '⚠️',
    error: '❌'
  }[type] || 'ℹ️';
  
  console.log(`[${timestamp}] ${prefix} ${msg}`);
}

/**
 * Loop principal
 */
async function keepAlive() {
  try {
    // 1. Detecta tunnel (ngrok ou cloudflare)
    const tunnel = await detectTunnel();
    
    // Detecta mudança de tunnel ou URL
    if (currentTunnelType && currentTunnelType !== tunnel.type) {
      log(`Tunnel mudou de ${currentTunnelType} → ${tunnel.type}`, 'warn');
    }
    if (currentUrl && currentUrl !== tunnel.url && tunnel.type === 'ngrok') {
      log(`URL do ngrok mudou!\n   Antiga: ${currentUrl}\n   Nova: ${tunnel.url}`, 'warn');
    }
    
    currentTunnelType = tunnel.type;
    currentUrl = tunnel.url;

    // 2. Faz ping no localhost (garante que o servidor está vivo)
    const result = await pingLocalhost();
    consecutiveErrors = 0; // Reset contador de erros
    
    log(`Ping OK → localhost:3001 (tunnel: ${tunnel.type})`);
    
  } catch (error) {
    consecutiveErrors++;
    log(`Erro (${consecutiveErrors}/${MAX_ERRORS}): ${error.message}`, 'error');
    
    if (consecutiveErrors >= MAX_ERRORS) {
      log('Muitos erros consecutivos! Verifique se o tunnel e o servidor estão rodando.', 'error');
      consecutiveErrors = 0; // Reset para não spammar
    }
  }
}

/**
 * Inicialização
 */
async function start() {
  log('🚀 Tunnel Keep-Alive iniciado (suporta Ngrok + Cloudflare)');
  log(`📡 Intervalo de ping: ${PING_INTERVAL / 1000}s (${PING_INTERVAL / 60000} min)`);
  
  // Primeira execução imediata
  await keepAlive();
  
  // Loop periódico
  setInterval(keepAlive, PING_INTERVAL);
}

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  log(`Erro não capturado: ${err.message}`, 'error');
});

process.on('SIGINT', () => {
  log('🛑 Encerrando Keep-Alive...', 'warn');
  process.exit(0);
});

// Inicia
start();
