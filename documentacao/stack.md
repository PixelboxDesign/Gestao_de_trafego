# LUNA COSMÉTICOS — GUIA DE STACK TECNOLÓGICA

> **Objetivo:** Este documento serve como guia de estudos sobre as tecnologias usadas no projeto.
> Ele mapeia cada parte do sistema, identifica a tecnologia utilizada e explica didaticamente seu papel.
>
> **Diferença em relação à ARQUITETURA_SISTEMA.md:**
> - `ARQUITETURA_SISTEMA.md` → foca em fluxos, rotas, estrutura de dados e comportamentos
> - `stack.md` (este arquivo) → foca nas **tecnologias e linguagens** em si

---

## VISÃO GERAL DA STACK

```
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND LOCAL          FRONTEND PROXY         INFRA            │
│  Rust + Tauri           Node.js + Express      Cloudflare       │
│  Axum + Tokio           HTTP Proxy Middleware  Quick Tunnel     │
│  MySQL Async            Sharp (Node.js)        Render.com       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. LINGUAGENS

### Rust

**Onde é usado:** Backend completo (pasta `backend/src-tauri/src/*.rs`).

**O que é:** Linguagem de programação de sistemas com foco em segurança de memória, performance e concorrência. Compilada (gera executáveis nativos), sem garbage collector.

**Por que usar na Luna:**
- Performance nativa: ideal para file server de imagens
- Segurança de memória: previne buffer overflows e race conditions
- Concorrência sem medo: sistema de ownership evita data races
- Integração com Tauri: permite criar aplicativos desktop híbridos (Rust + Web)
- Binário único: todo o backend cabe em um executável standalone

**Exemplo prático no projeto:**
```rust
// main.rs — entry point do backend
#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/catalogo/kits/:marca", get(listar_kits))
        .route("/api/catalogo/imagem/:marca/:kit/:arquivo", get(servir_imagem));
    
    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

### TypeScript

**Onde é usado:** Frontend desktop (Tauri UI), futuros componentes React.

**O que é:** Superset do JavaScript com tipagem estática. Compila para JavaScript antes de rodar.

**Por que usar na Luna:**
- Detecta erros antes de rodar (ex: passar número onde espera string)
- Autocomplete preciso no editor
- Facilita refatoração em projetos que crescem

**Exemplo prático (futuro painel desktop):**
```typescript
// types.ts — define estrutura de um kit
export interface Kit {
  nome: string;
  preco: string;
  descricao: string;
  sku_kit: string;
  imagens: string[];  // ← o editor avisa se você tentar colocar number
}

// api.ts — consumo da API tipado
async function listarKits(marca: string): Promise<Kit[]> {
  const response = await fetch(`/api/catalogo/kits/${marca}`);
  const data = await response.json();
  return data.kits;  // ← TypeScript valida se data.kits é Kit[]
}
```

### JavaScript (JS)

**Onde é usado:** `frontend/disparo/server.js` (proxy Express), `scripts/otimizar_thumbnails.js`.

**O que é:** Linguagem dinâmica, interpretada, sem tipagem estática. É a linguagem nativa do Node.js.

**Por que alguns arquivos usam JS em vez de TS:** São scripts simples e servidor básico que não precisam da complexidade de compilação do TypeScript. São pequenos e executados diretamente pelo Node.js.

### SQL

**Onde é usado:** Conexão com banco MySQL em `backend/src-tauri/src/db.rs`.

**O que é:** Structured Query Language — linguagem para interagir com bancos de dados relacionais.

**Papel no projeto:**
- `SELECT * FROM bling_produtos_distribuicao WHERE sku = ?` — consulta produtos
- `INSERT INTO ...` — futuro: inserir logs de acesso aos catálogos
- `UPDATE ...` — futuro: atualizar contadores de visualizações

**Atualmente:** O sistema de catálogos **não usa SQL** para servir os kits (usa arquivos JSON). O banco está disponível para futuras features (analytics, controle de estoque).

### JSON

**Onde é usado:** `info.json` em cada pasta de kit, respostas da API.

**O que é:** JavaScript Object Notation — formato de texto leve para troca de dados.

**Papel no projeto:** Armazenamento de metadados de cada kit (preço, descrição, SKUs).

**Exemplo:**
```json
{
  "preco": "R$ 178,00",
  "descricao": "Kit completo...",
  "sku_kit": "00031",
  "skus_itens": [
    { "sku": "00031-A", "nome": "Shampoo", "quantidade": 1 }
  ],
  "imagens": ["1.jpg", "2.jpg"]
}
```

### Markdown (MD)

**Onde é usado:** Toda a pasta `documentacao/`.

**O que é:** Linguagem de marcação leve para escrever texto formatado (`#` para títulos, `**` para negrito).

**Papel no projeto:** Documentação técnica, checkpoints, guias. Renderizado automaticamente pelo GitHub.

---

## 2. BACKEND (`backend/src-tauri/`)

### Tauri

**Arquivos:** `backend/src-tauri/src/main.rs`, `backend/src-tauri/tauri.conf.json`.

**O que é:** Framework para criar aplicativos desktop usando tecnologias web (HTML/CSS/JS) como frontend e Rust como backend. É o que o VS Code usa (porém VS Code usa Electron, Tauri é mais leve).

**Papel no projeto:** 
- Backend Rust (API REST com Axum)
- Futuro painel desktop React para gerenciar catálogos

**Por que Tauri em vez de Electron:**
- Executável 10x menor (~5MB vs ~50MB)
- Usa webview do sistema (Edge/Safari/WebKit) em vez de embutir Chromium
- Menor uso de RAM

### Axum

**Arquivo:** `backend/src-tauri/src/routes.rs`.

**O que é:** Framework web moderno para Rust, focado em ergonomia e performance. É como o Express.js, mas para Rust.

**Como funciona na Luna:**
```rust
use axum::{Router, routing::get};

let app = Router::new()
    .route("/health", get(health_check))
    .route("/api/catalogo/kits/:marca", get(listar_kits))
    .layer(CorsLayer::permissive());  // CORS para frontend remoto
```

**Papel no projeto:** Define todas as rotas da API REST, aplica middlewares (CORS), serve arquivos estáticos.

### Tokio

**Arquivo:** Usado implicitamente em todo código Rust assíncrono (`async fn`, `.await`).

**O que é:** Runtime assíncrono para Rust. Permite executar milhares de tarefas concorrentes sem criar uma thread para cada uma (similar ao `async/await` do JavaScript).

**Por que é necessário:** Axum é assíncrono — precisa do Tokio para funcionar. O servidor web precisa atender múltiplas requisições HTTP simultaneamente.

**Como aparece no código:**
```rust
#[tokio::main]  // ← Macro que inicia o runtime Tokio
async fn main() {
    let app = setup_routes().await;  // ← .await = operação assíncrona
    axum::Server::bind(&addr).serve(app).await.unwrap();
}
```

### mysql_async

**Arquivo:** `backend/src-tauri/src/db.rs` (futuro).

**O que é:** Driver assíncrono para MySQL em Rust. Permite executar queries sem bloquear outras operações.

**Como seria usado (futuro):**
```rust
let pool = mysql_async::Pool::new("mysql://root:senha@localhost/luna_cosmeticos");
let produtos: Vec<Produto> = pool.get_conn().await?
    .query("SELECT * FROM bling_produtos_distribuicao WHERE categoria = 'Cabelo'")
    .await?;
```

**Atualmente:** Não usado — catálogos vêm de arquivos JSON.

### Serde

**Arquivos:** Todos os arquivos Rust que trabalham com JSON.

**O que é:** Biblioteca de serialização/desserialização para Rust. Converte structs Rust ↔ JSON.

**Exemplo prático:**
```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]  // ← Serde gera código automaticamente
struct Kit {
    nome: String,
    preco: String,
    sku_kit: String,
}

// Ler JSON do arquivo info.json → struct Kit
let kit: Kit = serde_json::from_str(&json_string)?;

// Converter struct Kit → JSON para resposta HTTP
let json = serde_json::to_string(&kit)?;
```

### Tower HTTP

**Arquivo:** Importado em `routes.rs` para CORS e servir arquivos estáticos.

**O que é:** Coleção de middlewares HTTP modulares para Rust.

**Como é usado:**
```rust
use tower_http::cors::CorsLayer;
use tower_http::services::ServeFile;

let cors = CorsLayer::new()
    .allow_origin(Any)             // Permite qualquer origem
    .allow_methods([Method::GET]); // Apenas GET

let app = Router::new()
    .route("/health", get(health_check))
    .layer(cors);  // ← Aplica CORS em todas as rotas
```

**Papel:** Resolve problema de CORS (frontend no Render.com precisa acessar backend via Cloudflare).

---

## 3. FRONTEND PROXY (`frontend/disparo/`)

### Node.js

**Arquivo:** `frontend/disparo/server.js`.

**O que é:** Ambiente de execução JavaScript fora do browser. Permite usar JS/TS no servidor.

**Papel no projeto:** É o "motor" que roda o proxy Express.js no Render.com.

### Express.js

**Arquivo:** `frontend/disparo/server.js`.

**O que é:** Framework minimalista para criar servidores HTTP com Node.js.

**Como funciona na Luna:**
```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Todas as requisições /api/* são roteadas para o Cloudflare Tunnel
app.use('/api', createProxyMiddleware({
  target: process.env.LUNA_API_URL,  // https://*.trycloudflare.com
  changeOrigin: true,
  timeout: 30000
}));

app.listen(3000);
```

**Papel no projeto:** Recebe requisições do browser e as encaminha para o backend local (via Cloudflare Tunnel).

### http-proxy-middleware

**Arquivo:** `frontend/disparo/server.js`.

**O que é:** Middleware do Express que funciona como proxy reverso.

**Por que é necessário:** 
- Frontend no Render.com não pode acessar diretamente `localhost` da máquina local
- Cloudflare Tunnel expõe apenas temporariamente (URL muda)
- Proxy centraliza o roteamento — se a URL do Cloudflare mudar, só precisa atualizar 1 variável de ambiente

---

## 4. PROCESSAMENTO DE IMAGENS

### Sharp

**Arquivo:** `scripts/otimizar_thumbnails.js`.

**O que é:** Biblioteca Node.js de processamento de imagens de alta performance. Usa a biblioteca C++ `libvips` internamente.

**Papel no projeto:**
- Redimensiona thumbnails de 600KB para 30KB
- Converte PNG → JPEG com qualidade 85%
- Processa 41 kits em ~5 segundos

**Exemplo do script:**
```javascript
const sharp = require('sharp');

await sharp('thumb_original.png')
  .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 85, progressive: true })
  .toFile('thumb.png');

console.log('Economia: 570KB (95%)');
```

**Por que é mais rápido que alternativas JS puras:** Usa processamento nativo (C++) via NAPI, não JavaScript interpretado.

---

## 5. INFRAESTRUTURA

### Cloudflare Tunnel

**Binário:** `cloudflared.exe` (Windows) ou `cloudflared` (Linux/Mac).

**O que é:** Ferramenta de linha de comando que cria um túnel seguro entre uma aplicação local e a internet, sem precisar abrir portas no firewall.

**Como funciona:**
1. `cloudflared` conecta ao servidor Cloudflare via outbound HTTPS
2. Cloudflare aloca uma URL pública (`https://*.trycloudflare.com`)
3. Requisições para essa URL são roteadas de volta para `localhost:3001`
4. Tudo acontece por HTTPS (certificado gerenciado pelo Cloudflare)

**Comando usado:**
```bash
cloudflared tunnel --url http://localhost:3001
# Output: https://shanghai-sean-unlikely-prairie.trycloudflare.com
```

**Quick Tunnel vs Named Tunnel:**
- **Quick Tunnel** (usado): URL temporária, sem autenticação, gratuito
- **Named Tunnel**: URL fixa, requer conta Cloudflare, mais configuração

### Render.com

**O que é:** Plataforma de hospedagem cloud com free tier para sites estáticos e web services.

**Papel no projeto:** Hospeda o proxy Express.js que roteia requisições do browser para o backend local.

**Plano usado:** Free tier
- 750 horas/mês grátis
- Dorme após 15min de inatividade
- Acordar: ~30-60s (cold start)
- Deploy automático via Git push

**Configuração no Render:**
- Build Command: `npm install`
- Start Command: `node server.js`
- Environment: `LUNA_API_URL=https://*.trycloudflare.com`

### Git + GitHub

**O que são:**
- **Git** → sistema de controle de versão distribuído
- **GitHub** → plataforma de hospedagem de repositórios Git

**Papel no projeto:**
- Versionamento de todo o código
- Trigger de deploys automáticos no Render (push → build → live)
- Sistema de checkpoints (commits específicos como pontos de restauração)

---

## 6. BANCO DE DADOS

### MySQL 8.x

**Onde roda:** Localmente na máquina (localhost:3306).

**O que é:** Sistema de gerenciamento de banco de dados relacional (RDBMS). Armazena dados em tabelas com linhas e colunas, com suporte a relacionamentos (foreign keys), índices e transações.

**Papel atual no projeto:** Disponível para futuras features (analytics, controle de estoque, sincronização com Bling/Tray).

**Estrutura existente:**
- `luna_cosmeticos` database
- 78 tabelas (Tray, Bling, NFe, Redes Sociais)
- 2.5 milhões de registros
- 687 MB de dados

**Futuro uso:**
```sql
-- Registrar visualização de kit
INSERT INTO catalogo_views (kit_id, ip_address, viewed_at) 
VALUES ('Kit Banho de Seda', '192.168.1.1', NOW());

-- Consultar kits mais visualizados
SELECT kit_id, COUNT(*) as views 
FROM catalogo_views 
WHERE viewed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY kit_id 
ORDER BY views DESC 
LIMIT 10;
```

---

## 7. FORMATOS DE DADOS

| Formato | Onde é usado | Para quê |
|---|---|---|
| **JSON** | API REST, info.json | Troca de dados entre frontend e backend |
| **JPEG** | Thumbnails, imagens de carrossel | Formato de imagem comprimido (fotos) |
| **PNG** | Thumbnails originais (backup) | Formato de imagem sem perda (logos, gráficos) |
| **Markdown** | Documentação | Documentos formatados legíveis |
| **TOML** | Cargo.toml | Configuração de dependências Rust |

---

## 8. FERRAMENTAS DE DESENVOLVIMENTO

### Gerenciadores de Pacotes

| Linguagem | Gerenciador | Arquivo de manifesto |
|---|---|---|
| Rust | `cargo` | `Cargo.toml` |
| Node.js | `npm` | `package.json` |

### IDEs/Editores Recomendados

**VSCode com extensões:**
- `rust-analyzer` — LSP para Rust (autocomplete, errors inline)
- `Tauri` — Snippets e helpers para Tauri
- `ESLint` — Linter para JavaScript/TypeScript
- `Prettier` — Formatador de código

### Utilitários

- **cloudflared** — Gerenciador de túneis Cloudflare
- **sharp** — Otimização de imagens (Node.js)
- **cargo watch** — Auto-rebuild ao salvar código Rust
- **nodemon** — Auto-restart do servidor Node.js ao salvar

---

## 9. SCRIPTS PRINCIPAIS

### Backend (Tauri)

```bash
# Desenvolvimento (hot reload)
cd backend
npm run tauri dev

# Build de produção (gera executável)
npm run tauri build

# Apenas backend Rust (sem UI)
cd backend/src-tauri
cargo run
```

### Frontend Proxy (Render)

```bash
# Local
cd frontend/disparo
npm install
node server.js

# Deploy
git push origin main  # Automático via Render
```

### Utilitários

```bash
# Otimizar todas as thumbnails
cd scripts
node otimizar_thumbnails.js

# Verificar estrutura do banco
node verificar_luna_cosmeticos.js

# Iniciar túnel Cloudflare
cloudflared tunnel --url http://localhost:3001
```

---

## 10. PERFORMANCE

### Métricas de Otimização de Thumbnails

| Métrica | Antes | Depois | Ganho |
|---|---|---|---|
| Tamanho médio | 600 KB | 30 KB | 95% |
| Total (41 kits) | 24,6 MB | 1,23 MB | 23 MB economizados |
| Carregamento (4G) | ~8s | ~1.5s | 81% mais rápido |

### Tempos de Resposta (estimados)

- **Health check**: <50ms
- **Lista de kits**: <200ms (leitura de 41 arquivos JSON)
- **Thumbnail otimizada**: <300ms (primeira vez) | <10ms (cache)
- **Imagem carrossel**: <500ms (primeira vez) | <10ms (cache)

### Cache no Browser

```
Thumbnails: Cache-Control: public, max-age=86400 (24h)
→ Segunda visita ao catálogo: 0 requisições de imagem ao servidor
→ Economia de banda: ~1 MB por usuário que retorna
```

---

## 11. SEGURANÇA

### Rust Safety

**Memory safety sem garbage collector:**
- Ownership system previne use-after-free e double-free
- Borrow checker previne data races
- Não há null pointer exceptions (usa `Option<T>` e `Result<T, E>`)

**Exemplo de erro de compilação que previne bug:**
```rust
let mut v = vec![1, 2, 3];
let first = &v[0];  // ← Empréstimo imutável
v.push(4);          // ← Tentativa de modificar vetor emprestado
println!("{}", first);  // ← Erro de compilação: cannot borrow as mutable
```

### CORS

Configurado no backend com `tower_http::cors`:
```rust
CorsLayer::new()
    .allow_origin(Any)
    .allow_methods([Method::GET])
    .allow_headers([header::CONTENT_TYPE])
```

### Path Traversal

Sanitização de caminhos:
```rust
fn sanitize_path(path: &str) -> String {
    path.replace("..", "")
        .replace("\\", "/")
}
```

### Extensões Permitidas

Apenas `.jpg`, `.jpeg`, `.png` podem ser servidos pela rota de imagens.

---

## 12. ARQUIVOS DE CONFIGURAÇÃO

| Arquivo | Tecnologia | Função |
|---|---|---|
| `Cargo.toml` | TOML | Configura dependências Rust (axum, tokio, serde) |
| `tauri.conf.json` | JSON | Configuração do Tauri (window, permissions, build) |
| `package.json` | JSON | Define dependências Node.js (express, sharp) |
| `.env` | Plain text | Variáveis de ambiente sensíveis (nunca commitado) |
| `.gitignore` | Plain text | Lista de arquivos que o Git deve ignorar |

---

## 13. CRATES RUST PRINCIPAIS

**Definidas em `backend/src-tauri/Cargo.toml`:**

```toml
[dependencies]
tauri = { version = "1.4", features = ["shell-open"] }
axum = "0.6"
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tower = "0.4"
tower-http = { version = "0.4", features = ["fs", "cors"] }
mysql_async = "0.31"
```

**O que cada uma faz:**

| Crate | Função |
|---|---|
| `tauri` | Core do Tauri (IPC, window management) |
| `axum` | Framework HTTP assíncrono |
| `tokio` | Runtime assíncrono (event loop, tasks) |
| `serde` | Serialização/desserialização (JSON ↔ Struct) |
| `serde_json` | Parser JSON específico |
| `tower` | Middlewares HTTP modulares |
| `tower-http` | Middlewares específicos (CORS, file serving) |
| `mysql_async` | Driver MySQL assíncrono |

---

## 14. DEPENDÊNCIAS NODE.JS PRINCIPAIS

**Definidas em `frontend/disparo/package.json`:**

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "http-proxy-middleware": "^2.0.6",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "sharp": "^0.32.0"
  }
}
```

**O que cada uma faz:**

| Pacote | Função |
|---|---|
| `express` | Framework HTTP para Node.js |
| `http-proxy-middleware` | Middleware de proxy reverso |
| `dotenv` | Carrega variáveis de `.env` para `process.env` |
| `sharp` | Processamento de imagens (otimização) |

---

> **Última atualização:** 25/08/2026
> Este arquivo deve ser atualizado sempre que uma nova tecnologia for adicionada ao projeto.

