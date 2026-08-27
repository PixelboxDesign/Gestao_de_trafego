const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());

// Estado da sessão
let estado = {
  status: 'disconnected', // disconnected | qr | connecting | connected | error
  qr_base64: null,
  qr_string: null,
  numero: null,
  erro: null,
};

// Instância do cliente WhatsApp
let client = null;

function criarCliente() {
  // Garante que a pasta de sessão existe
  const fs = require('fs');
  const path = require('path');
  const sessaoDir = path.join(__dirname, 'sessao-whatsapp');
  
  if (!fs.existsSync(sessaoDir)) {
    fs.mkdirSync(sessaoDir, { recursive: true });
    console.log('[WhatsApp] Pasta de sessão criada:', sessaoDir);
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessaoDir
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    }
  });

  client.on('qr', async (qr) => {
    console.log('[WhatsApp] QR Code gerado');
    estado.status = 'qr';
    estado.qr_string = qr;
    estado.qr_base64 = await qrcode.toDataURL(qr);
    estado.erro = null;
  });

  client.on('loading_screen', (percent, message) => {
    console.log(`[WhatsApp] Carregando: ${percent}% - ${message}`);
    estado.status = 'connecting';
  });

  client.on('authenticated', () => {
    console.log('[WhatsApp] Autenticado!');
    estado.status = 'connecting';
    estado.qr_base64 = null;
    estado.qr_string = null;
  });

  client.on('ready', async () => {
    console.log('[WhatsApp] Conectado e pronto!');
    estado.status = 'connected';
    estado.qr_base64 = null;
    estado.qr_string = null;
    try {
      const info = client.info;
      estado.numero = info?.wid?.user || null;
    } catch {}
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Desconectado:', reason);
    estado.status = 'disconnected';
    estado.qr_base64 = null;
    estado.numero = null;
    estado.erro = reason;
    // Reinicia após 5 segundos
    setTimeout(() => {
      console.log('[WhatsApp] Reiniciando cliente...');
      criarCliente();
    }, 5000);
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Falha de autenticação:', msg);
    estado.status = 'error';
    estado.erro = msg;
  });

  client.initialize().catch(err => {
    console.error('[WhatsApp] Erro ao inicializar:', err.message);
    estado.status = 'error';
    estado.erro = err.message;
  });
}

// ─── Rotas da API ────────────────────────────────────────────────────────────

// GET /status — retorna estado atual
app.get('/status', (req, res) => {
  res.json(estado);
});

// GET /qr — retorna QR code em base64
app.get('/qr', (req, res) => {
  if (estado.status === 'qr' && estado.qr_base64) {
    res.json({ disponivel: true, qr: estado.qr_base64 });
  } else {
    res.json({ disponivel: false, qr: null, status: estado.status });
  }
});

// POST /desconectar — encerra a sessão e apaga os dados salvos
app.post('/desconectar', async (req, res) => {
  try {
    if (client) {
      await client.logout();
      await client.destroy();
      client = null;
    }
    estado = {
      status: 'disconnected',
      qr_base64: null,
      qr_string: null,
      numero: null,
      erro: null,
    };
    // Após desconectar, reinicia para gerar novo QR
    setTimeout(() => criarCliente(), 1000);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, erro: err.message });
  }
});

// POST /enviar — envia mensagem para um número
app.post('/enviar', async (req, res) => {
  const { numero, mensagem } = req.body;

  if (estado.status !== 'connected') {
    return res.status(400).json({ ok: false, erro: 'WhatsApp não está conectado' });
  }
  if (!numero || !mensagem) {
    return res.status(400).json({ ok: false, erro: 'numero e mensagem são obrigatórios' });
  }

  try {
    // Formata número: remove tudo que não é dígito, adiciona @c.us
    const numeroLimpo = numero.replace(/\D/g, '');
    const chatId = `${numeroLimpo}@c.us`;
    await client.sendMessage(chatId, mensagem);
    console.log(`[WhatsApp] Mensagem enviada para ${chatId}`);
    res.json({ ok: true });
  } catch (err) {
    console.error('[WhatsApp] Erro ao enviar:', err.message);
    res.status(500).json({ ok: false, erro: err.message });
  }
});

// ─── Inicia servidor ─────────────────────────────────────────────────────────

const PORT = process.env.WHATSAPP_PORT || 3002;

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[WhatsApp Sidecar] Rodando em http://127.0.0.1:${PORT}`);
  criarCliente();
});
