# PIXELBOX PORTAL — GUIA DE STACK TECNOLÓGICA

> **Objetivo:** Este documento serve como guia de estudos sobre as tecnologias usadas no projeto.
> Ele mapeia cada parte do sistema, identifica a tecnologia utilizada e explica didaticamente seu papel.
>
> **Diferença em relação à ARQUITETURA_SISTEMA.md:**
> - `ARQUITETURA_SISTEMA.md` → foca em fluxos, rotas, banco de dados e comportamentos
> - `stack.md` (este arquivo) → foca nas **tecnologias e linguagens** em si

---

## VISÃO GERAL DA STACK

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (3 apps)          BACKEND              INFRA           │
│  TypeScript + React         TypeScript           Tailscale       │
│  Vite + Tailwind CSS        Node.js + Express    Render.com      │
│  TanStack Query             MariaDB              Electron        │
│  Zustand + Framer Motion    WhatsApp Web.js      PowerShell      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. LINGUAGENS

### TypeScript

**Onde é usado:** Em todos os arquivos `.ts` e `.tsx` do projeto (backend e os 3 frontends).

**O que é:** TypeScript é um superset do JavaScript — ou seja, é JavaScript com tipagem estática adicionada por cima. Todo código TypeScript é convertido (transpilado) para JavaScript antes de rodar.

**Por que usar no PixelBox:**
- Detecta erros antes de rodar o código (ex: passar uma string onde se espera número)
- O editor consegue sugerir autocomplete preciso (ex: ao digitar `project.`, aparece todos os campos disponíveis)
- Em projetos grandes com múltiplas telas e APIs, a tipagem evita bugs difíceis de rastrear

**Exemplo prático no projeto:**
```typescript
// types/index.ts — define a forma exata de um projeto
export type ProjectStatus = 'received' | 'paid' | 'courtesy' | ...;

export interface Project {
  id: string;
  title: string;
  status: ProjectStatus;  // ← o editor avisa se você digitar um status inválido
  value?: number;
}
```

---

### TSX (TypeScript + JSX)

**Onde é usado:** Todos os arquivos `.tsx` — componentes React (ex: `Dashboard.tsx`, `Projects.tsx`).

**O que é:** TSX é TypeScript com a sintaxe JSX embutida. JSX permite escrever o que parece HTML dentro do código TypeScript, mas na verdade é uma forma abreviada de criar elementos React.

**Como funciona:**
```tsx
// Isso que você escreve (TSX):
function Botao({ label }: { label: string }) {
  return <button className="btn">{label}</button>;
}

// O que o compilador gera (JavaScript puro):
function Botao({ label }) {
  return React.createElement('button', { className: 'btn' }, label);
}
```

**Por que parece HTML mas não é:**
- `className` em vez de `class` (palavra reservada no JS)
- `onClick` em vez de `onclick`
- Expressões `{variavel}` dentro das tags
- Precisa de uma única tag raiz por componente

---

### JavaScript (JS)

**Onde é usado:** `apps/portfolio/server.js` e `gerenciamento_sessao/supervisor-app/server.js`.

**O que é:** JavaScript puro, sem tipagem. É a linguagem nativa do browser e do Node.js.

**Por que esses arquivos usam JS em vez de TS:** São servidores simples (o Supervisor de logs e o servidor de keep-alive do portfolio) que não precisam da complexidade de compilação do TypeScript. São arquivos pequenos rodados diretamente pelo Node.js.

---

### SQL

**Onde é usado:** `backend/src/config/migrateModule.ts` — as queries `CREATE TABLE`, `ALTER TABLE`.

**O que é:** SQL (Structured Query Language) é a linguagem para interagir com bancos de dados relacionais. No PixelBox é usado com o dialeto do **MariaDB/MySQL**.

**Papel no projeto:**
- `CREATE TABLE IF NOT EXISTS` → cria tabelas na primeira execução
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` → adiciona colunas sem destruir dados existentes (migrations aditivas)
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` → operações de dados nos controllers

---

### Markdown (MD)

**Onde é usado:** Toda a pasta `documentacao/`, `README.md` nos subprojetos, comentários de setup.

**O que é:** Linguagem de marcação leve para escrever texto formatado usando símbolos simples (`#` para títulos, `**` para negrito, etc.).

**Papel no projeto:** Documentação técnica, checkpoints de versão, guias de setup. Arquivos `.md` são renderizados automaticamente pelo GitHub como páginas formatadas.

---

### PowerShell (.ps1)

**Onde é usado:** `capturar-thumbs-clientes-v2.ps1`, `extrair-thumb-windows.ps1`.

**O que é:** Linguagem de script do Windows, muito mais poderosa que o CMD. Permite acessar APIs do Windows que o Node.js não consegue diretamente.

**Papel no projeto:** Geração de thumbnails usando a **Windows Shell API** — o mesmo mecanismo que o Windows Explorer usa para gerar previews de arquivos. Isso permite gerar miniaturas de arquivos `.cdr` (CorelDRAW), `.psd` (Photoshop) e outros formatos proprietários sem precisar abrir os programas.

---

### Batch (.bat) e VBScript (.vbs)

**Onde é usado:** `INICIAR_SUPERVISOR_SEM_TERMINAL.vbs`, `CRIAR_ATALHOS_DESKTOP.bat`, `INICIAR_BACKEND_AGORA.bat`.

**O que são:**
- `.bat` → scripts de linha de comando do Windows (CMD)
- `.vbs` → VBScript, linguagem de script antiga do Windows que permite abrir processos sem mostrar janela de terminal

**Papel no projeto:** O `.vbs` é especialmente importante — ele inicia o Supervisor Electron sem abrir uma janela de terminal visível, dando a sensação de um aplicativo desktop normal ao iniciar o sistema.

---

## 2. BACKEND (`backend/`)

### Node.js

**Arquivos:** `backend/src/server.ts` (entry point), todos os `.ts` do backend.

**O que é:** Ambiente de execução JavaScript/TypeScript fora do browser. Permite usar JS/TS no servidor, assim como Java ou Python são usados em backends tradicionais.

**Papel no projeto:** É o "motor" que roda o servidor da API. Recebe requisições HTTP, executa lógica de negócio, acessa o banco de dados e retorna respostas JSON.

---

### Express.js

**Arquivos:** `backend/src/server.ts`, `backend/src/routes/*.ts`.

**O que é:** Framework minimalista para criar servidores HTTP com Node.js. Define como o servidor responde a cada URL.

**Como funciona no PixelBox:**
```typescript
// server.ts
app.use('/api/projects', authenticate, projectsRoutes);
// ↑ Qualquer requisição para /api/projects passa pelo middleware de auth
//   e depois vai para o router de projetos
```

**Papel no projeto:** Define todas as rotas da API (`/api/projects`, `/api/whatsapp`, etc.), aplica middlewares de autenticação, CORS, rate limiting e tratamento de erros.

---

### ts-node-dev

**Arquivo:** Script `dev` no `package.json` do backend.

**O que é:** Ferramenta que executa TypeScript diretamente (sem precisar compilar para JS primeiro) e reinicia o servidor automaticamente quando um arquivo é salvo (hot reload).

**Papel no projeto:** Usado apenas em desenvolvimento. Em produção, o TypeScript seria compilado para JS antes de rodar. No PixelBox local, o backend roda sempre via `ts-node-dev` pelo supervisor.

---

### mysql2

**Arquivos:** `backend/src/config/database.ts`, todos os controllers.

**O que é:** Driver Node.js para conectar e executar queries em bancos MySQL/MariaDB. Usa Promises para operações assíncronas.

**Como é usado:**
```typescript
const [rows] = await pool.execute(
  'SELECT * FROM projects WHERE client_id = ?',
  [clientId]
);
```
O `?` é um placeholder que previne SQL Injection — o driver substitui com segurança.

---

### MariaDB

**Onde roda:** Localmente na máquina, porta 3306.

**O que é:** Banco de dados relacional, fork open-source do MySQL. Armazena dados em tabelas com linhas e colunas, com suporte a relacionamentos, índices e transações.

**Papel no projeto:** É a fonte de verdade de todos os dados: clientes, projetos, arquivos, aprovações, telemetria, notificações WhatsApp. Tem 23+ tabelas com migrations automáticas no startup.

---

### JWT (jsonwebtoken)

**Arquivos:** `backend/src/middleware/auth.ts`, `backend/src/controllers/auth.controller.ts`.

**O que é:** JSON Web Token — um formato de token seguro para autenticação. Contém dados codificados (payload) assinados com uma chave secreta.

**Como funciona:**
```
Login → servidor gera token JWT com { id, role, login }
       → cliente armazena no localStorage
       → a cada requisição, envia no header: Authorization: Bearer <token>
       → servidor valida a assinatura e extrai os dados
```

**Dois tipos no projeto:**
- **Access Token** (7 dias) → usado nas requisições normais
- **Refresh Token** (30 dias) → usado para renovar o access token sem novo login

---

### bcryptjs

**Arquivo:** `backend/src/controllers/auth.controller.ts`.

**O que é:** Biblioteca de hashing de senhas. Transforma uma senha em um hash irreversível usando o algoritmo bcrypt.

**Por que não salvar a senha diretamente:** Se o banco vazar, as senhas ficam protegidas. O bcrypt é "lento por design" — dificulta ataques de força bruta.

---

### Multer

**Arquivo:** `backend/src/middleware/upload.ts`.

**O que é:** Middleware para Express que processa uploads de arquivos (`multipart/form-data`).

**Papel no projeto:** Recebe arquivos enviados pelo admin (thumbs de projetos, versões de aprovação) e os salva temporariamente em disco para processamento posterior.

---

### Sharp

**Arquivo:** Usado nos controllers de projetos e portfolio.

**O que é:** Biblioteca Node.js de processamento de imagens de alta performance. Usa a biblioteca C++ libvips internamente.

**Papel no projeto:**
- Redimensiona thumbnails de projetos (400×300px, JPEG 85%)
- Otimiza imagens do portfolio (max 1920px)
- Converte formatos (PNG → JPEG)
- É muito mais rápido que alternativas JS puras

---

### FFmpeg

**Onde é chamado:** `backend/src/controllers/projectApprovals.controller.ts` e no warmup do portfolio.

**O que é:** Ferramenta de linha de comando para processamento de vídeo e áudio. É o padrão da indústria para conversão e otimização de mídia.

**Papel no projeto:**
- Converte vídeos enviados para H.264 CRF23 (codec eficiente)
- Adiciona `faststart` (move metadados para o início do arquivo, permitindo streaming imediato)
- Gera thumbnails de vídeos (frame no 1 segundo)

---

### WhatsApp Web.js + Puppeteer

**Arquivo:** `backend/src/services/WhatsAppService.ts`, `backend/src/utils/patchWhatsAppClient.ts`.

**O que são:**
- **whatsapp-web.js** → biblioteca que automatiza o WhatsApp Web como se fosse um usuário humano
- **Puppeteer** → controla um browser Chrome headless (sem interface visual) em segundo plano

**Como funciona:** O Puppeteer abre uma instância invisível do Chrome, acessa `web.whatsapp.com`, escaneia o QR Code uma vez e mantém a sessão salva. As mensagens são enviadas programaticamente via esta sessão.

**Patch especial (arquivos grandes):** Para enviar arquivos >50MB, o sistema usa uma técnica de injeção de base64 em chunks de 512KB diretamente na página do Chrome, evitando o limite de serialização do protocolo CDP (Chrome DevTools Protocol).

---

### Winston

**Arquivo:** `backend/src/utils/logger.ts`.

**O que é:** Biblioteca de logging para Node.js com suporte a múltiplos transportes (console, arquivo, etc.).

**Papel no projeto:** Gera logs estruturados em formato NDJSON (uma linha JSON por evento) salvos em `F:\PixelBox\arquivos_server\logs\pixelbox-YYYY-MM-DD.ndjson`. Esses logs são consumidos pelo Supervisor para exibição em tempo real.

---

### Helmet + CORS + express-rate-limit

**Arquivo:** `backend/src/server.ts`.

**O que são:**
- **Helmet** → adiciona headers HTTP de segurança (Content-Security-Policy, X-Frame-Options, etc.)
- **CORS** → define quais origens (domínios) podem fazer requisições ao backend
- **express-rate-limit** → limita requisições por IP (2000 req/15min geral, 30 req/15min no login)

**Papel no projeto:** Camada de segurança do servidor. Sem CORS configurado, os frontends no Render.com não conseguiriam acessar o backend local.

---

## 3. FRONTEND ADMIN (`frontend/`)

### React 18

**Arquivos:** Todos os `.tsx` do frontend.

**O que é:** Biblioteca JavaScript para construir interfaces de usuário através de componentes reutilizáveis. Usa um Virtual DOM para atualizar apenas as partes da tela que mudaram.

**Conceito fundamental — Componente:**
```tsx
// Um componente é uma função que retorna UI
function KPIBadge({ label, value, color }: Props) {
  return (
    <div className="card p-4">
      <p className="text-xs">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
// Reutilizável: <KPIBadge label="Projetos" value={32} color="text-blue-400" />
```

---

### React Router DOM v6

**Arquivo:** `frontend/src/App.tsx`.

**O que é:** Biblioteca de roteamento para React. Permite que uma SPA (Single Page Application) simule múltiplas páginas sem recarregar o browser.

**Como funciona no projeto:**
```tsx
<Routes>
  <Route path="/admin" element={<Dashboard />} />
  <Route path="/admin/projects" element={<Projects />} />
  <Route path="/admin/projects/:id" element={<ProjectDetail />} />
</Routes>
```
O `:id` é um parâmetro dinâmico — `useParams()` captura o valor real da URL.

---

### TanStack Query (React Query) v5

**Arquivos:** Todos os componentes que buscam dados da API.

**O que é:** Biblioteca para gerenciamento de estado do servidor — busca, cache, sincronização e atualização de dados assíncronos.

**Por que não usar `useEffect` simples:**
```tsx
// Sem TanStack Query (problemático):
useEffect(() => {
  fetch('/api/projects').then(r => r.json()).then(setProjects);
}, []); // sem cache, sem loading state, sem retry...

// Com TanStack Query (o que o projeto usa):
const { data, isLoading } = useQuery({
  queryKey: ['projects', statusFilter, clientId],
  queryFn: () => projectsApi.list({ status: statusFilter, clientId }),
  staleTime: 120_000, // cache por 2 minutos
});
// ↑ Cache automático, loading state, retry em erro, refetch em foco de janela
```

---

### Zustand

**Arquivos:** `frontend/src/store/authStore.ts`, `frontend/src/store/previewStore.ts`.

**O que é:** Biblioteca minimalista de estado global para React. Alternativa ao Redux, muito mais simples.

**Papel no projeto:**
- `authStore` → armazena o usuário logado e tokens JWT (persiste no localStorage)
- `previewStore` → armazena o estado de "Ver como cliente" (qual cliente o admin está simulando)

---

### Axios

**Arquivos:** `frontend/src/api/client.ts` e todos os arquivos em `api/`.

**O que é:** Biblioteca HTTP para fazer requisições a APIs. Alternativa ao `fetch` nativo com mais recursos.

**Vantagens usadas no projeto:**
- Interceptors → adiciona o token JWT automaticamente em todas as requisições
- Timeout configurável → evita travamentos em downloads grandes
- `onDownloadProgress` → callback de progresso para a barra do achalote

---

### Vite

**Arquivo:** `vite.config.ts` em cada frontend.

**O que é:** Build tool (ferramenta de construção) moderna para projetos web. Substitui o Webpack.

**Dois modos:**
- **Dev** (`npm run dev`) → servidor local com hot module replacement (atualiza apenas o componente modificado, sem recarregar)
- **Build** (`npm run build`) → gera os arquivos otimizados para produção em `dist/`

**Por que é mais rápido que Webpack:** Usa ES Modules nativos do browser em dev, e esbuild (escrito em Go) para transpilação.

---

### Tailwind CSS

**Arquivos:** Configuração em `tailwind.config.js`, usado via classes em todos os `.tsx`.

**O que é:** Framework CSS utilitário — em vez de escrever CSS customizado, você aplica classes pré-definidas diretamente no HTML/TSX.

**Exemplo:**
```tsx
// Em vez de criar uma classe CSS separada:
<div className="card p-4 flex items-center gap-3 cursor-default">
//               ↑ borda  ↑ padding ↑ flexbox ↑ gap     ↑ cursor
```

**No PixelBox:** As classes `card`, `btn-primary`, `input` são classes customizadas definidas em `src/styles/globals.css` que combinam múltiplas classes Tailwind.

---

### Framer Motion

**Arquivos:** Componentes com animações (`motion.div`, `motion.button`).

**O que é:** Biblioteca de animações para React com API declarativa.

**Como é usado:**
```tsx
<motion.div
  initial={{ opacity: 0, y: 10 }}  // estado inicial
  animate={{ opacity: 1, y: 0 }}   // estado final
  transition={{ delay: i * 0.04 }} // timing
>
```

**Papel no projeto:** Animações de entrada dos cards de projeto, hover effects nos badges, animações das barras de progresso financeiras.

---

### Lucide React

**Arquivos:** Importado em praticamente todos os componentes.

**O que é:** Biblioteca de ícones SVG para React. Cada ícone é um componente React que aceita `size` e `className`.

**Uso:** `<Download size={16} className="text-blue-400" />`

---

## 4. FRONTEND CLIENTES (`apps/clientes/`)

Usa a mesma stack do Admin (React, TypeScript, Vite, Tailwind, TanStack Query, Zustand, Axios, Framer Motion, Lucide).

**Diferenças específicas:**
- Usa `HashRouter` em vez de `BrowserRouter` — as rotas ficam no `#` da URL (ex: `/#/client/projects`)
- Não tem `jspdf` (sem geração de PDF)
- Tem lógica de `pixelbox-logger` para telemetria
- Sistema de detecção de sessão admin (`window.__pixelboxAdminSession`)

---

## 5. FRONTEND PORTFOLIO (`apps/portfolio/`)

Mesma base tecnológica, com uma adição importante:

### @tanstack/react-virtual

**O que é:** Biblioteca de virtualização de listas. Renderiza apenas os itens visíveis na tela, mesmo que a lista tenha milhares de itens.

**Por que o portfolio precisa:** O portfólio pode ter centenas de imagens e vídeos. Sem virtualização, o browser tentaria renderizar todos ao mesmo tempo, travando. Com virtualização, apenas ~20 itens são renderizados por vez.

---

## 6. SUPERVISOR (`gerenciamento_sessao/supervisor-app/`)

### Node.js puro (JavaScript)

**Arquivo:** `supervisor-app/server.js`.

**O que é:** Servidor HTTP + WebSocket escrito em JavaScript puro (sem framework).

**Papel no projeto:**
- Recebe logs dos frontends via `POST /ingest`
- Persiste em arquivos NDJSON diários
- Transmite em tempo real via WebSocket para o painel de supervisão
- Faz keep-alive dos serviços Render a cada 2 minutos

---

### Electron

**Pasta:** `gerenciamento_sessao/supervisor-app/` (parte electron).

**O que é:** Framework para criar aplicativos desktop usando tecnologias web (HTML/JS/CSS). É o que o VS Code usa.

**Papel no projeto:** Cria a "casca" de aplicativo desktop que:
1. Inicia o Supervisor Node.js em background
2. Inicia o backend TypeScript via `ts-node-dev`
3. Monitora o Tailscale Funnel (reativa se desligar)
4. Não aparece como janela — roda silenciosamente na bandeja do sistema

---

## 7. INFRAESTRUTURA

### Tailscale Funnel

**Configuração:** `.env` → `RENDER_EXTERNAL_URL`.

**O que é:** Serviço de VPN + tunelamento que expõe serviços locais para a internet com HTTPS. Diferente do ngrok, é persistente e tem um domínio fixo.

**Papel no projeto:** Expõe o backend local (`localhost:3000`) para a internet em `https://desktop-e6jr4dk.tailc1230a.ts.net`. Sem isso, os frontends no Render.com não conseguiriam acessar o banco de dados local.

---

### Render.com

**O que é:** Plataforma de hospedagem cloud com free tier para sites estáticos.

**Papel no projeto:** Hospeda os 3 frontends (Admin, Clientes, Portfolio) como **Static Sites** — apenas HTML/CSS/JS estáticos, sem servidor. Deploy automático a cada `git push`.

---

### Git + GitHub

**O que são:**
- **Git** → sistema de controle de versão distribuído
- **GitHub** → plataforma de hospedagem de repositórios Git

**Papel no projeto:**
- Versionamento de todo o código
- Trigger de deploys automáticos no Render (push → build → live)
- Sistema de checkpoints (commits específicos como pontos de restauração)

---

## 8. ARQUIVOS DE CONFIGURAÇÃO

| Arquivo | Tecnologia | Função |
|---|---|---|
| `tsconfig.json` | JSON | Configura o compilador TypeScript (targets, paths, strict mode) |
| `vite.config.ts` | TypeScript | Configura o Vite (plugins, proxy de API, porta de dev) |
| `tailwind.config.js` | JavaScript | Define tema, cores e classes customizadas do Tailwind |
| `postcss.config.js` | JavaScript | Pipeline de processamento CSS (Tailwind precisa dele) |
| `.env` | Plain text | Variáveis de ambiente sensíveis (nunca commitadas) |
| `.gitignore` | Plain text | Lista de arquivos que o Git deve ignorar |
| `package.json` | JSON | Define dependências, scripts e metadados do projeto |
| `package-lock.json` | JSON | Trava as versões exatas de todas as dependências |

---

## 9. FORMATOS DE DADOS

| Formato | Onde é usado | Para quê |
|---|---|---|
| **JSON** | APIs REST, configs, package.json | Troca de dados entre frontend e backend |
| **NDJSON** | Logs em `arquivos_server/logs/` | Logs estruturados (uma linha JSON por evento) |
| **JWT** | Headers de autenticação | Tokens de acesso assinados |
| **FormData** | Uploads de arquivos | Envio de binários via HTTP |
| **Base64** | Envio de arquivos via WhatsApp | Codificação binária para texto |
| **WebM** | Animações (achalote, loading) | Formato de vídeo eficiente para web |

---

> **Última atualização:** 27/07/2026
> Este arquivo deve ser atualizado sempre que uma nova tecnologia for adicionada ao projeto.
