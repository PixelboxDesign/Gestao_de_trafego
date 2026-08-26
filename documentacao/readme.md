# Luna Cosméticos - Sistema de Catálogos Digitais

Sistema completo de catálogos de kits de produtos com backend local Tauri e frontend remoto Render.com, integrado via Cloudflare Tunnel.

---

## 🔒 CHECKPOINTS PERMANENTES

> **Última versão estável:** [v10-thumb-carrossel — Sistema de Thumbnails Otimizadas + Carrossel de Imagens](./CHECKPOINTS.md#checkpoint-v10-thumb-carrossel) (commit `pendente`)
>
> Todos os checkpoints e marcos de estabilidade estão documentados em **[CHECKPOINTS.md](./CHECKPOINTS.md)**.

---

## 🚀 Iniciar Desenvolvimento

**Backend (Tauri):**
```bash
cd backend
npm run tauri dev
```

**Frontend (Render Proxy - Local):**
```bash
cd frontend/disparo
npm install
node server.js
```

**Cloudflare Tunnel:**
```bash
cloudflared tunnel --url http://localhost:3001
```

## 🌐 URLs do Sistema

| Módulo | Desenvolvimento | Produção |
|---|---|---|
| **Frontend Proxy** | http://localhost:3000 | https://luna-disparo.onrender.com |
| **Backend API** | http://localhost:3001 | Via Cloudflare Tunnel (URL dinâmica) |
| **Painel Desktop** | Tauri Window | Aplicação desktop local |

## 📁 Estrutura do Projeto

```
luna_cosmeticos/
├── backend/                    # Backend Tauri (Rust + Axum)
│   └── src-tauri/
│       ├── src/
│       │   ├── main.rs        # Entry point Rust
│       │   ├── routes.rs      # Rotas HTTP (Axum)
│       │   └── db.rs          # Conexão MySQL
│       └── Cargo.toml
├── frontend/
│   └── disparo/               # Proxy Node.js (Render.com)
│       ├── server.js          # Express proxy
│       └── package.json
├── catalogos/                 # Catálogos de produtos
│   └── Alphahall/             # Marca
│       └── Kit {Nome}/        # Kit individual
│           ├── info.json      # Metadados (preço, SKUs)
│           ├── thumb.png      # Thumbnail otimizada (400x400, ~30KB)
│           ├── thumb_original.png  # Backup (~600KB)
│           ├── 1.jpg          # Imagens do carrossel
│           ├── 2.jpg
│           └── 3.jpg
├── documentacao/              # Documentação do sistema
│   ├── README.md              # Visão geral e features (este arquivo)
│   ├── ARQUITETURA_SISTEMA.md # Documentação técnica completa
│   ├── CHECKPOINTS.md         # Histórico de versões estáveis
│   └── stack.md               # Guia de tecnologias
└── scripts/                   # Scripts utilitários
    └── otimizar_thumbnails.js # Otimização de imagens
```

## ✨ Funcionalidades Principais

### 📦 Backend (Tauri + Rust)
- API RESTful com Axum (framework HTTP assíncrono)
- File server para imagens otimizadas
- Conexão MySQL local (localhost:3306)
- Gerenciador de túnel Cloudflare
- Suporte a CORS para frontend remoto
- Rotas de catálogos com cache eficiente

### 🌐 Frontend (Render.com)
- Proxy reverso Express.js
- Roteamento para backend via Cloudflare
- Hospedagem gratuita com sleep após 15min
- Deploy automático via Git push
- Keep-alive para evitar sleep (futuro)

### 📱 Painel Desktop (Tauri)
- Interface React + TypeScript
- Gerenciamento de catálogos
- Visualização de kits
- Controle do túnel Cloudflare
- Hot reload em desenvolvimento

### 🖼️ Sistema de Thumbnails
- Otimização automática com Sharp
- Redução de 95% no tamanho (600KB → 30KB)
- Formato: 400×400px, JPEG 85% qualidade
- Backup do original preservado
- Total economizado: 23 MB (41 kits)

### 🎠 Carrossel de Imagens
- Múltiplas imagens por kit (1.jpg, 2.jpg, 3.jpg...)
- Navegação sequencial no frontend
- Lazy loading de imagens
- Fallback para thumb quando carrossel vazio

## 🗄️ Banco de Dados

**MySQL 8.x** local (localhost:3306)
- Database: `luna_cosmeticos`
- 78 tabelas principais
- 2.523.149 registros (2.5 milhões)
- Tamanho: 686.97 MB

### Principais Conjuntos de Tabelas

1. **E-commerce (Tray):** ~1.5M registros
   - `pedidos_ecommerce_tray`
   - `clientes_tray_ecommerce`
   - `produtos_vendidos_tray_ecommerce`

2. **ERP (Bling):** ~500k registros
   - `bling_produtos_distribuicao`
   - `bling_produtos_ecommerce`
   - `bling_pedidos_venda_distribuicao`

3. **NFe/XML:** ~90k registros
   - `nfe_xml_importado`
   - `nfe_xml_itens`

4. **Redes Sociais (Ads):** ~100k registros
   - `facebook_ad_*`
   - `instagram_*`
   - `tiktokads_*`

## 📦 Deploy

### Frontend (Render.com)
```bash
git add .
git commit -m "tipo: descrição"
git push origin main
# Deploy automático em ~5 minutos
```

**Build Commands (Render):**
- Build: `npm install`
- Start: `node server.js`

### Backend (Local via Tauri)
```bash
# Desenvolvimento
npm run tauri dev

# Build de produção
npm run tauri build

# Apenas frontend React
npm run dev
```

### Cloudflare Tunnel
```bash
# Iniciar túnel temporário
cloudflared tunnel --url http://localhost:3001

# URL gerada (exemplo):
# https://shanghai-sean-unlikely-prairie.trycloudflare.com
```

## 🛠️ Scripts Úteis

| Script | Descrição |
|---|---|
| `otimizar_thumbnails.js` | Otimiza todas as thumbnails dos catálogos |
| `verificar_luna_cosmeticos.js` | Analisa estrutura do banco de dados |
| `verificar_dados_servidor.js` | Conecta ao servidor remoto e lista dados |

## 📚 Documentação Completa

**Leia antes de fazer alterações:**
- **[ARQUITETURA_SISTEMA.md](./ARQUITETURA_SISTEMA.md)** — Documentação técnica completa
- **[CHECKPOINTS.md](./CHECKPOINTS.md)** — Histórico de versões estáveis
- **[stack.md](./stack.md)** — Guia de estudos das tecnologias

## 🔧 Tecnologias

### Backend
- Tauri 1.x (Rust + Web)
- Axum 0.6 (framework HTTP)
- Rust 1.70+ (edition 2021)
- Tokio (runtime assíncrono)
- MySQL Async 0.31
- Serde JSON (serialização)
- Tower HTTP (middleware)

### Frontend (Proxy)
- Node.js 18.x LTS
- Express.js 4.18
- Axios (HTTP client)

### Frontend (Desktop)
- React 18 + TypeScript 5
- Vite 4 (build tool)
- CSS Modules / Styled Components

### Infraestrutura
- Cloudflare Tunnel (cloudflared)
- Render.com (hospedagem free tier)
- MySQL 8.x (banco local)

### Utilitários
- Sharp (otimização de imagens)
- FFmpeg (futuro - vídeos)
- PowerShell (scripts Windows)

## 🚨 Troubleshooting

### Frontend não acessa backend
1. Verificar se Cloudflare Tunnel está rodando
2. Checar URL no `.env` do frontend (`LUNA_API_URL`)
3. Validar CORS no backend Rust

### Thumbnails não aparecem
1. Executar `node otimizar_thumbnails.js`
2. Verificar permissões na pasta `F:\luna_cosmeticos\catalogos`
3. Checar rota `/api/catalogo/imagem` no backend

### Deploy falha no Render
1. Verificar logs em https://dashboard.render.com
2. Checar se `package.json` está na pasta `frontend/disparo`
3. Validar variáveis de ambiente (`LUNA_API_URL`)

### Banco de dados não conecta
1. MySQL rodando na porta 3306?
2. Credenciais corretas no `.env` do backend
3. Database `luna_cosmeticos` existe?

### Cloudflare Tunnel cai
1. Processo `cloudflared` foi encerrado
2. Reiniciar com `cloudflared tunnel --url http://localhost:3001`
3. Atualizar URL no frontend Render

## 📞 Suporte

Em caso de dúvidas, consulte:
1. **ARQUITETURA_SISTEMA.md** — documentação técnica completa
2. **CHECKPOINTS.md** — histórico de versões e rollback
3. **stack.md** — guia de estudos das tecnologias
4. Logs do backend Tauri (console do terminal)
5. Logs do Render (dashboard → service → logs)

---

**Última Atualização:** 25/08/2026  
**Versão:** v10-thumb-carrossel

**Domínios em produção:**
- Frontend Proxy: https://luna-disparo.onrender.com
- Backend: Via Cloudflare Tunnel (URL dinâmica)

**Catálogos ativos:**
- Alphahall: 41 kits
- Thumbnails otimizadas: 41/41 (100%)
- Economia de banda: 23 MB (95% de redução)
