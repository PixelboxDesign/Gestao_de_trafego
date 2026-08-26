# LUNA COSMÉTICOS — DOCUMENTAÇÃO OFICIAL DO SISTEMA
**Fonte Única de Verdade | Última Atualização: 25/08/2026**

---

## ⚠️ REGRA PERMANENTE DE ATUALIZAÇÃO

**ANTES de realizar QUALQUER alteração no código:**
1. Ler INTEGRALMENTE este documento
2. Verificar se a alteração impacta a arquitetura, fluxo ou comportamento
3. **Atualizar este arquivo Markdown depois de implementar**

**Este documento SEMPRE deve refletir o estado ATUAL e REAL do sistema.**

---

## 🔒 CHECKPOINTS PERMANENTES

> Os checkpoints foram movidos para um arquivo dedicado para manter esta documentação focada na arquitetura.
>
> **📄 Consulte: [CHECKPOINTS.md](./CHECKPOINTS.md)**
>
> O arquivo de checkpoints contém todos os marcos de estabilidade com commits de referência para rollback.

---

## 📋 ÍNDICE

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Infraestrutura e Deploy](#2-infraestrutura-e-deploy)
3. [Backend API — Rotas Completas](#3-backend-api--rotas-completas)
4. [Sistema de Catálogos](#4-sistema-de-catálogos)
5. [Sistema de Thumbnails Otimizadas](#5-sistema-de-thumbnails-otimizadas)
6. [Sistema de Carrossel de Imagens](#6-sistema-de-carrossel-de-imagens)
7. [Banco de Dados MySQL](#7-banco-de-dados-mysql)
8. [Integração Cloudflare Tunnel](#8-integração-cloudflare-tunnel)
9. [Frontend Proxy (Render.com)](#9-frontend-proxy-rendercom)
10. [Painel Desktop (Tauri)](#10-painel-desktop-tauri)
11. [Fluxos de Dados](#11-fluxos-de-dados)
12. [Procedimentos Git e Deploy](#12-procedimentos-git-e-deploy)
13. [Segurança e CORS](#13-segurança-e-cors)
14. [Performance e Cache](#14-performance-e-cache)
15. [Troubleshooting](#15-troubleshooting)
16. [Variáveis de Ambiente](#16-variáveis-de-ambiente)
17. [Arquivos Essenciais](#17-arquivos-essenciais)
18. [Changelog](#18-changelog)

---

## 1. VISÃO GERAL DA ARQUITETURA

### 1.1 Modelo de Deployment

O Sistema de Catálogos Luna Cosméticos utiliza uma **arquitetura híbrida**:

- **Frontend Proxy**: Hospedado no **Render.com** (free tier, região Oregon)
  - URL: `https://luna-disparo.onrender.com`
- **Backend API**: Executa **LOCALMENTE** via Tauri (porta **3001** ou **8080**)
- **Banco de Dados**: **MySQL local** na máquina do usuário (porta 3306)
- **Exposição Pública**: **Cloudflare Tunnel (Quick Tunnel)**
  - URL temporária (muda a cada restart)
  - Exemplo: `https://shanghai-sean-unlikely-prairie.trycloudflare.com`

```
┌──────────────────────────────────────────────────────────────────┐
│                          INTERNET                                │
└────────────┬────────────────────────────────────────────────────┘
             │
   ┌──────────┴──────────┐           ┌──────────────────────────┐
   │     RENDER.COM      │           │   CLOUDFLARE TUNNEL      │
   │  (Proxy Node.js)    │           │  https://*.trycloudflare │
   │                     │           │         .com             │
   │  luna-disparo       │──API─────▶│     (URL dinâmica)       │
   │  .onrender.com      │           │                          │
   └─────────────────────┘           └────────────┬─────────────┘
                                                   │
                                     ┌─────────────▼──────────────┐
                                     │       MÁQUINA LOCAL         │
                                     │                             │
                                     │  Backend Tauri :3001/8080   │
                                     │        ↓                    │
                                     │  MySQL :3306                │
                                     │        ↓                    │
                                     │  F:\luna_cosmeticos\        │
                                     │     catalogos\              │
                                     └─────────────────────────────┘
```

### 1.2 Aplicações

| App | Função | URL Produção |
|---|---|---|
| **Frontend Proxy** | Proxy reverso Express.js que roteia requisições para backend local | luna-disparo.onrender.com |
| **Backend Tauri** | API REST + File Server + Conexão MySQL | Via Cloudflare Tunnel (localhost:3001) |
| **Painel Desktop** | Interface React para gerenciamento (futuro) | Aplicação Tauri Desktop |

### 1.3 Stack Técnico

| Camada | Tecnologia |
|---|---|
| Backend | Tauri 1.x + Rust 1.70+ + Axum 0.6 |
| Banco | MySQL 8.x (mysql_async 0.31) |
| Frontend Proxy | Node.js 18 + Express 4.18 |
| Frontend Desktop | React 18 + TypeScript 5 + Vite 4 (futuro) |
| Imagens | Sharp (otimização Node.js) |
| Túnel | Cloudflare Quick Tunnel (cloudflared) |

---

## 2. INFRAESTRUTURA E DEPLOY

### 2.1 Render.com (Frontend Proxy)

- Plano: Free tier — dorme após 15min de inatividade
- Deploy: Automático via push no GitHub (~5 min)
- Variável obrigatória: `LUNA_API_URL` (URL do Cloudflare Tunnel)
- Build command: `npm install`
- Start command: `node server.js`
- Região: Oregon, EUA

### 2.2 Backend Local (Tauri)

- **Porta padrão**: 3001 (fallback: 8080)
- **Processo**: `cargo run` (dev) ou executável compilado (prod)
- **Start dev**: `npm run tauri dev` (hot reload)
- **Start prod**: `npm run tauri build` (gera executável)
- **Timeouts**: 120s padrão para operações HTTP

### 2.3 Cloudflare Tunnel (Quick Tunnel)

- **Comando**: `cloudflared tunnel --url http://localhost:3001`
- **Características**:
  - URL temporária (muda a cada restart)
  - Sem autenticação (modo público)
  - Gratuito
  - Expõe localhost via HTTPS
- **Uso**: Única forma do frontend Render acessar o backend local

---

## 3. BACKEND API — ROTAS COMPLETAS

### 3.1 Rotas Públicas (sem autenticação)

Todas as rotas são públicas — autenticação não implementada no sistema de catálogos.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check — retorna `{status:'ok', timestamp}` |
| `GET` | `/api/catalogo/kits/:marca` | Lista todos os kits de uma marca com metadados |
| `GET` | `/api/catalogo/imagem/:marca/:kit/:arquivo` | Serve imagem otimizada (thumb, carrossel) |

### 3.2 Catálogos (`/api/catalogo`)

#### `GET /api/catalogo/kits/:marca`

**Parâmetros:**
- `marca` — Nome da marca (ex: "Alphahall")

**Response:**
```json
{
  "marca": "Alphahall",
  "kits": [
    {
      "nome": "Kit Banho de Seda",
      "preco": "R$ 178,00",
      "descricao": "Kit completo para manutenção capilar...",
      "sku_kit": "00031",
      "skus_itens": [
        {
          "sku": "00031-A",
          "nome": "Shampoo Banho de Seda",
          "quantidade": 1
        },
        {
          "sku": "00031-B",
          "nome": "Máscara Banho de Seda",
          "quantidade": 1
        }
      ],
      "imagens": ["1.jpg", "2.jpg", "3.jpg"],
      "thumb_url": "/api/catalogo/imagem/Alphahall/Kit%20Banho%20de%20Seda/thumb.png"
    }
  ],
  "total": 41
}
```

**Comportamento:**
1. Lista diretórios em `catalogos/{marca}/`
2. Para cada pasta, lê `info.json`
3. Monta URL da thumbnail otimizada
4. Detecta imagens do carrossel (1.jpg, 2.jpg, 3.jpg...)
5. Retorna array completo

#### `GET /api/catalogo/imagem/:marca/:kit/:arquivo`

**Parâmetros:**
- `marca` — Nome da marca (ex: "Alphahall")
- `kit` — Nome do kit (ex: "Kit Banho de Seda")
- `arquivo` — Nome do arquivo (ex: "thumb.png", "1.jpg", "2.jpg")

**Headers de resposta:**
```
Content-Type: image/jpeg ou image/png
Cache-Control: public, max-age=86400
Access-Control-Allow-Origin: *
```

**Comportamento:**
1. Sanitiza path (remove `../` e caracteres perigosos)
2. Monta caminho: `F:\luna_cosmeticos\catalogos\{marca}\{kit}\{arquivo}`
3. Valida existência do arquivo
4. Serve com stream eficiente
5. Cache de 24h no browser

**Segurança:**
- Path traversal bloqueado
- Apenas extensões permitidas: `.jpg`, `.jpeg`, `.png`
- Validação de existência antes de servir

---

## 4. SISTEMA DE CATÁLOGOS

### 4.1 Estrutura de Diretórios

```
F:\luna_cosmeticos\catalogos\
└── Alphahall\                      ← Marca
    ├── Kit Banho de Seda\          ← Kit individual
    │   ├── info.json               ← Metadados
    │   ├── thumb.png               ← Thumbnail otimizada (400x400, 30KB)
    │   ├── thumb_original.png      ← Backup original (600KB)
    │   ├── 1.jpg                   ← Imagem 1 do carrossel
    │   ├── 2.jpg                   ← Imagem 2 do carrossel
    │   └── 3.jpg                   ← Imagem 3 do carrossel
    ├── Kit SOS Profissional\
    └── [... 39 kits adicionais]
```

### 4.2 Formato info.json

```json
{
  "preco": "R$ 178,00",
  "descricao": "Kit completo de shampoo e máscara para hidratação profunda",
  "sku_kit": "00031",
  "skus_itens": [
    {
      "sku": "00031-A",
      "nome": "Shampoo Banho de Seda 350ml",
      "quantidade": 1
    },
    {
      "sku": "00031-B",
      "nome": "Máscara Banho de Seda 250g",
      "quantidade": 1
    }
  ],
  "imagens": ["1.jpg", "2.jpg", "3.jpg"]
}
```

**Campos:**
- `preco` — Preço formatado com R$
- `descricao` — Descrição do kit (string longa aceita)
- `sku_kit` — SKU único do kit completo
- `skus_itens` — Array de produtos individuais dentro do kit
  - `sku` — SKU do item individual
  - `nome` — Nome descritivo do item
  - `quantidade` — Quantidade incluída no kit
- `imagens` — Array de nomes de arquivos para o carrossel (opcional)

### 4.3 Regras de Nomenclatura

- **Pastas de kits:** Nome legível (ex: "Kit Banho de Seda")
- **info.json:** Sempre minúsculo, nome fixo
- **Thumbnails:**
  - `thumb.png` — versão otimizada (servida pela API)
  - `thumb_original.png` — backup do original
- **Carrossel:** Numeração sequencial `1.jpg`, `2.jpg`, `3.jpg`, etc.

---

## 5. SISTEMA DE THUMBNAILS OTIMIZADAS

### 5.1 Objetivo

Reduzir tamanho das thumbnails de ~600KB para ~30KB (95% de redução) sem perda perceptível de qualidade visual.

### 5.2 Script de Otimização

**Arquivo:** `scripts/otimizar_thumbnails.js`

**Tecnologia:** Sharp (biblioteca Node.js de processamento de imagens de alta performance)

**Comando:**
```bash
node otimizar_thumbnails.js
```

**Fluxo:**
1. Percorre todas as marcas em `catalogos/`
2. Para cada kit dentro da marca:
   - Localiza `thumb_original.png` ou qualquer PNG de thumbnail
   - Se já existe `thumb_original.png`, pula (já foi processado)
   - Se não: renomeia original para `thumb_original.png`
   - Processa com Sharp:
     ```javascript
     sharp(inputPath)
       .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
       .jpeg({ quality: 85, progressive: true })
       .toFile(outputPath)
     ```
   - Registra estatísticas (tamanho antes/depois, economia)
3. Exibe relatório final

**Especificações técnicas:**
- Dimensão máxima: 400×400px (mantém proporção)
- Formato de saída: JPEG
- Qualidade: 85% (balanço ideal)
- Progressive: true (carregamento incremental)
- Fit mode: `inside` (não corta, apenas redimensiona)
- Without enlargement: true (não aumenta imagens pequenas)

### 5.3 Resultados

**Antes da otimização:**
```
41 kits × 600KB = 24,6 MB
Formato: PNG (sem compressão otimizada)
Carregamento: ~8s em 4G
```

**Depois da otimização:**
```
41 kits × 30KB = 1,23 MB
Formato: JPEG 85% progressive
Carregamento: ~1.5s em 4G
Economia: 23 MB (95%)
```

### 5.4 Backup Automático

- Original sempre preservado como `thumb_original.png`
- Permite reverter otimização se necessário
- Não ocupa espaço no backend (não é servido pela API)

---

## 6. SISTEMA DE CARROSSEL DE IMAGENS

### 6.1 Estrutura

Cada kit pode ter múltiplas imagens de produto além da thumbnail:

```
Kit Banho de Seda/
├── thumb.png       ← Thumbnail (mostrada na lista de kits)
├── 1.jpg           ← Imagem principal do produto
├── 2.jpg           ← Ângulo alternativo
├── 3.jpg           ← Detalhes / uso
└── 4.jpg           ← Opcional (quantas necessário)
```

### 6.2 Detecção Automática

Backend detecta automaticamente arquivos `1.jpg`, `2.jpg`, `3.jpg`... na pasta do kit e inclui no array `imagens` da resposta JSON.

**Código Rust (simplificado):**
```rust
let mut imagens = vec![];
for i in 1..=10 {
    let img_path = kit_path.join(format!("{}.jpg", i));
    if img_path.exists() {
        imagens.push(format!("{}.jpg", i));
    } else {
        break; // Para ao encontrar gap
    }
}
```

### 6.3 Frontend (React)

**Componente de carrossel esperado:**
- Navegação com setas ← →
- Indicadores de página (dots)
- Lazy loading (só carrega imagem quando entra no viewport)
- Preloading da próxima imagem
- Fallback para thumbnail se `imagens` estiver vazio
- Zoom on click (lightbox)

**URLs geradas:**
```javascript
const imagemUrl = `/api/catalogo/imagem/${marca}/${kit}/${nomeArquivo}`;
// Exemplo:
// /api/catalogo/imagem/Alphahall/Kit%20Banho%20de%20Seda/1.jpg
```

---

## 7. BANCO DE DADOS MYSQL

**Conexão**: localhost:3306 | Database: `luna_cosmeticos`

### 7.1 Resumo Geral

| Métrica | Valor |
|---|---|
| Total de tabelas | 78 |
| Total de registros | 2.523.149 (2.5 milhões) |
| Tamanho total | 686.97 MB |

### 7.2 Principais Conjuntos de Tabelas

#### E-commerce (Tray) — ~1.5M registros

| Tabela | Registros | Descrição |
|---|---|---|
| `detalhes_pedidos_ecommerce_tray` | 552.285 | Itens de pedidos |
| `produtos_vendidos_tray_ecommerce` | 551.420 | Produtos vendidos |
| `clientes_tray_ecommerce` | 172.431 | Cadastro de clientes |
| `pedidos_ecommerce_tray` | 168.000 | Pedidos completos |

#### ERP (Bling) — ~500k registros

**Distribuição:**
- `bling_produtos_distribuicao` | `bling_produtos_ecommerce`
- `bling_depositos_distribuicao` | `bling_depositos_ecommerce`
- `bling_pedidos_venda_distribuicao` | `bling_pedidos_venda_ecommerce`
- `bling_produtos_estoque_*`
- `bling_nfe_saida_*`

#### NFe/XML — ~90k registros

| Tabela | Registros | Descrição |
|---|---|---|
| `nfe_xml_importado` | 5.794 | XMLs de notas fiscais |
| `nfe_xml_itens` | 84.350 | Itens das NFes |

#### Redes Sociais (Ads) — ~100k registros

- `facebook_ad_*` — Campanhas, insights, anúncios Facebook
- `instagram_*` — Mídia, perfis, insights Instagram
- `tiktokads_*` — Relatórios TikTok Ads
- `googleads_*` — Relatórios Google Ads

### 7.3 Top 5 Maiores Tabelas

| Tabela | Registros | Tamanho |
|---|---|---|---|
| `detalhes_pedidos_ecommerce_tray` | 552.285 | 198 MB |
| `produtos_vendidos_tray_ecommerce` | 551.420 | 142 MB |
| `bling_nfe_saida_detalhes_ecommerce` | 19.000 | 50 MB |
| `clientes_tray_ecommerce` | 172.431 | 30 MB |
| `nfe_xml_itens` | 84.350 | 26 MB |

### 7.4 Uso no Sistema de Catálogos

**Atualmente:** O sistema de catálogos **não utiliza** o banco de dados MySQL. Todos os dados vêm de arquivos `info.json`.

**Futuro possível:**
- Sincronização de SKUs com tabelas Bling
- Controle de estoque por kit
- Histórico de preços
- Analytics de visualizações de kits

---

## 8. INTEGRAÇÃO CLOUDFLARE TUNNEL

### 8.1 Configuração

**Comando de inicialização:**
```bash
cloudflared tunnel --url http://localhost:3001
```

**Output exemplo:**
```
2026-08-25T15:30:45Z INF Thank you for trying Cloudflare Tunnel.
2026-08-25T15:30:45Z INF Your quick Tunnel has been created!
2026-08-25T15:30:46Z INF https://shanghai-sean-unlikely-prairie.trycloudflare.com
```

### 8.2 Características

- **URL dinâmica**: Muda a cada restart do cloudflared
- **HTTPS automático**: Certificado gerenciado pelo Cloudflare
- **Sem autenticação**: Modo público (Quick Tunnel)
- **Timeout**: 100s padrão (suficiente para imagens grandes)
- **Largura de banda**: Sem limite no free tier

### 8.3 Fluxo de Requisição

```
Browser → Render Proxy → Cloudflare Tunnel → Backend Tauri Local
```

**Detalhado:**
1. Browser faz `GET https://luna-disparo.onrender.com/api/catalogo/kits/Alphahall`
2. Render proxy lê `LUNA_API_URL` do `.env`
3. Proxy faz `GET https://*.trycloudflare.com/api/catalogo/kits/Alphahall`
4. Cloudflare roteia para `localhost:3001`
5. Backend Tauri processa e responde
6. Resposta volta pelo mesmo caminho

### 8.4 Limitações

- URL muda a cada restart — frontend precisa ser redeployado
- Dependência de conectividade — se internet cair, sistema fica offline
- Latência adicional (~100-300ms) comparado a acesso direto

### 8.5 Alternativa (Named Tunnel)

**Futuro:** Named Tunnel com URL fixa

```bash
# 1. Login
cloudflare login

# 2. Criar túnel
cloudflared tunnel create luna-catalogos

# 3. Rota fixa
cloudflared tunnel route dns luna-catalogos luna-api.seu-dominio.com

# 4. Iniciar
cloudflared tunnel run luna-catalogos
```

---

## 9. FRONTEND PROXY (RENDER.COM)

### 9.1 Estrutura

**Arquivo principal:** `frontend/disparo/server.js`

**Tecnologia:** Express.js (Node.js)

**Porta:** 3000 (fornecida automaticamente pelo Render via variável `PORT`)

### 9.2 Configuração

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Variável de ambiente obrigatória
const LUNA_API_URL = process.env.LUNA_API_URL;

// Middleware de proxy
app.use('/api', createProxyMiddleware({
  target: LUNA_API_URL,          // Cloudflare Tunnel URL
  changeOrigin: true,             // Muda host header
  timeout: 30000,                 // 30s timeout
  proxyTimeout: 30000,
  onError: (err, req, res) => {
    console.error('Proxy error:', err.message);
    res.status(502).json({
      error: 'Backend temporariamente indisponível',
      details: err.message
    });
  },
  onProxyReq: (proxyReq, req) => {
    console.log(`→ Proxy: ${req.method} ${req.url}`);
  },
  onProxyRes: (proxyRes, req) => {
    console.log(`← Proxy: ${req.method} ${req.url} [${proxyRes.statusCode}]`);
  }
}));

// Health check do proxy
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    proxy_target: LUNA_API_URL,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy rodando na porta ${PORT}`);
  console.log(`Roteando para: ${LUNA_API_URL}`);
});
```

### 9.3 Variáveis de Ambiente (Render)

```env
LUNA_API_URL=https://shanghai-sean-unlikely-prairie.trycloudflare.com
NODE_ENV=production
PORT=3000  # Fornecido automaticamente pelo Render
```

### 9.4 Deploy Automático

```bash
# Fazer alterações no código
git add .
git commit -m "feat: descrição"
git push origin main

# Render detecta push e faz rebuild automático (~5min)
# Logs disponíveis em: https://dashboard.render.com
```

---

## 10. PAINEL DESKTOP (TAURI)

### 10.1 Estrutura

**Frontend:** React 18 + TypeScript 5 + Vite 4  
**Backend:** Rust (Tauri core)  
**Integração:** `@tauri-apps/api` (IPC entre JS e Rust)

### 10.2 Funcionalidades Planejadas

- Visualização de catálogos
- Upload de novos kits
- Edição de info.json via formulário
- Otimização de thumbnails integrada
- Controle do Cloudflare Tunnel (start/stop/status)
- Monitoramento de requisições da API
- Logs em tempo real

### 10.3 Comandos de Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em modo dev (hot reload)
npm run tauri dev

# Build de produção (gera executável)
npm run tauri build

# Apenas frontend (sem Rust)
npm run dev
```

### 10.4 Comunicação Frontend-Backend

**Exemplo de invoke (JS → Rust):**

```typescript
import { invoke } from '@tauri-apps/api';

// Frontend chama função Rust
const kits = await invoke('listar_kits', { marca: 'Alphahall' });
console.log(kits);
```

**Handler Rust:**

```rust
#[tauri::command]
fn listar_kits(marca: String) -> Result<Vec<Kit>, String> {
    // Lógica de listagem
    Ok(vec![...])
}
```

---

## 11. FLUXOS DE DADOS

### 11.1 Listar Kits de uma Marca

```
1. Browser → GET /api/catalogo/kits/Alphahall
2. Render Proxy → GET https://*.trycloudflare.com/api/catalogo/kits/Alphahall
3. Cloudflare Tunnel → http://localhost:3001/api/catalogo/kits/Alphahall
4. Backend Tauri:
   a) Lista diretórios em F:\luna_cosmeticos\catalogos\Alphahall\
   b) Para cada pasta:
      - Lê info.json
      - Detecta imagens (1.jpg, 2.jpg...)
      - Monta objeto JSON
   c) Retorna array de kits
5. Resposta JSON volta ao browser
```

### 11.2 Servir Imagem do Carrossel

```
1. Browser → GET /api/catalogo/imagem/Alphahall/Kit%20Banho%20de%20Seda/1.jpg
2. Render Proxy → repassa via Cloudflare
3. Backend Tauri:
   a) Sanitiza path (remove ../)
   b) Monta: F:\luna_cosmeticos\catalogos\Alphahall\Kit Banho de Seda\1.jpg
   c) Valida existência do arquivo
   d) Serve com headers:
      Content-Type: image/jpeg
      Cache-Control: public, max-age=86400
      Access-Control-Allow-Origin: *
4. Imagem retorna ao browser
5. Browser cacheia por 24h
```

### 11.3 Otimização de Thumbnails

```
1. Admin executa: node otimizar_thumbnails.js
2. Script:
   a) Lista todas as marcas
   b) Para cada kit:
      - Localiza thumb original
      - Verifica se já foi processado (thumb_original.png existe)
      - Se não: renomeia original, processa com Sharp
      - Salva thumb.png otimizada (400x400, JPEG 85%)
   c) Exibe estatísticas
3. Thumbnails otimizadas prontas para serem servidas pela API
```

---

## 12. PROCEDIMENTOS GIT E DEPLOY

### 12.1 Convenções de Commit

```bash
# Formato
tipo: descrição curta

# Tipos válidos
feat:     # Nova funcionalidade
fix:      # Correção de bug
chore:    # Tarefas gerais (deps, config)
refactor: # Refatoração sem mudança de comportamento
docs:     # Alterações na documentação
perf:     # Melhoria de performance

# Exemplos
feat: adiciona carrossel de imagens por kit
fix: corrige CORS no backend Tauri
docs: atualiza ARQUITETURA_SISTEMA.md com thumbnails
```

### 12.2 Fluxo de Deploy Frontend

```bash
# 1. Fazer alterações no código
vim frontend/disparo/server.js

# 2. Commitar
git add .
git commit -m "feat: adiciona timeout de 30s no proxy"

# 3. Push
git push origin main

# 4. Aguardar deploy automático (Render)
# Acompanhar em: https://dashboard.render.com
# Tempo médio: 5 minutos
```

### 12.3 Fluxo de Deploy Backend

**O backend NÃO é deployado** — ele roda localmente.

**Para atualizar:**
```bash
# Pull das mudanças
git pull origin main

# Rebuild Tauri (se mudou código Rust)
cd backend
npm run tauri build

# Ou apenas rodar em dev
npm run tauri dev
```

### 12.4 Atualização da URL do Cloudflare

**Quando o túnel é reiniciado, a URL muda:**

```bash
# 1. Reiniciar cloudflared
cloudflared tunnel --url http://localhost:3001
# Output: https://nueva-url-aleatoria.trycloudflare.com

# 2. Atualizar variável no Render
# Dashboard → Service → Environment
# LUNA_API_URL=https://nueva-url-aleatoria.trycloudflare.com

# 3. Render faz redeploy automático (~2min)
```

---

## 13. SEGURANÇA E CORS

### 13.1 CORS (Cross-Origin Resource Sharing)

**Configurado no backend Tauri (Rust):**

```rust
use tower_http::cors::{CorsLayer, Any};

let cors = CorsLayer::new()
    .allow_origin(Any)                    // Permite qualquer origem
    .allow_methods(Any)                   // GET, POST, OPTIONS, etc.
    .allow_headers(Any)                   // Qualquer header
    .max_age(Duration::from_secs(3600));  // Cache do preflight 1h
```

**Necessário porque:**
- Frontend no domínio `luna-disparo.onrender.com`
- Backend no domínio `*.trycloudflare.com`
- Sem CORS, browser bloqueia as requisições

### 13.2 Path Traversal Protection

**Problema:** Requisição maliciosa pode tentar acessar arquivos fora da pasta de catálogos.

**Exemplo de ataque:**
```
GET /api/catalogo/imagem/Alphahall/../../../windows/system32/config/sam
```

**Proteção implementada (Rust):**

```rust
fn sanitize_path(path: &str) -> String {
    path.replace("..", "")        // Remove ..
        .replace("./", "")         // Remove ./
        .replace("\\", "/")        // Normaliza barras
}

// Validação adicional
if !final_path.starts_with(&CATALOGOS_BASE_PATH) {
    return Err("Path inválido");
}
```

### 13.3 Validação de Extensões

**Apenas extensões permitidas:**
- `.jpg`, `.jpeg` — Imagens JPEG
- `.png` — Imagens PNG (thumbnails)

**Bloqueadas:**
- `.exe`, `.dll`, `.bat`, `.ps1` — Executáveis
- `.json` — Metadados não devem ser servidos como imagem
- Qualquer outra extensão

### 13.4 Rate Limiting (Futuro)

**Não implementado atualmente.**

**Plano futuro:**
- Limite de 100 req/min por IP
- Bloqueio temporário após 3 violações
- Whitelist para IPs confiáveis

---

## 14. PERFORMANCE E CACHE

### 14.1 Cache de Imagens no Browser

**Headers enviados pelo backend:**

```http
Cache-Control: public, max-age=86400
```

**Comportamento:**
- Browser cacheia imagem por 24 horas
- Requisições subsequentes não chegam ao servidor
- Economia de banda: ~95% após primeira visita

### 14.2 Cache do Proxy (Render)

**Atualmente:** Sem cache — todas as requisições passam pelo Cloudflare.

**Futuro:** Cache de 1h para thumbnails no proxy Express.

```javascript
const cache = new Map();

app.get('/api/catalogo/imagem/*', (req, res, next) => {
  const cached = cache.get(req.url);
  if (cached && Date.now() - cached.timestamp < 3600000) {
    return res.send(cached.data);
  }
  next();
});
```

### 14.3 Lazy Loading de Imagens (Frontend)

**Implementação recomendada:**

```jsx
<img
  src={imagemUrl}
  loading="lazy"           // Nativo HTML5
  alt={kit.nome}
  onLoad={() => console.log('Carregada:', imagemUrl)}
/>
```

**Ou com IntersectionObserver:**

```javascript
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.src = entry.target.dataset.src;
        observer.unobserve(entry.target);
      }
    });
  });

  imgRefs.forEach(ref => observer.observe(ref));
  return () => observer.disconnect();
}, []);
```

### 14.4 Compressão Gzip (Render)

**Habilitado automaticamente no Render** para respostas JSON.

**Thumbnails JPEG:** Já são comprimidas nativamente (não se beneficiam de Gzip).

---

## 15. TROUBLESHOOTING

### Proxy retorna 502 Bad Gateway
**Causa:** Backend local ou Cloudflare Tunnel estão offline.

**Solução:**
1. Verificar se `cloudflared` está rodando
2. Verificar se backend Tauri está ativo
3. Testar acesso direto: `curl http://localhost:3001/health`

### Imagens não carregam (404)
**Causa:** Caminho incorreto ou arquivo não existe.

**Debug:**
1. Verificar estrutura de pastas: `F:\luna_cosmeticos\catalogos\{marca}\{kit}\`
2. Conferir nome do arquivo (case-sensitive em Linux)
3. Testar URL direta no browser

### Thumbnails ainda grandes (não otimizadas)
**Causa:** Script `otimizar_thumbnails.js` não foi executado.

**Solução:**
```bash
cd scripts
node otimizar_thumbnails.js
```

### CORS error no browser
**Causa:** Backend não está enviando headers CORS.

**Solução:**
1. Verificar configuração `CorsLayer` no Rust
2. Checar logs do backend para ver se rota foi acessada
3. Testar com `curl -I` para ver headers

### URL do Cloudflare mudou
**Causa:** Túnel foi reiniciado (comportamento esperado do Quick Tunnel).

**Solução:**
1. Copiar nova URL do terminal `cloudflared`
2. Atualizar `LUNA_API_URL` no Render
3. Aguardar redeploy automático (~2min)

### Deploy do Render falha
**Causa:** Erro no `package.json` ou dependências.

**Debug:**
1. Ver logs em: https://dashboard.render.com → Service → Logs
2. Verificar se `package.json` existe em `frontend/disparo/`
3. Checar se `node_modules` não está commitado (deve estar no `.gitignore`)

---

## 16. VARIÁVEIS DE AMBIENTE

### 16.1 Backend Tauri (`.env` local)

```env
# Porta do servidor HTTP
PORT=3001

# Banco de dados MySQL local
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=sua_senha_aqui
DB_NAME=luna_cosmeticos

# Caminho base dos catálogos
CATALOGOS_PATH=F:\luna_cosmeticos\catalogos
```

### 16.2 Frontend Proxy (Render.com)

**Configurar em:** Dashboard → Service → Environment

```env
LUNA_API_URL=https://shanghai-sean-unlikely-prairie.trycloudflare.com
NODE_ENV=production
PORT=3000  # Fornecido automaticamente pelo Render
```

### 16.3 Scripts (Node.js local)

Nenhuma variável de ambiente necessária — caminhos hardcoded nos scripts.

---

## 17. ARQUIVOS ESSENCIAIS

| Arquivo | Função |
|---|---|
| `frontend/disparo/server.js` | Proxy Express.js no Render |
| `frontend/disparo/package.json` | Dependências do proxy |
| `backend/src-tauri/src/main.rs` | Entry point Rust |
| `backend/src-tauri/src/routes.rs` | Definição de rotas HTTP |
| `backend/src-tauri/Cargo.toml` | Dependências Rust |
| `scripts/otimizar_thumbnails.js` | Script de otimização de imagens |
| `catalogos/Alphahall/*/info.json` | Metadados de cada kit (41 arquivos) |
| `.gitignore` | Ignora node_modules, .env, etc. |
| `documentacao/README.md` | Visão geral do sistema |
| `documentacao/CHECKPOINTS.md` | Histórico de versões estáveis |
| `documentacao/ARQUITETURA_SISTEMA.md` | Este arquivo |
| `documentacao/stack.md` | Guia de tecnologias |

---

## 18. CHANGELOG

### 25/08/2026 — v10-thumb-carrossel

#### Sistema de Thumbnails Otimizadas com Sharp

- Script `otimizar_thumbnails.js` criado
- Redução de 95% no tamanho (600KB → 30KB)
- Formato: 400×400px, JPEG 85%, progressive
- Backup automático do original (`thumb_original.png`)
- Total economizado: 23 MB (41 kits)

#### Sistema de Carrossel de Imagens

- Suporte a múltiplas imagens por kit (`1.jpg`, `2.jpg`, `3.jpg`...)
- Rota `/api/catalogo/imagem/:marca/:kit/:arquivo` implementada
- Detecção automática de imagens no backend
- Campo `imagens` adicionado ao `info.json`
- Cache de 24h no browser

#### Segurança e Performance

- CORS configurado com `tower_http::cors`
- Path traversal bloqueado (sanitização de `../`)
- Validação de extensões (apenas `.jpg`, `.jpeg`, `.png`)
- Headers de cache otimizados

---

**FIM DA DOCUMENTAÇÃO**

