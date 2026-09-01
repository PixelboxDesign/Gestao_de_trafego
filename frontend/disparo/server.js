require('dotenv').config();
const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// URL do Luna Server local (via Cloudflare Tunnel)
// ⚠️ AVISO: Atualizar esta URL quando o tunnel mudar!
// URL atual: shield-required-enjoy-trained
const LUNA_API = process.env.LUNA_API_URL || 'https://shield-required-enjoy-trained.trycloudflare.com';

app.use(express.json());

// CORS headers para permitir requests do browser
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Desativa cache de arquivos estáticos para garantir versão mais recente
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }
}));

// Endpoint de diagnóstico — mostra a URL que está sendo usada
app.get('/diagnostico', (req, res) => {
  res.json({
    luna_api: LUNA_API,
    env_set: !!process.env.LUNA_API_URL,
    node_env: process.env.NODE_ENV || 'development',
  });
});

// Health check — repassa /health do backend
app.get('/health', async (req, res) => {
  try {
    const r = await fetch(`${LUNA_API}/health`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
      timeout: 5000,
    });
    const data = await r.json();
    res.json({ ok: true, backend: data });
  } catch (err) {
    res.status(503).json({ ok: false, erro: err.message });
  }
});

app.get('/health-check', async (req, res) => {
  try {
    const r = await fetch(`${LUNA_API}/health`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
      timeout: 5000,
    });
    const data = await r.json();
    res.json({ ok: true, backend: data });
  } catch (err) {
    res.status(503).json({ ok: false, erro: err.message });
  }
});

// ─── Proxy para o Luna Server local ──────────────────────────────────────────
// Qualquer chamada /api/* é repassada para o computador local via Tailscale

app.all('/api/*', async (req, res) => {
  const destino = `${LUNA_API}${req.originalUrl}`;
  try {
    const opcoes = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      timeout: 30000, // 30s para imagens grandes
    };
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      opcoes.body = JSON.stringify(req.body);
    }
    const resposta = await fetch(destino, opcoes);

    // Repassa Content-Type da resposta
    const ct = resposta.headers.get('content-type') || 'application/json';
    res.status(resposta.status).set('Content-Type', ct);

    // Para imagens, repassa buffer binário
    if (ct.startsWith('image/')) {
      const buffer = await resposta.buffer();
      res.send(buffer);
    } else {
      const texto = await resposta.text();
      res.send(texto);
    }
  } catch (err) {
    res.status(503).json({
      erro: 'Luna Server inacessível',
      detalhe: err.message,
      dica: 'Verifique se o Luna Server está rodando e o Tailscale está ativo'
    });
  }
});

// ─── SPA catch-all ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.setHeader('Clear-Site-Data', '"cache", "storage"');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Luna Disparo] Porta ${PORT}`);
  console.log(`[Luna Disparo] Proxy → ${LUNA_API}`);
  
  // Ping a cada 5min para evitar que o Render durma (plano gratuito)
  setInterval(() => {
    fetch(`http://localhost:${PORT}/health-check`).catch(() => {});
  }, 5 * 60 * 1000);
});
