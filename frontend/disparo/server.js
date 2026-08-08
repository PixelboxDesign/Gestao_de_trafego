const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// URL do backend Luna Server (via Tailscale)
// Configurar no Render como variável de ambiente: LUNA_API_URL
const LUNA_API = process.env.LUNA_API_URL || 'http://100.78.156.3:3001';

app.use(express.json());

// Serve os arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, 'public')));

// Expõe a URL da API para o frontend via endpoint de configuração
app.get('/config', (req, res) => {
  res.json({ api: LUNA_API });
});

// Rota catch-all — serve o index.html para SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[Luna Disparo] Rodando na porta ${PORT}`);
  console.log(`[Luna Disparo] API backend: ${LUNA_API}`);
});
