# PIXELBOX PORTAL — DOCUMENTAÇÃO OFICIAL DO SISTEMA
**Fonte Única de Verdade | Última Atualização: 12/07/2026**

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
4. [Frontend Admin — Páginas](#4-frontend-admin--páginas)
5. [App Clientes — Páginas](#5-app-clientes--páginas)
6. [App Portfolio — Páginas](#6-app-portfolio--páginas)
7. [Banco de Dados MariaDB](#7-banco-de-dados-mariadb)
8. [Sistema de Múltiplos Logins por Cliente](#8-sistema-de-múltiplos-logins-por-cliente)
9. [Sistema de Thumbs de Clientes](#9-sistema-de-thumbs-de-clientes)
10. [Sistema de Arquivos e Thumbs Portfolio](#10-sistema-de-arquivos-e-thumbs-portfolio)
11. [Sistema de Logs e Telemetria](#11-sistema-de-logs-e-telemetria)
12. [Integração Tailscale](#12-integração-tailscale)
13. [Supervisor](#13-supervisor)
14. [Módulo de Aprovação de Projetos](#14-módulo-de-aprovação-de-projetos)
15. [Sistema de Links Compartilhados](#15-sistema-de-links-compartilhados)
16. [Sistema de Download Requests](#16-sistema-de-download-requests)
17. [Fluxos de Dados](#17-fluxos-de-dados)
18. [Procedimentos Git e Deploy](#18-procedimentos-git-e-deploy)
19. [Segurança e Autenticação](#19-segurança-e-autenticação)
20. [Manutenção do Sistema](#20-manutenção-do-sistema)
21. [Troubleshooting](#21-troubleshooting)
22. [Variáveis de Ambiente](#22-variáveis-de-ambiente)
23. [Arquivos Essenciais](#23-arquivos-essenciais)
24. [Módulo WhatsApp](#24-módulo-whatsapp)
25. [Módulo Clube de Parceiros](#25-módulo-clube-de-parceiros)
26. [Changelog](#26-changelog)

---

## 1. VISÃO GERAL DA ARQUITETURA

### 1.1 Modelo de Deployment

O PixelBox Portal utiliza uma **arquitetura híbrida**:

- **Frontends** (3 apps): Hospedados no **Render.com** (free tier, região Oregon)
  - Admin: `https://admin-piv6.onrender.com`
  - Clientes: `https://clientes-5sjd.onrender.com`
  - Portfolio: `https://portifolio-e1g9.onrender.com`
- **Backend API**: Executa **LOCALMENTE** na máquina do usuário (porta **3000**)
- **Banco de Dados**: **MariaDB local** na máquina do usuário (porta 3306)
- **Supervisor de Logs**: Executa localmente na porta **4500**
- **Exposição Pública**: **Tailscale Funnel**
  - Domain: `https://desktop-e6jr4dk.tailc1230a.ts.net`
  - Rotas: `/` → `:3000` (backend API), `/logs` → `:4500` (supervisor)

```
┌──────────────────────────────────────────────────────────────────┐
│                          INTERNET                                │
└────────────┬────────────────────────────────────────────────────┘
             │
   ┌──────────┴──────────┐           ┌──────────────────────────┐
   │     RENDER.COM      │           │     TAILSCALE FUNNEL     │
   │  (Frontends Estáticos)          │  desktop-e6jr4dk.ts.net  │
   │                     │           │  /        → :3000        │
   │  Admin              │──API─────▶│  /logs    → :4500        │
   │  Clientes           │──API─────▶│                          │
   │  Portfolio          │──API─────▶│                          │
   │                     │  Logs────▶│                          │
   └─────────────────────┘           └────────────┬─────────────┘
                                                   │
                                     ┌─────────────▼──────────────┐
                                     │       MÁQUINA LOCAL         │
                                     │                             │
                                     │  Backend :3000  ──▶  MariaDB│
                                     │  Supervisor :4500           │
                                     │  F:\PixelBox\CLIENTES\      │
                                     │  F:\PixelBox\PORTIFÓLIO\    │
                                     └─────────────────────────────┘
```

### 1.2 Aplicações

| App | Função | URL Produção |
|---|---|---|
| **Admin** | Gestão de projetos, clientes, telemetria, manutenção | admin-piv6.onrender.com |
| **Clientes** | Portal do cliente — projetos, arquivos, downloads, aprovações | clientes-5sjd.onrender.com |
| **Portfolio** | Portfólio público — categorias, lightbox, vídeos | portifolio-e1g9.onrender.com |
| **Backend** | API REST + geração de thumbs + telemetria | Tailscale Funnel :3000 |
| **Supervisor** | Ingestão de logs + WebSocket ao vivo | Tailscale Funnel /logs → :4500 |

### 1.3 Stack Técnico

| Camada | Tecnologia |
|---|---|
| Backend | Node.js + Express + TypeScript + ts-node-dev |
| Banco | MariaDB/MySQL (mysql2/promise) |
| Frontends | React 18 + TypeScript + Vite + Tailwind CSS |
| Estado | TanStack Query (React Query) |
| Animações | Framer Motion |
| Ícones | Lucide React |
| Notificações | react-hot-toast |
| Upload | Multer |
| Imagens | Sharp (resize + JPEG/PNG otimizado) |
| Vídeo | FFmpeg (H.264 CRF23, faststart) |
| PDF | pdf-to-img (renderização de páginas como PNG) |
| Auth | JWT (jsonwebtoken) + bcrypt |
| WhatsApp | whatsapp-web.js + puppeteer-core (LocalAuth) |

---

## 2. INFRAESTRUTURA E DEPLOY

### 2.1 Render.com (Frontends)

- Plano: Free tier — dorme após 15min de inatividade
- Deploy: Automático via push no GitHub (~5 min)
- Variável obrigatória em todos: `VITE_API_URL=https://desktop-e6jr4dk.tailc1230a.ts.net`
- Keep-alive: Supervisor faz `HEAD /` a cada 2 minutos nos 3 serviços para evitar sleep

### 2.2 Backend Local

- **Porta**: 3000
- **Processo**: `ts-node-dev` com hot reload
- **Start**: via `INICIAR_SUPERVISOR_SEM_TERMINAL.vbs` (inicia tudo)
- **Migration automática**: Roda na inicialização (`CREATE TABLE IF NOT EXISTS` — idempotente)
- **Warmup**: 3s após iniciar — pré-aquece cache de portfolio + gera thumbs faltando + otimiza vídeos (60s depois)
- **Timeouts**: keepAliveTimeout=120s, headersTimeout=125s (para uploads grandes via Funnel)

### 2.3 Roteamento de Prioridade (server.ts)

⚠️ **Ordem crítica de registro**: `projectApprovalsRoutes` é registrado **antes** de `projectsRoutes` porque `projects.routes.ts` tem `GET /:id` que capturaria rotas estáticas como `/approval-share-tokens` se registrado primeiro.

---

## 3. BACKEND API — ROTAS COMPLETAS

### 3.1 Rotas Públicas (sem autenticação, montadas diretamente no server.ts)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Health check — retorna `{status:'ok', timestamp}` |
| `GET` | `/uploads/*` | Serve arquivos estáticos de upload |
| `GET` | `/arquivos-server/thumbs/*` | Serve thumbs geradas pelo Windows Shell |
| `GET` | `/api/projects/share/:token` | Dados públicos de versão via token de aprovação |
| `POST` | `/api/projects/share/:token/approve` | Aprovar versão via link público |
| `POST` | `/api/projects/share/:token/reject` | Rejeitar versão via link público (com comentário) |
| `GET` | `/api/projects/share/:token/file/:filename` | Servir arquivo da versão via token (stream/range) |
| `GET` | `/api/projects/share/:token/file/:filename/pages` | Contar páginas de PDF via token |
| `GET` | `/api/projects/share/:token/file/:filename/page/:pageNumber` | Servir página de PDF como PNG via token |
| `GET` | `/api/shared-links/:token` | Dados públicos do link de arquivos |
| `GET` | `/api/shared-links/:token/download/:fileId` | Download público de arquivo via link |
| `GET` | `/api/portfolio/categories` | Lista categorias do portfólio |
| `GET` | `/api/portfolio/categories/:category` | Lista empresas de uma categoria |
| `GET` | `/api/portfolio/categories/:category/:company/files` | Lista arquivos de uma empresa |
| `GET` | `/api/portfolio/search` | Busca no portfólio |
| `GET` | `/api/portfolio/prefetch-list` | Lista de thumbs para prefetch em background |
| `GET` | `/api/portfolio/image-thumb` | Serve thumbnail pública de imagem |

### 3.2 Autenticação (`/api/auth`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Login (rate limit 30/15min) |
| `POST` | `/api/auth/first-access` | — | Define senha no primeiro acesso |
| `POST` | `/api/auth/refresh` | — | Renova access token via refresh token |
| `POST` | `/api/auth/logout` | ✓ | Invalida refresh token |
| `PUT` | `/api/auth/change-password` | ✓ | Troca senha |
| `PUT` | `/api/auth/update-profile` | ✓ | Atualiza nome/email/avatar |
| `GET` | `/api/auth/me` | ✓ | Dados do usuário logado |
| `POST` | `/api/auth/impersonate/:clientId` | admin | Gera token temporário de 2h para entrar como cliente |
| `GET` | `/api/auth/sessions` | admin | Lista sessões ativas (refresh tokens) |
| `DELETE` | `/api/auth/sessions/:id` | admin | Revoga uma sessão específica |
| `DELETE` | `/api/auth/sessions/user/:userId` | admin | Revoga todas as sessões de um usuário |

### 3.3 Usuários (`/api/users`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/users` | admin | Lista todos os usuários |
| `POST` | `/api/users` | admin | Cria usuário (envia link de primeiro acesso) |
| `GET` | `/api/users/:id` | ✓ | Detalhes de um usuário |
| `PUT` | `/api/users/:id` | ✓ | Atualiza dados (admin atualiza qualquer, cliente atualiza os seus) |
| `PATCH` | `/api/users/:id/status` | admin | Ativa/bloqueia/desativa usuário |
| `PATCH` | `/api/users/:id/partner-program` | admin | Ativa/desativa Clube de Parceiros do cliente; ao ativar, limpa `partner_request_status`; ao desativar, também limpa |
| `PATCH` | `/api/users/:id/reset-password` | admin | Reseta senha + força primeiro acesso |
| `DELETE` | `/api/users/:id` | admin | Exclui usuário |

### 3.4 Projetos (`/api/projects`) — projectsRoutes

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/projects` | ✓ | Lista projetos (admin: todos, cliente: seus) |
| `POST` | `/api/projects` | admin | Cria projeto (com thumbnail) |
| `POST` | `/api/projects/refresh-thumbnails` | admin | Atualiza thumbnails em massa (modo inteligente) |
| `GET` | `/api/projects/:id` | ✓ | Detalhe de um projeto |
| `PUT` | `/api/projects/:id` | admin | Atualiza projeto completo |
| `PATCH` | `/api/projects/:id/status` | admin | Troca status do projeto |
| `DELETE` | `/api/projects/:id` | admin | Exclui projeto |
| `POST` | `/api/projects/:id/comments` | ✓ | Adiciona comentário |
| `POST` | `/api/projects/:id/regenerate-thumbnail` | admin | Regenera thumbnail específica |

### 3.5 Aprovações de Projetos (`/api/projects`) — projectApprovalsRoutes

⚠️ Registrado **antes** de projectsRoutes para evitar conflito com `/:id`.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/projects/notifications/approvals` | ✓ | Lista notificações de aprovação não lidas (sino) |
| `PATCH` | `/api/projects/notifications/approvals/read` | ✓ | Marca notificação(ões) como lida(s) |
| `POST` | `/api/projects/reset-unviewed-approvals` | admin | Reativa alarmes de versões visualizadas por admin |
| `GET` | `/api/projects/approval-share-tokens` | admin | Lista todos os tokens de aprovação |
| `PATCH` | `/api/projects/approval-share-tokens/:id/toggle` | admin | Ativa/desativa token de aprovação |
| `DELETE` | `/api/projects/approval-share-tokens/:id` | admin | Remove token de aprovação |
| `POST` | `/api/projects/:projectId/approvals` | ✓ | Upload nova versão (até 10 arquivos; PDF/JPG/PNG/MP4) |
| `GET` | `/api/projects/:projectId/approvals` | ✓ | Lista todas as versões |
| `GET` | `/api/projects/:projectId/approvals/latest` | ✓ | Versão mais recente |
| `GET` | `/api/projects/:projectId/approvals/has-unviewed` | ✓ | Verifica se há versões não visualizadas |
| `POST` | `/api/projects/:projectId/approvals/:versionId/share` | ✓ | Gera/retorna token de compartilhamento (15 dias) |
| `PATCH` | `/api/projects/:projectId/approvals/:versionId/view` | ✓ | Marca versão como visualizada (apenas clientes) |
| `POST` | `/api/projects/:projectId/approvals/:versionId/approve` | ✓ | Aprova versão (somente a mais recente) |
| `POST` | `/api/projects/:projectId/approvals/:versionId/reject` | ✓ | Rejeita com comentário opcional |
| `DELETE` | `/api/projects/:projectId/approvals/:versionId` | admin | Exclui versão + arquivos do disco |
| `GET` | `/api/projects/:projectId/approvals/:versionNumber/file/:filename` | ✓ | Serve arquivo (inline, view-only, range support) |
| `GET` | `/api/projects/:projectId/approvals/:versionNumber/file/:filename/pages` | ✓ | Conta páginas de PDF |
| `GET` | `/api/projects/:projectId/approvals/:versionNumber/file/:filename/page/:pageNumber` | ✓ | Serve página de PDF como PNG |


### 3.6 Arquivos (`/api/files`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/files` | ✓ | Lista arquivos (com filtros por cliente, projeto, pasta) |
| `POST` | `/api/files/upload` | ✓ | Upload de arquivos (até 50, qualquer tipo) |
| `GET` | `/api/files/folders` | ✓ | Árvore de pastas do usuário logado |
| `GET` | `/api/files/folders/:clientId` | admin | Árvore de pastas de um cliente específico |
| `GET` | `/api/files/:id/download` | ✓ | Download de arquivo |
| `DELETE` | `/api/files/:id` | ✓ | Exclui arquivo |

### 3.7 Pastas de Clientes (`/api/client-folders`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/client-folders/thumb` | ✓ | Serve thumbnail da pasta do cliente (token via query) |
| `GET` | `/api/client-folders` | admin | Lista todas as pastas de clientes em `CLIENTS_BASE_PATH` |
| `POST` | `/api/client-folders/sync` | admin | Sincroniza pastas do disco como usuários no banco |
| `GET` | `/api/client-folders/:clientFolder/files` | ✓ | Lista arquivos de uma pasta (cliente só vê a sua) |
| `GET` | `/api/client-folders/:clientFolder/serve` | ✓ | Serve arquivo para download/preview |

### 3.8 Portfolio (`/api/portfolio`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/portfolio/sync` | admin | Sincroniza arquivos do disco com o cache |
| `GET` | `/api/portfolio/categories` | — | Lista categorias disponíveis |
| `GET` | `/api/portfolio/categories/:category` | — | Lista empresas de uma categoria |
| `GET` | `/api/portfolio/categories/:category/:company/files` | — | Lista arquivos de uma empresa |
| `GET` | `/api/portfolio/search` | — | Busca global no portfólio |
| `GET` | `/api/portfolio/prefetch-list` | — | Lista de URLs de thumb para prefetch em background |
| `GET` | `/api/portfolio/serve` | opcional | Serve arquivo do portfólio (range support) |
| `GET` | `/api/portfolio/thumb` | opcional | Serve thumbnail do portfólio |
| `GET` | `/api/portfolio/video-thumb` | opcional | Serve thumbnail de vídeo do portfólio |
| `GET` | `/api/portfolio/image-thumb` | — | Serve thumbnail de imagem (pública) |

### 3.9 Dashboard (`/api/dashboard`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/dashboard` | admin | KPIs: projetos por status, valor total, faturamento, últimos projetos |

### 3.10 Tabela de Preços (`/api/prices`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/prices` | ✓ | Lista itens de preço ativos |
| `POST` | `/api/prices` | admin | Cria item de preço |
| `PUT` | `/api/prices/:id` | admin | Atualiza item de preço |
| `DELETE` | `/api/prices/:id` | admin | Remove item de preço |

### 3.11 Busca Global (`/api/search`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/search` | ✓ | Busca em projetos, clientes e arquivos simultaneamente |

### 3.12 Auditoria (`/api/audit`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/audit` | admin | Lista logs de auditoria (filtros: action, search, dateFrom, dateTo, page, limit) |

### 3.13 Download Requests (`/api/download-requests`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/download-requests/pending-count` | admin | Conta solicitações pendentes (badge no sino) |
| `GET` | `/api/download-requests` | admin | Lista todas as solicitações |
| `GET` | `/api/download-requests/status` | ✓ | Verifica status da solicitação do cliente |
| `POST` | `/api/download-requests` | ✓ | Cliente solicita download de arquivo |
| `POST` | `/api/download-requests/:id/execute` | ✓ | Executa download após aprovação |
| `PATCH` | `/api/download-requests/:id/review` | admin | Admin aprova ou rejeita solicitação |

### 3.14 Telemetria (`/api/telemetry`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/telemetry/ingest` | — | Recebe lote de logs do Supervisor (interno) |
| `POST` | `/api/telemetry/flush` | — | Força flush de todas as sessões abertas |
| `GET` | `/api/telemetry/dashboard` | admin | Dashboard analítico (`?days=30&modules=clientes,portfolio`) |

### 3.15 Manutenção (`/api/maintenance`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/maintenance/status` | admin | Verifica portas, Tailscale Funnel, scripts |
| `POST` | `/api/maintenance/restart-backend` | admin | Mata processo na :3000 (Supervisor reinicia) |
| `POST` | `/api/maintenance/restart-supervisor` | admin | Mata :3000 + :4500 + Electron, reabre via VBS |
| `POST` | `/api/maintenance/activate-funnel` | admin | Ativa Tailscale Funnel (`tailscale funnel 3000`) |
| `POST` | `/api/maintenance/run-migration` | admin | Executa migrate() — idempotente, inclui backfills |
| `GET` | `/api/maintenance/generate-thumbs` | admin | Gera thumbs via SSE (token via query string) |

### 3.16 Links Compartilhados (`/api/shared-links`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/shared-links/:token` | — | Dados públicos do link (valida is_active + expires_at) |
| `GET` | `/api/shared-links/:token/download/:fileId` | — | Download público de arquivo |
| `POST` | `/api/shared-links` | ✓ | Cria link (ou retorna existente ativo); expires_at = +15 dias |
| `GET` | `/api/shared-links` | admin | Lista todos os links (search, paginação) |
| `PATCH` | `/api/shared-links/:id/toggle` | admin | Ativa/desativa link |
| `DELETE` | `/api/shared-links/:id` | admin | Remove link |

### 3.17 WhatsApp (`/api/whatsapp`)

⚠️ Todas as rotas requerem `authenticate + requireAdmin`.

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/whatsapp/status` | admin | Estado da conexão: `disconnected\|initializing\|qr_pending\|authenticated\|ready\|auth_failure` + campo `qr` (string raw do QR Code, se pendente) |
| `GET` | `/api/whatsapp/notification/:versionId` | admin | Último envio registrado para uma versão específica |
| `POST` | `/api/whatsapp/send/:versionId` | admin | Envia notificação WhatsApp ao cliente dono do projeto. Valida: cliente ativo, telefone cadastrado. Registra em `whatsapp_notifications`. |

---

## 4. FRONTEND ADMIN — PÁGINAS

**Tecnologias**: React 18 + TypeScript + Vite + Tailwind + TanStack Query + Framer Motion + Lucide

**Rota base**: `/admin/*` (BrowserRouter)

| Página | Arquivo | Rota | Descrição |
|---|---|---|---|
| Dashboard | `Dashboard.tsx` | `/admin` | KPIs, faturamento, projetos por status, lista de projetos recentes |
| Telemetria | `TelemetryDashboard.tsx` | `/admin/telemetry` | Analytics: sessões, pageviews, heatmap horário, browsers, OS, conexão, resoluções, fluxo de navegação, pages de abandono, **Eventos de Negócio** (lightbox, downloads, aprovações via link) |
| Clientes | `Clients.tsx` | `/admin/clients` | CRUD de clientes, busca, status (ativo/inativo/bloqueado) |
| Detalhe Cliente | `ClientDetail.tsx` | `/admin/clients/:id` | Dados do cliente, projetos do cliente, arquivos |
| Projetos | `Projects.tsx` | `/admin/projects` | Lista projetos com filtros de status/cliente, cards com thumb. Seletor de thumb via **FileExplorerModal** (estilo Windows Explorer) |
| Detalhe Projeto | `ProjectDetail.tsx` | `/admin/projects/:id` | Dados completos, comentários, aprovações, upload de versões |
| Arquivos | `Files.tsx` | `/admin/files` | Upload, listagem, download, exclusão de arquivos |
| Portfolio | `Portfolio.tsx` | `/admin/portfolio` | Sync do portfólio, warmup de thumbs |
| Tabela de Preços | `Prices.tsx` | `/admin/prices` | CRUD de serviços/preços, drag sort, toggle ativo |
| Histórico | `History.tsx` | `/admin/history` | Histórico de acessos (audit_logs de LOGIN) |
| Supervisão | `Supervision.tsx` | `/admin/supervision` | **5 abas**: Online Agora, Histórico de Acessos, Links Compartilhados, Manutenção, **WhatsApp** |
| Configurações | `Settings.tsx` | `/admin/settings` | Configurações do admin |
| Preview Arquivos | `PreviewFiles.tsx` | `/admin/preview-files` | Preview de arquivos de clientes |
| Preview Projetos | `PreviewProjects.tsx` | `/admin/preview-projects` | Preview da visão de projetos do cliente |

### 4.1 Supervisão — Aba "Links Compartilhados"

A aba exibe **duas seções** na mesma view (sem sub-abas):

**Seção 1 — Aprovação de versões** (tokens de `approval_share_tokens`):
- Colunas: Projeto/Cliente · Token (roxo) · Versão · Criado em · Expira em · Status · Aprovação · Ações
- Status considera expiração mesmo com `is_active=1`
- Aprovação mostra: Aprovado / Revisão / Aguardando

**Seção 2 — Arquivos do projeto** (links de `shared_links`):
- Colunas: Projeto/Cliente · Token (verde) · Visualiz. · Downloads · Criado em · Expira em · Status · Ações

**Stats combinados**: Total de links (ambos), Ativos, Aprovados

### 4.2 Notificações de Aprovação (Sino)

- Badge no header mostra contagem de aprovações não lidas
- Clicando: lista notificações com projeto, ação (aprovado/revisão), timestamp
- Fonte: `audit_logs` com `action='approval_notification'` e `metadata.read=false`
- Auto-mark-read ao clicar

### 4.3 Modal de Projeto (Criar/Editar)

- Tamanho `2xl` (max-w-3xl)
- **Serviço + Quantidade** na mesma linha
- **Valor Unitário** — input editável com prefixo `R$`
- **Total** — somente leitura, calculado automaticamente (unitário × qtd), `R$ 0.000,00`
- **Prazo** — na mesma linha dos valores
- `client_name` começa vazio, placeholder mostra o nome do cliente selecionado
- `company` preenchida automaticamente pelo cliente

### 4.4 Supervisão — Aba "WhatsApp"

- **Card de status**: estado atual com ícone colorido (verde=ready, âmbar=qr_pending, vermelho=auth_failure, etc.)
- **QR Code**: aparece automaticamente quando `status = qr_pending`, imagem renderizada via `api.qrserver.com` com polling a cada 3s
- **Instruções de escaneamento**: passo a passo para conectar o celular
- **QR em texto**: collapsible como fallback
- **Sessão persistente**: `.wwebjs_auth/` — não pede QR após reconexão

---

## 5. APP CLIENTES — PÁGINAS

**Tecnologias**: React 18 + TypeScript + Vite + Tailwind + TanStack Query + Framer Motion

**Rota base**: HashRouter (`/#/...`)

| Página | Arquivo | Rota | Descrição |
|---|---|---|---|
| Login | `auth/Login.tsx` | `/#/login` | Login com seleção de cliente para impersonação admin |
| Primeiro Acesso | `auth/FirstAccess.tsx` | `/#/primeiro-acesso` | Define senha no primeiro acesso |
| Projetos | `client/ClientProjects.tsx` | `/#/client/projects` | Lista projetos do cliente com cards; pin piscando se há versão não vista |
| Detalhe Projeto | `client/ProjectDetail.tsx` | `/#/client/projects/:id` | Detalhes, comentários, aprovação de versões, link de compartilhamento de arquivos |
| Arquivos | `client/ClientFiles.tsx` | `/#/client/files` | Arquivos e pastas do cliente |
| Configurações | `client/Settings.tsx` | `/#/client/settings` | Perfil, troca de senha |
| Link Público | `shared/SharedLink.tsx` | `/#/s/:token` | Acesso público a arquivos do projeto (sem login) |
| Aprovação Pública | `shared/ApprovalShare.tsx` | `/#/aprovacao/:token` | Visualização e aprovação/rejeição de versão (sem login) |
| Explorador de Pastas | `shared/FolderExplorer.tsx` | `/#/folders` | Explorador de pastas de clientes |

### 5.1 Impersonação no Login

- Admin faz login com credenciais de admin
- Modal aparece com lista de clientes ativos
- Seleciona o cliente → token temporário de 2h é gerado via `POST /api/auth/impersonate/:clientId`
- Banner âmbar indica: "Sessão de visualização admin — Sem registro de telemetria"
- Nenhuma telemetria é gerada durante esta sessão

**Polling do status de Parceiros durante impersonação:**
- O polling de `GET /api/partner-requests/status` roda **mesmo durante sessão de impersonação** (`enabled: !!user`, sem condição `!isAdminSession`)
- Isso garante que o sidebar reflita o estado real do banco mesmo quando o admin abre a sessão e depois altera o status pelo painel admin
- Toasts reativos (aprovação, remoção, reprovação) são **suprimidos** durante `isAdminSession` — o admin não vê os toasts destinados ao cliente

### 5.2 Fluxo de Aprovação no App Clientes

1. Card do projeto exibe pin âmbar piscando se há versão não visualizada
2. Botão "Novo Modelo para Aprovação" com pulse animation
3. Modal com gallery de todas as versões
4. Viewer integrado: imagens, vídeos, PDFs paginados (sem opção de download)
5. Primeira visualização é registrada automaticamente (`viewed_at`)
6. Aprovação ou rejeição (com comentário opcional) — apenas da versão mais recente

### 5.3 Compartilhamento de Arquivos no ProjectDetail

- Botão "Copiar link" → chama `POST /api/shared-links { project_id }`
- Exibe caixa com URL completa + ícone de copy
- Reutiliza link existente se o projeto já tiver um ativo
- Link gerado expira em 15 dias

---

## 6. APP PORTFOLIO — PÁGINAS

**Tecnologias**: React 18 + TypeScript + Vite + Tailwind + @tanstack/react-virtual

| Página | Arquivo | Rota | Descrição |
|---|---|---|---|
| Portfolio | `pages/Portfolio.tsx` | `/` | Vitrine completa com categorias, slideshow Ken-Burns, grid virtualizado |

### 6.1 Funcionalidades do Portfolio

- **Sections fullscreen** com slideshow Ken-Burns por categoria
- **Grid de itens** com lazy loading via IntersectionObserver
- **Lightbox** para imagens e vídeos em tela cheia
- **VideoThumb** com play automático ao entrar no viewport
- **Virtualização** com `@tanstack/react-virtual` para performance
- **Prefetch** de thumbnails em background com semáforo de concorrência
- **Busca** por empresa ou projeto
- **Navegação por categoria** via sidebar

---

## 7. BANCO DE DADOS MARIADB

**Conexão**: localhost:3306 | Database: `pixelbox_portal`

### 7.1 Tabela `users`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `name` | VARCHAR(150) | Nome completo |
| `company` | VARCHAR(150) NULL | Empresa |
| `phone` | VARCHAR(30) NULL | Telefone |
| `email` | VARCHAR(200) | Email |
| `login` | VARCHAR(100) UNIQUE | Login único |
| `password_hash` | VARCHAR(255) NULL | Bcrypt hash |
| `plain_password` | VARCHAR(255) NULL | Senha visível para admin (additive) |
| `role` | ENUM('admin','client') | Papel |
| `status` | ENUM('active','inactive','blocked') | Status |
| `avatar_url` | VARCHAR(500) NULL | URL do avatar |
| `first_access` | TINYINT(1) | Se precisa definir senha |
| `last_login` | DATETIME NULL | Último login |
| `partner_program` | TINYINT(1) DEFAULT 0 | Se faz parte do Clube de Parceiros |
| `partner_request_status` | ENUM('pending','approved','rejected') NULL | Status da solicitação de adesão ao Clube de Parceiros (`NULL` = nunca solicitou) |
| `created_at` / `updated_at` | DATETIME | Timestamps |

### 7.2 Tabela `refresh_tokens`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(36) FK→users | Usuário dono da sessão |
| `token` | VARCHAR(500) UNIQUE | Token JWT de refresh |
| `expires_at` | DATETIME | Expiração (30 dias) |
| `ip_address` | VARCHAR(45) NULL | IP de criação |
| `user_agent` | VARCHAR(500) NULL | UA de criação |
| `created_at` | DATETIME | Criação |

### 7.3 Tabela `projects`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `client_id` | VARCHAR(36) FK→users | Cliente dono |
| `title` | VARCHAR(200) | Título |
| `description` | TEXT NULL | Descrição |
| `client_name` | VARCHAR(200) NULL | Nome exibido do cliente |
| `company` | VARCHAR(200) NULL | Empresa do cliente |
| `status` | ENUM (11 valores) | Estado do projeto |
| `priority` | ENUM('low','medium','high','urgent') | Prioridade |
| `value` | DECIMAL(12,2) NULL | Valor total |
| `thumbnail` | VARCHAR(500) NULL | Path da thumb |
| `folder_path` | VARCHAR(1000) NULL | Caminho na pasta de clientes |
| `due_date` | DATE NULL | Prazo de entrega |
| `delivered_at` | DATETIME NULL | Data de entrega real |
| `one_time_download` | TINYINT(1) DEFAULT 0 | Libera exatamente 1 download por projeto (desmarca após uso) |
| `created_at` / `updated_at` | DATETIME | Timestamps |

**Status (11 valores)**: `received` → `analyzing` → `developing` → `awaiting_approval` → `in_revision` → `finalized` → `delivered` → `cancelled` → `pending_payment` → `paid` → `reopened`

**Regra financeira**:
- **PAGO**: apenas `paid` e `finalized`
- **CANCELADO** (histórico): apenas `cancelled`
- **PENDENTE**: todos os outros

### 7.4 Tabela `files`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `project_id` | VARCHAR(36) NULL FK→projects | Projeto associado |
| `client_id` | VARCHAR(36) FK→users | Cliente dono |
| `uploaded_by` | VARCHAR(36) FK→users | Quem fez upload |
| `original_name` | VARCHAR(500) | Nome original |
| `stored_name` | VARCHAR(500) | Nome no disco |
| `storage_path` | VARCHAR(1000) | Caminho relativo em uploads/ |
| `mime_type` | VARCHAR(200) | MIME type |
| `extension` | VARCHAR(20) | Extensão |
| `size_bytes` | BIGINT | Tamanho em bytes |
| `folder_path` | VARCHAR(1000) | Pasta virtual |
| `thumbnail` | VARCHAR(500) NULL | Thumb do arquivo |
| `is_public` | TINYINT(1) | Se é público |
| `created_at` / `updated_at` | DATETIME | Timestamps |

### 7.5 Tabela `comments`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `project_id` | VARCHAR(36) FK→projects | Projeto |
| `user_id` | VARCHAR(36) FK→users | Autor |
| `content` | TEXT | Texto do comentário |
| `created_at` / `updated_at` | DATETIME | Timestamps |

### 7.6 Tabela `audit_logs`

Usada tanto para auditoria quanto para **notificações de aprovação**.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `user_id` | VARCHAR(36) NULL | Usuário que executou a ação |
| `action` | VARCHAR(100) | Tipo: LOGIN, CREATE_PROJECT, approval_notification, etc. |
| `entity` | VARCHAR(100) | Entidade afetada |
| `entity_id` | VARCHAR(36) NULL | ID da entidade |
| `description` | TEXT NULL | Descrição legível |
| `metadata` | JSON NULL | Dados extras (para notificações: `{type, project_id, client_name, read, ...}`) |
| `ip_address` | VARCHAR(45) NULL | IP |
| `user_agent` | VARCHAR(500) NULL | UA |
| `created_at` | DATETIME | Timestamp |

**Notificações de aprovação**: `action='approval_notification'`, `metadata.read=false/true`

### 7.7 Tabela `price_items`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `name` | VARCHAR(200) | Nome do serviço |
| `description` | TEXT NULL | Descrição |
| `price` | DECIMAL(12,2) NULL | Preço (NULL = sob consulta) |
| `category` | VARCHAR(100) | Categoria (default: 'fixed') |
| `is_quote` | TINYINT(1) | Se é sob consulta |
| `is_active` | TINYINT(1) | Se está ativo |
| `sort_order` | INT | Ordem de exibição |
| `created_at` / `updated_at` | DATETIME | Timestamps |

### 7.8 Tabela `folders`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `client_id` | VARCHAR(36) FK→users | Cliente dono |
| `name` | VARCHAR(200) | Nome da pasta |
| `path` | VARCHAR(1000) UNIQUE por client | Caminho virtual |
| `parent_id` | VARCHAR(36) NULL FK→folders | Pasta pai |
| `created_at` | DATETIME | Criação |

### 7.9 Tabela `download_requests`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `client_id` | VARCHAR(36) FK→users | Cliente solicitante |
| `client_name` | VARCHAR(200) | Nome do cliente |
| `file_path` | VARCHAR(1000) | Caminho do arquivo |
| `file_name` | VARCHAR(500) | Nome do arquivo |
| `status` | ENUM('pending','approved','rejected','used') | Estado |
| `note` | TEXT NULL | Observação |
| `requested_at` | DATETIME | Solicitação |
| `reviewed_at` | DATETIME NULL | Revisão pelo admin |
| `reviewed_by` | VARCHAR(36) NULL | Admin que revisou |

### 7.10 Tabela `shared_links`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `token` | VARCHAR(64) UNIQUE | Token público de 12 chars (base64url maiúsculo) |
| `project_id` | VARCHAR(36) FK→projects | Projeto |
| `client_id` | VARCHAR(36) FK→users | Cliente dono |
| `project_title` | VARCHAR(200) | Título (desnormalizado) |
| `client_name` | VARCHAR(150) | Nome do cliente (desnormalizado) |
| `created_by` | VARCHAR(36) | Quem gerou |
| `created_at` | DATETIME | Criação |
| `expires_at` | DATETIME NULL | Expiração (= created_at + 15 dias desde v3.4) |
| `is_active` | TINYINT(1) | Se está ativo |
| `view_count` | INT | Visualizações |
| `download_count` | INT | Downloads |
| `last_accessed` | DATETIME NULL | Último acesso |

### 7.11 Tabela `project_approval_versions`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `project_id` | VARCHAR(36) FK→projects | Projeto |
| `version_number` | INT | Número sequencial (1, 2, 3...) |
| `files` | JSON | Array: `[{filename, stored_name, mime_type, size, original_size}]` |
| `uploaded_by` | VARCHAR(36) FK→users | Admin que fez upload |
| `uploaded_at` | DATETIME | Upload |
| `viewed_at` | DATETIME NULL | Primeira visualização pelo cliente |
| `approved_at` | DATETIME NULL | Quando aprovado |
| `approved_by` | VARCHAR(36) NULL | `'shared_link'` se via token público |
| `rejected_at` | DATETIME NULL | Quando rejeitado |
| `rejected_by` | VARCHAR(36) NULL | `'shared_link'` se via token público |
| `review_comment` | TEXT NULL | Comentário do cliente na rejeição |

**Storage**: `uploads/{client_id}/approvals/{project_id}/v{version_number}/`

**Otimização automática no upload**:
- **Imagens**: Sharp — resize max 2000px, JPEG 85% progressive / PNG compressão 8
- **Vídeos**: FFmpeg — H.264 CRF23, max 1280px, AAC 128k, faststart (streaming imediato)
- **PDFs**: movidos sem reprocessamento

### 7.12 Tabela `approval_share_tokens`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `token` | VARCHAR(32) UNIQUE | Token público de 16 chars (base64url maiúsculo) |
| `project_id` | VARCHAR(36) FK→projects | Projeto |
| `version_id` | VARCHAR(36) FK→project_approval_versions | Versão específica |
| `created_by` | VARCHAR(36) FK→users | Admin que gerou |
| `created_at` | DATETIME | Criação |
| `expires_at` | DATETIME NULL | Expiração (= created_at + 15 dias) |
| `is_active` | TINYINT(1) | Se está ativo |

**Verificação de expiração**: `getApprovalShareData` verifica `expires_at` e retorna HTTP 410 se expirado.

**Backfill**: Migration preenche `expires_at = created_at + 15 dias` em tokens/links que não tinham.

### 7.13 Tabela `whatsapp_notifications`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `project_id` | VARCHAR(36) | Projeto relacionado |
| `version_id` | VARCHAR(36) | Versão de aprovação notificada |
| `client_id` | VARCHAR(36) | Cliente destinatário |
| `sent_by` | VARCHAR(36) | Admin que disparou o envio |
| `recipient` | VARCHAR(30) | Número normalizado (`5575...@c.us`) |
| `message` | TEXT | Mensagem completa enviada |
| `success` | TINYINT(1) | 1 = enviado, 0 = erro |
| `error_message` | TEXT NULL | Detalhe do erro se `success=0` |
| `sent_at` | DATETIME | Timestamp do envio |

### 7.14 Tabelas de Telemetria

| Tabela | Descrição |
|---|---|
| `telemetry_sessions` | Uma linha por visita: módulo, IP, browser, OS, device, viewport, RAM, CPU, conexão, idioma, TZ, scroll, duração, page_views, clicks |
| `telemetry_pageviews` | Uma linha por página visitada: session_id, módulo, hash route, duração, scroll, clicks |
| `telemetry_clicks` | Um clique por linha: session_id, módulo, página, elemento, tag, timestamp |
| `telemetry_daily` | Agregados diários por módulo: sessions, pageviews, clicks, unique_ips, avg_duration, avg_scroll |
| `telemetry_events` | Eventos de negócio: `lightbox:aberto`, `shared-link:download iniciado`, `approval-share:versão aprovada`, `project:download concluído`, etc. Campos: session_id, module, page, event_type, event_label, event_meta (JSON), occurred_at |
| `telemetry_events` | Eventos de negócio: lightbox aberto, download iniciado/concluído, aprovação/rejeição via link, geração de shared link |

---

## 8. SISTEMA DE MÚLTIPLOS LOGINS POR CLIENTE

### 8.1 Visão Geral

Permite que um cliente tenha múltiplos logins (usuários), cada um com telefone/email próprio, mas compartilhando os mesmos projetos e arquivos da empresa.

**Casos de uso**:
- Empresa com vários funcionários que precisam acessar o portal
- Diferentes setores (comercial, operacional, etc)
- Múltiplos telefones WhatsApp para notificações

### 8.2 Estrutura de Dados

**Tabela `users`** (login principal):
- id, name, company, phone, email, login, password_hash, role='client'

**Tabela `client_logins`** (logins adicionais):
```sql
CREATE TABLE IF NOT EXISTS client_logins (
  id VARCHAR(36) PRIMARY KEY,
  client_id VARCHAR(36) NOT NULL,
  name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  login VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  plain_password VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login DATETIME NULL,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### 8.3 Endpoints Backend

| Rota | Método | Descrição |
|---|---|---|
| `/api/users/:clientId/logins` | GET | Lista login principal + logins adicionais |
| `/api/users/:clientId/logins` | POST | Cria novo login adicional |
| `/api/users/:clientId/logins/:loginId` | PUT | Atualiza login adicional |
| `/api/users/:clientId/logins/:loginId` | DELETE | Remove login adicional |

**Response de GET `/api/users/:clientId/logins`**:
```json
{
  "client": {
    "id": "...",
    "name": "Empresa XYZ",
    "phone": "75999878260",
    "email": "contato@empresa.com",
    "login": "empresa_principal"
  },
  "logins": [
    {
      "id": "...",
      "name": "João Silva",
      "phone": "75988776655",
      "email": "joao@empresa.com",
      "login": "joao_empresa",
      "password": "senha123",
      "created_at": "2026-07-10T..."
    }
  ],
  "total": 1
}
```

### 8.4 Interface Admin

**Localização**: Admin → Clientes → Card do Cliente → Abas na parte superior

**Abas**:
- **Dados Principais** — nome, empresa, telefone, email, login principal
- **Login 1**, **Login 2**, **Login 3**, etc — dados de cada login adicional
- **Botão "+"** — adiciona nova aba e abre modal de criação

**Modal de criar/editar login**:
- Nome do usuário
- Telefone (usado para WhatsApp)
- Email
- Login (único no sistema)
- Senha (visível em plain text)

**Botões em cada aba**:
- ✏️ **Editar** — abre modal com dados preenchidos
- 🗑️ **Deletar** — confirma exclusão (não permite deletar se for o único)

### 8.5 Autenticação

**Ordem de verificação** em `POST /api/auth/login`:
1. Busca em `users` pelo login
2. Se não encontrar, busca em `client_logins`
3. Valida senha com bcrypt
4. Se encontrar em `client_logins`:
   - Token JWT inclui `clientLoginId` no payload
   - Acesso aos dados do cliente pai via `client_id`

**Token JWT payload**:
```json
{
  "id": "user_id ou client_login_id",
  "login": "...",
  "role": "client",
  "name": "...",
  "clientLoginId": "..." // apenas se for login adicional
}
```

### 8.6 Integração WhatsApp

**Seleção de destinatários**:

Quando admin clica no botão WhatsApp em uma versão de aprovação:

1. **Frontend verifica** via `GET /api/users/:clientId/logins`
2. **Se total de logins > 1**: abre modal de seleção
3. **Se total de logins = 1**: envia direto sem modal

**Modal de seleção**:
- ☑️ Checkbox "Selecionar todos"
- Lista de logins com checkboxes individuais:
  - Nome do login
  - Telefone
  - Badge "Principal" no login pai
- Botão "Enviar (N)" — mostra quantidade selecionada

**Backend** (`POST /api/whatsapp/send/:versionId`):
- Aceita `recipients: string[]` no body (IDs dos logins)
- Para cada recipient:
  - Busca telefone em `users` ou `client_logins`
  - Envia mensagem via WhatsApp
  - Registra em `whatsapp_notifications`

**Se `recipients` vazio**: usa telefone do login principal

### 8.7 Regras de Negócio

1. **Login principal** sempre existe (tabela `users`)
2. **Logins adicionais** são opcionais (tabela `client_logins`)
3. **Não é possível deletar** o último login de um cliente
4. **Login único**: não pode existir em `users` nem em `client_logins`
5. **Compartilhamento**: todos os logins veem os mesmos projetos/arquivos
6. **WhatsApp**: cada login usa seu próprio telefone para notificações

### 8.8 Logs e Debug

Console logs no frontend ao clicar em WhatsApp:
```
[WhatsApp] Iniciando envio - versionId: xxx clientId: xxx
[WhatsApp] Buscando logins em: https://...
[WhatsApp] Response status: 200
[WhatsApp] Logins retornados: { client: {...}, logins: [...], total: 2 }
[WhatsApp] Total de logins: 3 (1 principal + 2 adicionais)
[WhatsApp] Múltiplos logins detectados - abrindo modal
```

---

## 9. SISTEMA DE THUMBS DE CLIENTES

### 8.1 Estrutura de Arquivos

```
F:\PixelBox\
├── CLIENTES\                             ← Arquivos originais
│   └── {Cliente}\{Subpasta}\arquivo.cdr
└── arquivos_server\
    └── thumbs\
        └── clientes\                     ← Thumbs geradas
            └── {Cliente}\{Subpasta}\arquivo.cdr.jpg
```

### 8.2 Scripts

- `capturar-thumbs-clientes-v2.ps1` — Geração em massa (MODO INTELIGENTE — preserva existentes)
- `extrair-thumb-windows.ps1` — Base com Windows Shell API (IThumbnailProvider, fallback para PDFs)

Chamados pelo backend via `GET /api/maintenance/generate-thumbs` (SSE ao vivo).

### 8.3 Geração Sob Demanda

`generateThumbOnDemand()` — chamada quando thumb não existe na rota `/api/client-folders/thumb`.

Ordem: caminho exato → variações de basename → raiz do cliente → gera via PS1.

### 8.4 Comportamento de Preservação

- `refreshThumbnails()` **não sobrescreve** thumbs que já existem
- Para trocar: botão "Regenerar Thumbnail" no projeto específico
- Se `folder_path` definido: usa APENAS thumb correspondente (sem fallback de "mais recente")
- Log: ícone 🔒 indica thumbs preservadas

### 8.5 Cache

```typescript
thumbnailPath = `${thumbnailPath}?v=${Date.now()}`;  // cache buster
```
HTTP: `Cache-Control: public, max-age=3600, must-revalidate` + ETag + Last-Modified

---

## 9. SISTEMA DE ARQUIVOS E THUMBS PORTFOLIO

```
F:\PixelBox\PORTIFÓLIO\                   ← Arquivos originais
F:\PixelBox\arquivos_server\thumbs\       ← Thumbs + vídeos otimizados
```

| Tipo | Processamento |
|---|---|
| Imagens | Sharp, 1920×1920, qualidade 95, JPEG progressive |
| Vídeos thumb | FFmpeg, frame no 1s, 1920px width |
| Vídeos otimizados | H.264 CRF23, faststart, gerados no sync |
| Cache | 5 min em memória, invalidado após warmup |

**Warmup automático** (3s após start):
1. `prewarmCache()` — carrega categories/companies
2. `warmupPortfolioThumbs()` — gera thumbs de imagem faltando
3. `warmupOptimizedVideos()` — gera vídeos otimizados faltando (60s depois)

---

## 10. SISTEMA DE LOGS E TELEMETRIA

### 10.1 Arquitetura de Dois Níveis

```
Nível 1: Logs Técnicos (NDJSON diário)
  → Fonte primária para diagnóstico
  → NUNCA alterados

Nível 2: Telemetria (banco MariaDB)
  → Indicadores analíticos estruturados
  → NUNCA contém logs brutos
```

### 10.2 Fluxo de Logs

```
[Browser — Clientes/Portfolio]
    │ POST .../logs/ingest (via Tailscale Funnel)
    ▼
[Supervisor :4500]
    ├─ persiste → NDJSON diário (F:\PixelBox\arquivos_server\logs\)
    ├─ broadcast → WebSocket (painel ao vivo)
    └─ sendTelemetry → POST http://localhost:3000/api/telemetry/ingest
                                            ▼
                                    [processTelemetryBatch]
                                    filtra: side=frontend && !_adminSession
                                            ▼
                                    [MySQL: telemetry_*]
```

### 10.3 O que é Capturado por Visitante

- User-Agent completo, plataforma, browser, OS
- Resolução de tela e viewport
- Idioma, timezone, RAM, núcleos de CPU, tipo de conexão, velocidade, RTT
- Referrer e URL de entrada
- Cliques em botões/links (elemento, tag, página)
- Navegação entre telas (hash routing)
- Scroll depth (25%, 50%, 75%, 100%)
- Tempo de sessão e permanência por página
- Erros JavaScript

### 10.4 Regras de Filtragem

- Logs `side=backend` → descartados
- Logs `meta._adminSession=true` → descartados (não poluem métricas)
- Módulo `admin`: `_adminSession=true` via `window.__pixelboxAdminSession`
- Impersonação (admin como cliente): também não gera telemetria

### 10.5 Supervisor — Endpoints (porta 4500)

| Rota | Descrição |
|---|---|
| `POST /ingest` | Recebe lote de logs (JSON) |
| `POST /logs/ingest` | Alias para Tailscale Funnel |
| `POST /beacon` | Recebe logs do `navigator.sendBeacon` (text/plain) |
| `POST /logs/beacon` | Alias para Tailscale Funnel |
| `POST /clear-live` | Limpa buffer em memória + flush telemetria |
| `GET /live` | Buffer atual em memória |
| `GET /history/search` | Busca com filtros nos arquivos NDJSON |
| `WS /ws` | WebSocket para logs em tempo real |

### 10.6 Keep-Alive Anti-Sleep (Render)

- Supervisor faz `HEAD /` a cada **2 minutos** nos 3 serviços Render
- Evita sleep do free tier (dorme após 15min sem tráfego)
- Configurável via `RENDER_KEEP_ALIVE_URLS` (env, separados por vírgula)
- Registrado no log como `module:supervisor, level:debug`

---

## 11. INTEGRAÇÃO TAILSCALE

**Domain**: `https://desktop-e6jr4dk.tailc1230a.ts.net`

**Rotas do Funnel**:
- `/` → proxy `http://127.0.0.1:3000` (backend)
- `/logs` → proxy `http://127.0.0.1:4500` (supervisor)

**Ativar**: Admin → Supervisão → Manutenção → "Ativar Funnel"

Ou via terminal:
```bash
tailscale funnel 3000
tailscale funnel --bg 4500 --set-path /logs
```

---

## 12. SUPERVISOR

**Arquivo**: `apps/portfolio/server.js` (Node.js puro)
**Porta**: 4500
**Inicia via**: `gerenciamento_sessao/supervisor-app/` (Electron) ou diretamente `node server.js`
**Atalho**: "PixelBox Supervisor" na área de trabalho → `INICIAR_SUPERVISOR_SEM_TERMINAL.vbs`
**`BACKEND_URL`**: `http://localhost:3000` (default correto)

---

## 13. MÓDULO DE APROVAÇÃO DE PROJETOS

### 13.1 Fluxo Admin

1. Admin acessa modal do projeto → seção "Modelos para Aprovação"
2. Upload de arquivos (drag & drop, até 10 arquivos, PDF/JPG/PNG/MP4)
3. Backend cria versão incremental, otimiza arquivos automaticamente
4. Admin pode compartilhar via `POST /api/projects/:id/approvals/:versionId/share`
5. Token gerado expira em 15 dias; reutiliza token existente ativo se houver
6. Admin gerencia tokens em Supervisão → Links Compartilhados → Aprovação de versões

### 13.2 Fluxo Cliente (com login)

1. Pin âmbar piscando no card do projeto indica versão não vista
2. Botão "Novo Modelo para Aprovação" com pulse animation
3. Modal gallery com todas as versões (v1, v2, v3...)
4. Viewer: imagens, vídeos e PDFs paginados (PDF via `pdf-to-img`, sem download)
5. Primeira visualização registra `viewed_at` e remove o pin
6. Aprovação ou rejeição com comentário — apenas da versão mais recente

### 13.3 Fluxo Público (sem login, via token)

URL: `{CLIENTES_URL}/#/aprovacao/{token}`

1. Fetch `GET /api/projects/share/:token` — valida `is_active=1` e `expires_at`
2. Se token expirado → HTTP 410 → página exibe "Link expirou"
3. Exibe arquivos da versão em viewer similar ao autenticado
4. Botões "Não aprovar" (com textarea de comentário) e "Aprovar versão"
5. `approved_by` / `rejected_by` registrado como `'shared_link'`
6. Notificação inserida em `audit_logs` com `action='approval_notification'`

### 13.4 Rejeição de Versão

- Admin ou cliente pode rejeitar com comentário opcional
- Campos: `rejected_at`, `rejected_by`, `review_comment`
- Uma versão rejeitada não pode ser aprovada (retorna erro)
- Exibida no admin como badge vermelho "Revisão" com o comentário

### 13.5 Reset de Alarmes

`POST /api/projects/reset-unviewed-approvals` — reseta `viewed_at = NULL` em versões não aprovadas/rejeitadas que foram marcadas como vistas por sessão admin. Permite que o pin reapareça para o cliente real.

---

## 14. SISTEMA DE LINKS COMPARTILHADOS

### 14.1 Dois Tipos de Links

| Tipo | Tabela | Token | URL Pública | Expira |
|---|---|---|---|---|
| Arquivos do projeto | `shared_links` | 12 chars | `/#/s/:token` | 15 dias |
| Aprovação de versão | `approval_share_tokens` | 16 chars | `/#/aprovacao/:token` | 15 dias |

### 14.2 Comportamento de Expiração

- `expires_at = created_at + 15 dias` — definido no momento da criação
- Verificação no acesso: se `expires_at < NOW()` → HTTP 410 ou 404
- Migration faz **backfill** em registros antigos sem `expires_at`
- Status no admin: badge "Expirado" (mesmo com `is_active=1`)

### 14.3 Reutilização de Links

- `shared_links`: reutiliza token existente e ativo para o mesmo projeto
- `approval_share_tokens`: reutiliza token existente e ativo para a mesma versão

---

## 15. SISTEMA DE DOWNLOAD REQUESTS

### 15.1 Fluxo

1. Cliente vê arquivo na pasta mas não pode baixar direto
2. Clica "Solicitar download" → `POST /api/download-requests`
3. Admin recebe notificação (badge no sino via `pending-count`)
4. Admin aprova/rejeita via `PATCH /api/download-requests/:id/review`
5. Se aprovado: cliente executa `POST /api/download-requests/:id/execute` → download real
6. Status muda para `used` após download

### 15.2 Status do Fluxo

`pending` → `approved` → `used`
`pending` → `rejected`

---

## 16. FLUXOS DE DADOS

### 16.1 Criação de Projeto com Thumb

```
Admin seleciona arquivo da pasta do cliente
→ Frontend envia POST /api/projects com client_thumb_path
→ Backend busca thumb em thumbs\clientes\
→ Se não existe: generateThumbOnDemand() → PS1 → Windows Shell API
→ Processa com Sharp (resize 400×300, JPEG 85%)
→ Salva em uploads com cache buster (?v=timestamp)
→ Insere no banco
```

### 16.2 Valor do Projeto

```
Admin seleciona serviço → valor unitário preenchido automaticamente
Admin define quantidade
→ Total = unitário × quantidade (calculado em tempo real no frontend)
→ Campo total: somente leitura, formatado R$ 0.000,00
→ No submit: banco recebe o TOTAL (não o unitário)
```

### 16.3 Link de Arquivos (SharedLink)

```
Cliente clica "Copiar link" no ProjectDetail
→ POST /api/shared-links { project_id }
→ Se link ativo existir: retorna mesmo token (reutilizado)
→ Se não: gera token 12 chars, expires_at = +15 dias
→ Frontend exibe caixa com URL + copia para clipboard

Pessoa acessa /#/s/{token}
→ GET /api/shared-links/{token} → valida is_active + expires_at
→ Retorna dados + lista de arquivos
→ view_count++ (assíncrono)

Pessoa baixa arquivo:
→ GET /api/shared-links/{token}/download/{fileId}
→ Valida token + pertencimento → download_count++ → sendFile
```

### 16.4 Aprovação via Token Público

```
Admin gera token em POST /api/projects/:id/approvals/:versionId/share
→ expires_at = NOW() + 15 dias
→ Token de 16 chars criado em approval_share_tokens

Pessoa acessa /#/aprovacao/{token}
→ GET /api/projects/share/{token}
→ Valida is_active=1 + expires_at
→ Se expirado: HTTP 410
→ Retorna dados da versão + arquivos
→ Se !viewed_at: UPDATE viewed_at = NOW()

Pessoa aprova/rejeita:
→ POST /api/projects/share/{token}/approve|reject
→ UPDATE project_approval_versions SET approved_at/rejected_at = NOW(), approved_by/rejected_by = 'shared_link'
→ INSERT audit_logs (action='approval_notification', metadata.read=false)
→ Admin vê notificação no sino
```

### 16.5 Telemetria em Tempo Real

```
Visitante acessa Portal Clientes
→ logger pronto → sessão criada em memória (liveSessions Map)
→ cada clique/nav/scroll → events acumulam na sessão
→ ao sair (beforeunload/visibilitychange):
    → "session:" event → sessão fechada → INSERT no banco
→ flushAllSessions() no shutdown/clear: força gravação de sessões abertas
```

### 16.6 Upload de Versão de Aprovação

```
Admin faz upload (POST /api/projects/:id/approvals, multipart)
→ Multer salva em uploads/temp/
→ Para cada arquivo:
    MP4: FFmpeg → H.264 CRF23 + faststart (50-80% menor)
    JPG/PNG: Sharp → max 2000px, JPEG 85% progressive
    PDF: move direto sem reprocessar
→ Salva em uploads/{client_id}/approvals/{project_id}/v{N}/
→ INSERT project_approval_versions
→ Notificação pode ser enviada ao cliente
```

---

## 17. PROCEDIMENTOS GIT E DEPLOY

```bash
# Depois de qualquer mudança:
git add .
git commit -m "tipo: descrição clara"
git push origin main
# → Deploy automático no Render (~5min para os 3 frontends)
# → Backend reinicia localmente via ts-node-dev hot reload
```

**⚠️ SEMPRE** verificar erros TypeScript antes do push (`tsc --noEmit`). O Render falha se tsc retornar erro.

**Convenções de commit**: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`

---

## 18. SEGURANÇA E AUTENTICAÇÃO

### 18.1 JWT

| Token | Duração | Armazenamento |
|---|---|---|
| Access Token | 7 dias | localStorage (frontend) |
| Refresh Token | 30 dias | banco `refresh_tokens` + localStorage |
| Impersonação | 2 horas | apenas localStorage, sem banco |

**Payload JWT**: `{ id, login, role, name }`

### 18.2 CORS

Origens permitidas: `FRONTEND_URL`, `CLIENTES_URL`, `PORTFOLIO_URL`, `*.onrender.com`, `localhost:*`
Requests sem origin (curl, mobile) são permitidos.

### 18.3 Rate Limiting

| Escopo | Limite |
|---|---|
| Geral | 2000 req / 15 min |
| `/api/auth/login` | 30 req / 15 min |

### 18.4 Segurança de Arquivos

- Aprovações: `Content-Disposition: inline` (força visualização, impede download)
- Thumbs: sanitização de path traversal (`../` removido)
- Thumbs: verificação de que o path está dentro do `THUMBS_BASE`
- Pastas de clientes: cliente só acessa sua própria pasta (validação por `user.login`)

---

## 19. MANUTENÇÃO DO SISTEMA

Todas as operações em **Admin → Supervisão → Manutenção**:

| Ação | Rota | Descrição |
|---|---|---|
| Status | `GET /api/maintenance/status` | Verifica portas 3000/4500, Funnel, scripts |
| Reiniciar Backend | `POST /api/maintenance/restart-backend` | Mata :3000 (Supervisor reinicia) |
| Reiniciar Supervisor | `POST /api/maintenance/restart-supervisor` | Mata :3000 + :4500 + Electron, reabre via VBS |
| Ativar Funnel | `POST /api/maintenance/activate-funnel` | `tailscale funnel 3000` |
| Rodar Migration | `POST /api/maintenance/run-migration` | `CREATE TABLE IF NOT EXISTS` + backfills |
| Gerar Thumbs | `GET /api/maintenance/generate-thumbs` | SSE ao vivo do PS1 |

**Migration inclui backfills**:
- Preenche `expires_at = created_at + 15 dias` em `shared_links` e `approval_share_tokens` existentes sem expiração

---

## 20. TROUBLESHOOTING

### Thumb não atualiza
Cache do browser. Verificar cache buster `?v=timestamp`. Hard refresh (Ctrl+F5).

### Erro "Expressão de Valor Nulo" no PS1
Arquivo CDR aberto no Corel (file lock). Fechar Corel e tentar novamente.

### Backend não recarrega código novo
1. Admin → Supervisão → Manutenção → Reiniciar Backend
2. Se persistir: fechar Supervisor, apagar `backend/dist/`, reabrir pelo atalho

### Telemetria não aparece
1. Manutenção → Rodar Migration (verifica tabelas)
2. Supervisor rodando? (ícone na área de trabalho)
3. `BACKEND_URL` do Supervisor aponta para `:3000` (não `:3001`)?
4. Checar logs por `sendTelemetry falhou`

### 500 ao trocar status do projeto
ENUM desatualizado. Executar migration (additive, idempotente).

### Links expirados não somem
Rodar migration para executar o backfill de `expires_at`. Links antigos sem data ganham `created_at + 15 dias`.

### Adblock bloqueia `/logs/beacon`
Normal — `sendBeacon` bloqueado por alguns adblockers. `/ingest` continua funcionando. Apenas o evento de saída pode ser perdido.

### Rota `/api/projects/approval-share-tokens` retorna 404
Verificar ordem de registro em `server.ts`: `projectApprovalsRoutes` DEVE ser registrado **antes** de `projectsRoutes`. O `GET /:id` do projects captura rotas estáticas se vier primeiro.

### WhatsApp — QR não aparece na aba Supervisão
1. Verificar se o backend foi reiniciado após os commits do WhatsApp
2. Status mostrando `disconnected`? → Reiniciar Backend (Manutenção) e aguardar 10–15s
3. Status mostrando `initializing`? → Puppeteer ainda carregando. Aguardar e atualizar a aba
4. QR não aparece mesmo com `qr_pending`? → API `api.qrserver.com` pode estar bloqueada. Usar o QR em texto (collapsible)

### WhatsApp — Erro "Número não encontrado"
O número do cliente está cadastrado no campo `phone` mas com formato errado. Formatos aceitos: `75999878260`, `75 99987-8260`, `+5575999878260`. O serviço normaliza automaticamente removendo não-dígitos e adicionando `55` se necessário.

### WhatsApp — Erro "Cliente inativo ou bloqueado"
O status do cliente em Admin → Clientes deve ser `Ativo`. Clientes bloqueados não recebem notificações.

### WhatsApp — `auth_failure` após restart
Sessão corrompida. Deletar a pasta `backend/.wwebjs_auth/`, reiniciar o backend e escanear o QR novamente.

### WhatsApp — botão vermelho após envio bem-sucedido anterior
O estado de erro persiste da última tentativa registrada no banco. Clique novamente para reenviar — o botão voltará a verde após novo envio bem-sucedido.

### Sidebar do cliente mostra "Em análise" mesmo após reprovação
Ocorre quando a sessão de impersonação foi aberta antes da reprovação ser processada — o token JWT ainda carregava `partner_request_status='pending'`. O polling de 5s atualiza automaticamente em até 5 segundos após recarregar a página. Não é necessária nenhuma ação adicional.

### Endpoints temporários de debug do Clube de Parceiros
Presentes em `server.ts` apenas para diagnóstico:
- `GET /api/debug-partner-status` — lista usuários com status não nulo
- `GET /api/fix-partner-status` — zera todos os `partner_request_status`

> ⚠️ **Remover** quando não forem mais necessários (não têm autenticação e afetam dados em produção).

---

## 21. VARIÁVEIS DE AMBIENTE

### 21.1 Backend (`.env` na raiz do projeto)

```env
# Servidor
PORT=3000
NODE_ENV=development

# Banco
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=...          ← ATENÇÃO: DB_PASS, não DB_PASSWORD
DB_NAME=pixelbox_portal

# JWT
JWT_SECRET=...
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES_IN=30d

# Caminhos locais
CLIENTS_BASE_PATH=F:\PixelBox\CLIENTES
PORTFOLIO_PATH=F:\PixelBox\PORTIFÓLIO
THUMBS_PATH=F:\PixelBox\arquivos_server\thumbs
UPLOAD_PATH=F:\PixelBox\versao_local\uploads
LOG_PATH=F:\PixelBox\arquivos_server\logs
THUMBS_SCRIPT_PATH=F:\PixelBox\versao_local\capturar-thumbs-clientes-v2.ps1

# Ferramentas
FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe

# WhatsApp (opcional — padrão já funciona)
WA_SESSION_PATH=F:\PixelBox\versao_local\backend\.wwebjs_auth
# PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe  ← só se quiser usar Chrome em vez do Chromium embutido

# Exposição pública
RENDER_EXTERNAL_URL=https://desktop-e6jr4dk.tailc1230a.ts.net
FRONTEND_URL=https://admin-piv6.onrender.com
CLIENTES_URL=https://clientes-5sjd.onrender.com
PORTFOLIO_URL=https://portifolio-e1g9.onrender.com
SUPERVISOR_URL=http://localhost:4500

# Keep-alive (Supervisor)
RENDER_KEEP_ALIVE_URLS=https://admin-piv6.onrender.com,https://clientes-5sjd.onrender.com,https://portifolio-e1g9.onrender.com
```

### 21.2 Frontend Admin / App Clientes / App Portfolio (Render.com — Environment Variables)

```env
VITE_API_URL=https://desktop-e6jr4dk.tailc1230a.ts.net
VITE_CLIENTES_URL=https://clientes-5sjd.onrender.com   # usado para montar URLs de aprovação
```

### 21.3 Supervisor (`apps/portfolio/server.js`)

```env
BACKEND_URL=http://localhost:3000    ← padrão correto
SUPERVISOR_PORT=4500
SUPERVISOR_LOG_DIR=F:\PixelBox\arquivos_server\logs
RENDER_KEEP_ALIVE_URLS=...           ← separados por vírgula
```

---

## 22. ARQUIVOS ESSENCIAIS

| Arquivo | Função |
|---|---|
| `INICIAR_SUPERVISOR_SEM_TERMINAL.vbs` | Inicia o Supervisor sem abrir terminal |
| `capturar-thumbs-clientes-v2.ps1` | Geração em massa de thumbs (preserva existentes) |
| `extrair-thumb-windows.ps1` | Base Windows Shell API (inclui fallback PDF) |
| `CRIAR_ATALHOS_DESKTOP.bat` | Cria atalhos na área de trabalho (executar uma vez) |
| `apps/portfolio/server.js` | Supervisor de logs (porta 4500) |
| `backend/src/utils/telemetry.ts` | Processador de telemetria (Map em memória → banco) |
| `backend/src/controllers/maintenance.controller.ts` | Ações de manutenção do sistema |
| `backend/src/controllers/projectApprovals.controller.ts` | Todas as funções de aprovação |
| `backend/src/controllers/sharedLinks.controller.ts` | Links públicos de arquivos |
| `backend/src/services/WhatsAppService.ts` | Singleton do whatsapp-web.js — autenticação, envio, throttle, logs |
| `backend/src/controllers/whatsapp.controller.ts` | Endpoints de status e envio de notificação |
| `backend/src/routes/whatsapp.routes.ts` | Rotas `/api/whatsapp` (admin only) |
| `backend/.wwebjs_auth/` | Sessão persistida do WhatsApp (LocalAuth) — **não commitar** |
| `backend/src/config/migrateModule.ts` | Migrations + backfills automáticos |
| `backend/src/server.ts` | Entry point — ordem crítica de registro de rotas |
| `frontend/src/components/ui/FileExplorerModal.tsx` | Modal estilo Windows Explorer para seleção de thumbnail |

---

## 23. CHANGELOG

### 12/07/2026 — v4.7.0

#### Sistema de Alterações Automáticas com 5 Gratuitas

**Regra de negócio implementada:**
- Primeiras **5 versões** de aprovação são **gratuitas**
- A partir da **6ª versão**: cobrança automática de **30% do valor da arte** por alteração
- Cálculo: `(total_versões - 5) × (valor_arte × 0.30)`
- Admin pode ajustar manualmente porcentagem ou valor

**Botão "Auto" (verde com ícone $):**
- Aparece ao lado do botão "Editar" na seção Alterações do ProjectDetail
- Calcula automaticamente quando há 6+ versões
- Validações:
  - Se ≤5 versões: toast informativo "Ainda dentro das 5 alterações gratuitas"
  - Se valor = 0: toast erro "Projeto sem valor definido"
- Após cálculo: mostra toast com resultado "3× R$ 15,00 (30%)"
- Atualiza via `qc.invalidateQueries()` sem reload da página

**Campo de porcentagem editável:**
- Padrão: 30%
- Sincronização bidirecional:
  - Mudar % → recalcula valor: `(valor_arte × %) / 100`
  - Mudar valor → recalcula %: `(valor / valor_arte) × 100`
- Admin pode ajustar conforme negociação com cliente

**Contador de alterações gratuitas no WhatsApp:**
- Mensagem customizada por versão ao compartilhar modelo para aprovação:
  - **Versão 1:** "Primeira versão. Você tem 5 alterações gratuitas restantes."
  - **Versões 2-5:** "Versão X (Alteração Y). Ainda restam N alterações gratuitas."
  - **Versão 6+:** "Versão X (Alteração Y). Alterações gratuitas esgotadas. Valor adicional: R$ XXX (30% por alteração)."
- Cliente sempre ciente de quantas alterações gratuitas restam

**Arquivos modificados:**
- `backend/src/controllers/whatsapp.controller.ts` — lógica de contador em `shareApprovalVersion()`
- `frontend/src/pages/admin/ProjectDetail.tsx` — botão Auto + campo porcentagem + sync bidirecional

#### Botão Colar Imagem da Área de Transferência

**Funcionalidade:**
- Novo botão "Colar" ao lado de "Selecionar arquivos" no upload de aprovação
- Lê imagem diretamente do clipboard com `navigator.clipboard.read()`
- Suporta Ctrl+C + Ctrl+V de screenshots ou imagens copiadas
- Gera nome automático: `clipboard-[timestamp].[extensão]`
- Detecta tipo MIME automaticamente (png, jpg, gif, webp)

**Use case:**
- Admin dá print screen (Win+Shift+S ou PrtScn)
- Abre projeto → Modelos para Aprovação → Clica "Colar"
- Imagem aparece como preview
- Envia versão sem precisar salvar arquivo no disco

**Arquivos modificados:**
- `frontend/src/components/ui/ProjectApprovalSection.tsx` — botão Colar + `handlePasteFromClipboard()`

#### Card Inteiro Clicável + Botão Duplicar Projeto

**Melhorias de UX:**
- ❌ **Removido:** botão olhinho (Eye) dos cards de projeto
- ✅ **Card inteiro clicável:** clicar em qualquer lugar abre o detalhe do projeto
- ✅ **Botão caneta (Pencil)** permanece para edição inline com `stopPropagation()`
- ✅ **Novo botão "Duplicar"** na página de detalhe do projeto

**Botão Duplicar:**
- Abre modal de criação com todos os campos preenchidos:
  - Cliente, Título (com sufixo " - Cópia"), Descrição, Empresa, Prioridade, Valor, Data de entrega
- Admin pode ajustar antes de criar
- Útil para projetos recorrentes ou variações de um mesmo trabalho

**Arquivos modificados:**
- `frontend/src/pages/admin/Projects.tsx` — card onClick + Eye removido + Pencil com stopPropagation
- `frontend/src/pages/admin/ProjectDetail.tsx` — botão Duplicar + `handleDuplicate()`

#### Identidade Visual Única para Cada Status

**Problema anterior:**
Vários status tinham cores iguais ou muito similares — difícil diferenciar visualmente.

**Solução:**
Cada status agora tem uma cor única e significativa que representa seu contexto:

| Status | Cor Tailwind | Significado Visual |
|--------|--------------|-------------------|
| 🆕 Recebido | `slate-600` | Novo projeto, ainda não iniciado |
| 🔍 Em análise | `blue-600` | Estudando requisitos, analisando |
| 💻 Em desenvolvimento | `purple-600` | Criando, desenvolvendo |
| ⏳ Aguardando aprovação | `yellow-600` | Esperando decisão do cliente |
| 🔄 Em revisão | `orange-600` | Ajustando, corrigindo feedback |
| ✅ Finalizado | `emerald-600` | Pronto, completo, aprovado |
| 📦 Entregue | `green-600` | Enviado ao cliente |
| ❌ Cancelado | `red-600` | Parado, não vai acontecer |
| 💰 Pendente pagamento | `amber-600` | Aguardando pagamento |
| ✔️ Pago | `cyan-600` | Dinheiro recebido |
| 🔁 Reaberto | `pink-600` | Voltou, reabertura |
| 🎁 Cortesia | `indigo-600` | Presente, trabalho grátis |

**Tom de cor ajustado:**
- Base: `-600` (mais saturado para diferenciação)
- Background: `/20` opacity (fundo suave)
- Text: `-300` (mais claro para contraste no fundo escuro)
- Border: `-500/40` (meio termo entre bg e text)

**Aplicado em:**
- ✅ Frontend Admin — cards de projetos e badges
- ✅ Frontend Clientes — cards de projetos e badges
- ✅ Consistência visual em ambos os portais

**Arquivos modificados:**
- `frontend/src/utils/index.ts` — `PROJECT_STATUS_COLORS` com 12 cores únicas
- `apps/clientes/src/utils/index.ts` — `PROJECT_STATUS_COLORS` sincronizado

**Commits incluídos:**
```
eee1709 — feat: cores unicas e significativas para cada status
0f40026 — fix: remove reload automatico e simplifica botao Auto
744ac9c — debug: adiciona logs backend para revision_value e revision_qty
ebabe1b — debug: adiciona logs COMPLETOS do FormData e resposta do servidor
9f73684 — fix: adiciona reload forcado apos calculo automatico
fe93aed — debug: adiciona logs e refetch no botao Auto
dcb0d44 — feat: botao Auto para calculo manual de revisao 30%
0a93241 — feat: adiciona botao manual auto-calcular + logs detalhados
7743e20 — debug: adiciona logs detalhados no calculo automatico
9c29b12 — chore: trigger render redeploy
340fdfd — feat: calculo automatico de revisao com porcentagem editavel
92c2046 — fix: corrige nome do metodo para listApprovalVersions
8c9ab58 — feat: calculo automatico de revisao + contador alteracoes gratuitas
fb9fdf0 — feat: botao colar imagem da area de transferencia
bad01bd — feat: card inteiro clicavel + botao duplicar projeto
```

### 06/07/2026 — v3.4.0

#### Sistema de Links Compartilhados — Unificação e Expiração

- **Expiração universal**: ambos os tipos de links/tokens agora expiram em **15 dias** da criação
  - `shared_links`: `expires_at = created_at + 15 dias` no `createSharedLink`
  - `approval_share_tokens`: `expires_at = created_at + 15 dias` no `createApprovalShareToken`
  - Verificação de expiração ativa em `getSharedLink`, `downloadSharedFile` e `getApprovalShareData` (HTTP 410)
- **Backfill automático**: migration preenche `expires_at` em registros antigos sem data
- **Aba Links Compartilhados unificada**: duas seções na mesma view (sem sub-abas separadas)
  - Seção "Aprovação de versões": token, versão, criado em, **expira em**, status (inclui Expirado), aprovação
  - Seção "Arquivos do projeto": token, visualiz., downloads, criado em, **expira em**, status
  - Stats combinados no topo: Total de links, Ativos, Aprovados
  - `ExpiryBadge` component: badge colorido com dias restantes (vermelho=expirado, laranja≤3d, cinza>3d)

#### Fix de Roteamento de API

- **Bug resolvido**: `/api/projects/approval-share-tokens` retornava 404 "Projeto não encontrado"
- **Causa**: `projectsRoutes` (com `GET /:id`) registrado antes de `projectApprovalsRoutes`
- **Fix**: `projectApprovalsRoutes` registrado **antes** de `projectsRoutes` em `server.ts`

#### Novas rotas admin para tokens de aprovação

- `GET /api/projects/approval-share-tokens` — lista com search e paginação
- `PATCH /api/projects/approval-share-tokens/:id/toggle` — ativar/desativar
- `DELETE /api/projects/approval-share-tokens/:id` — remover

### 04/07/2026 — v3.3.0

#### Módulo de Aprovação de Projetos

- Tabela `project_approval_versions` com versionamento incremental
- Upload com otimização automática: imagens (Sharp) e vídeos (FFmpeg H.264 faststart)
- Visualização inline: PDF paginado via `pdf-to-img`, vídeos com range requests
- Rejeição com comentário: `rejected_at`, `rejected_by`, `review_comment`
- Link público de aprovação (`approval_share_tokens`): `/aprovacao/:token`
- Notificações no sino do admin (`audit_logs action='approval_notification'`)
- Reset de alarmes: `resetUnviewedApprovals` para admin visualizar sem afetar cliente
- Pin piscando no card do projeto quando há versão não vista
- Status badges: Novo, Visualizado, Aprovado, Revisão

### 04/07/2026 — v3.2.0

#### Fix de Thumbnails — Preservação Inteligente

- Thumbnails não são substituídas automaticamente
- `refreshThumbnails()` preserva thumbs existentes
- Matching específico por `folder_path` — sem fallback de "mais recente"
- Geração manual via botão "Regenerar Thumbnail"
- Suporte a thumbnails de PDF via `extrair-thumb-windows.ps1`

### 02/07/2026 — v3.1.0

#### Links de Compartilhamento de Arquivos

- Tabela `shared_links` com token de 12 chars, view/download count
- Botão "Copiar link" no ProjectDetail do App Clientes
- Página pública `/s/:token` sem autenticação
- Aba "Links Compartilhados" na Supervisão

#### Keep-Alive anti-sleep Render

- Supervisor faz `HEAD /` a cada 2 minutos nos 3 serviços

### 01/07/2026 — v3.0.0

#### Sistema de Telemetria

- Tabelas `telemetry_sessions`, `telemetry_pageviews`, `telemetry_clicks`, `telemetry_daily`
- Dashboard de Telemetria no Admin com KPIs, heatmap, navegadores, OS, conexão, fluxo
- Sessões de admin não geram telemetria

#### Sessão de Impersonação

- Admin entra como cliente via Portal Clientes
- Token de 2h, sem banco, sem telemetria
- Banner âmbar de identificação

#### Sistema de Manutenção Integrado

- Aba Manutenção em Supervisão com 6 ações
- Status em tempo real: portas, Tailscale, scripts

### 26/06/2026 — v2.1.0

- 3 novos status: `pending_payment`, `paid`, `reopened`
- Download múltiplo no App Clientes
- Thumbs `object-contain` (sem corte)
- Topbar compacto mobile no Portal Clientes
- Cards 2 colunas no Portal Clientes

### 07/07/2026 — v3.5.0

#### Cobertura Completa de Logs e Telemetria

**Gaps de logging resolvidos:**

- **`downloadRequests.controller.ts`**: adicionado `logger.info` em `requestDownload` (solicitação criada), `executeDownload` (download executado) e `reviewRequest` (aprovado/rejeitado pelo admin)
- **`clientFolders.controller.ts`**: adicionado `logger.info` em `serveClientFile` (arquivo servido) e `syncFoldersAsClients` (sync concluído)
- **`apps/clientes/src/main.tsx`**: corrigido `user: () => null` → `user: () => useAuthStore.getState().user?.login || null` — agora `telemetry_sessions.user_login` é preenchido para sessões de clientes autenticados
- **`SharedLink.tsx`**: importado `log` do `pixelbox-logger`; adicionados logs de visualização do link (quando dados carregam), download iniciado e download concluído/erro
- **`ApprovalShare.tsx`**: importado `log` do `pixelbox-logger`; adicionados logs de abertura da página (com projeto/versão/arquivos), aprovação bem-sucedida, rejeição solicitada e erros das mutations
- **`ProjectDetail.tsx`** (App Clientes): adicionados logs de download iniciado/concluído/erro, geração de link de compartilhamento (gerado/erro) e abertura do viewer de aprovação
- **`Portfolio.tsx`**: adicionado log `lightbox: aberto` com contexto completo (nome do item, tipo, index, total, categoria, empresa, subpath) na função `openLightbox`

**Nova tabela: `telemetry_events`**
```sql
id          BIGINT AUTO_INCREMENT PK
session_id  VARCHAR(36)   -- FK → telemetry_sessions.id
module      VARCHAR(50)   -- clientes | portfolio | admin
page        VARCHAR(200)  -- rota atual
event_type  VARCHAR(80)   -- ex: lightbox:aberto | shared-link:download iniciado | approval-share:versão aprovada
event_label VARCHAR(200)  -- nome do item (arquivo, projeto, empresa)
event_meta  JSON NULL      -- dados extras relevantes (token, version, category, etc.)
occurred_at DATETIME
-- Índices: session_id, module, event_type, occurred_at, (module, event_type)
```

**Processador de telemetria expandido (`telemetry.ts`):**
- Nova função `insertEvent(session, eventType, label, meta, ts)` — persiste na `telemetry_events`
- Novo handler no `processOne`: detecta mensagens com prefixos `lightbox:`, `shared-link:`, `approval-share:`, `project:`, `event:`, `download:`, `approval:` e converte em evento estruturado
- Meta limpa: extrai apenas campos relevantes (`type`, `index`, `total`, `category`, `company`, `version`, `token`, `has_unviewed`, `files`, `existing`, `hasComment`) sem dados grandes

**Controller de telemetria expandido (`telemetry.controller.ts`):**
- 5 novas queries: `topEvents`, `eventsByType`, `lightboxStats`, `downloadEvents`, `approvalEvents`
- Todas com `try/catch` silencioso — tabela pendente de migration não causa erro 500

**Dashboard de Telemetria — nova seção "Eventos de Negócio":**
- **Eventos por Tipo**: HBar com todos os event_type, colorido por categoria (verde=aprovação, azul=download, roxo=lightbox)
- **Lightbox — Mais Vistos**: arquivos do portfólio mais abertos no lightbox, com tipo (imagem/vídeo)
- **Aprovações via Link**: ações de aprovação/rejeição via token público, por projeto
- **Downloads via Link Compartilhado**: arquivos baixados via `/s/:token`, com contagem de IPs únicos

**Migration atualizada:**
- Cria tabela `telemetry_events` via `CREATE TABLE IF NOT EXISTS` (idempotente)
- Additive: garante `MODIFY COLUMN user_login` aceita NULL corretamente

---


### 07/07/2026 — v3.6.0

#### Correção de thumbnail nos modais de projeto

**Bug corrigido:** `updateProject` e `createProject` retornavam HTTP 500 com erro `The "data" argument must be of type string or an instance of Buffer` ao tentar salvar com thumbnail selecionada.

**Causa raiz:** o middleware `upload` usa `diskStorage` — salva o arquivo em `uploads/temp/` e **não preenche `req.file.buffer`** (fica `undefined`). O código antigo passava `req.file.buffer` diretamente para o Sharp, causando o crash.

**Fix:** trocado para `fs.readFileSync(req.file.path)` para ler o arquivo do disco antes de processar. Arquivo temporário removido com `fs.unlinkSync` após o processamento.

#### Novo seletor de thumbnail — FileExplorerModal (estilo Windows Explorer)

**Componente:** `frontend/src/components/ui/FileExplorerModal.tsx`

**O botão "Definir thumb"** nos modais Criar/Editar projeto agora abre um modal dedicado que imita o Windows Explorer:

- **Barra de título** com nome do cliente e botão X
- **Toolbar**: setas ← (voltar) → (avançar) ↑ (subir nível) com histórico de navegação completo
- **Barra de endereço** (breadcrumb clicável) — cada segmento do caminho é clicável
- **Campo de busca** — filtra por nome em tempo real sem nova chamada à API
- **Toggle Grade/Lista** — grade com thumbnails 120px e lista com colunas detalhadas
- **Ordenação por coluna** — Nome, Data de modificação, Tipo, Tamanho (seta ↑/↓) — pastas sempre primeiro
- **Single click em pasta** → navega para dentro; **single click em arquivo** → destaca (pending); **duplo clique em arquivo** → confirma seleção
- **Barra inferior**: exibe o arquivo selecionado + botões Cancelar / Selecionar
- **Viewport:** 96vw × 94vh — cobre quase toda a tela

**Mesma API de antes** — `clientFoldersApi.listFiles()` sem mudança alguma no backend.

**Fix crítico:** modal usa `ReactDOM.createPortal(content, document.body)` — renderiza diretamente no `<body>`, **fora do DOM do `<form>`**. Todos os `<button>` têm `type="button"` explícito. Nenhum clique dentro do FileExplorer pode disparar o submit do formulário pai.

#### Logging e telemetria completos — v3.5.0 (retroativo)

- `downloadRequests.controller.ts` — logs em `requestDownload`, `executeDownload`, `reviewRequest`
- `clientFolders.controller.ts` — logs em `serveClientFile` e `syncFoldersAsClients`
- `apps/clientes/src/main.tsx` — `user: () => null` corrigido para `user: () => useAuthStore.getState().user?.login || null`
- `SharedLink.tsx` — logs de visualização, download iniciado/concluído/erro
- `ApprovalShare.tsx` — logs de abertura, aprovação, rejeição e erros
- `ProjectDetail.tsx` (App Clientes) — logs de download, share link, abertura do viewer
- `Portfolio.tsx` — log `lightbox: aberto` com contexto completo na função `openLightbox`
- Nova tabela `telemetry_events` — captura eventos de negócio estruturados
- Processador de telemetria expandido — handler para prefixos `lightbox:`, `shared-link:`, `approval-share:`, `project:`
- Dashboard de Telemetria — nova seção "Eventos de Negócio": Eventos por Tipo, Lightbox Mais Vistos, Aprovações via Link, Downloads via Link

#### Proteção anti-telemetria admin — v3.5.1

- **Dupla barreira no processador:** `l.module !== 'admin'` E `!l.meta?._adminSession`
- **Logger do admin** (`frontend/src/utils/pixelbox-logger.ts`) — sempre injeta `_adminSession: true` em todos os logs
- **Admin abre Portfolio/Clientes com `?_admin=1`** na URL (botões da sidebar)
- `apps/portfolio/src/main.tsx` e `apps/clientes/src/main.tsx` — detectam `?_admin=1`, setam `window.__pixelboxAdminSession = true`, limpam a URL com `history.replaceState`
- **Banner âmbar** no Portfolio quando aberto pelo admin: "👁 Sessão de visualização admin · Sem registro de telemetria"

#### Zeragem do banco de telemetria

- Todas as 5 tabelas de telemetria zeradas via `TRUNCATE` em 07/07/2026 às 17:33 (marco zero)
- A partir deste ponto, todos os dados são de uso real de clientes e visitantes

---

### 08/07/2026 — v3.7.0

#### Normalização de datas — fuso Brasília (UTC-3)

**Problema:** `date-fns` + `parseISO` + `format` não respeitam timezone — usavam o fuso local do browser/servidor. Strings ISO (`2026-07-07T03:00:00.000Z`) apareciam cruas no gráfico de telemetria.

**Solução:** `formatDate` e `formatDatetime` reescritos usando `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'` — nativo, sem dependência extra, correto em qualquer timezone do browser.

**Formato padronizado em todo o sistema:** `dd/mm/aaaa - HH:mm` (24h, Brasília)

**Arquivos corrigidos:**
- `frontend/src/utils/index.ts` — `formatDate` e `formatDatetime` com `Intl.DateTimeFormat`
- `apps/clientes/src/utils/index.ts` — idem
- `frontend/src/pages/admin/TelemetryDashboard.tsx` — `fmtDay()` para datas ISO do gráfico; botão "Personalizado" mostra datas formatadas
- `frontend/src/pages/admin/Supervision.tsx` — `toLocaleDateString` → `formatDatetime`
- `frontend/src/pages/admin/Projects.tsx` — prazo → `formatDate`
- `frontend/src/pages/admin/ProjectDetail.tsx` — prazo → `formatDate`
- `frontend/src/pages/admin/Portfolio.tsx` — criado/modificado → `formatDate`
- `frontend/src/components/ui/FileExplorerModal.tsx` — adicionado `timeZone` + `hour12: false`
- `apps/clientes/src/pages/client/ProjectDetail.tsx` — prazo → `formatDate`
- `apps/clientes/src/pages/shared/SharedLink.tsx` — expira em → `formatDate`
- `apps/clientes/src/pages/shared/ApprovalShare.tsx` — `fmt()` local → `formatDatetime`
- `apps/clientes/src/components/ui/ProjectApprovalViewer.tsx` — helpers locais removidos, usa utils
- `frontend/src/utils/exportPDF.ts` — header e rodapé do PDF com `timeZone: Sao_Paulo`

#### Drag-to-zoom e seletor de período no gráfico de telemetria

**Componente `TimeSeries`** completamente reescrito:
- **Arrastar sobre as barras** define um intervalo de zoom — overlay azul durante o drag, badge `📅 dd/mm → dd/mm · N dias` ao confirmar
- **Botão "Ver tudo"** (com ícone ZoomOut) reseta o zoom
- Barras fora da seleção ficam escurecidas; dentro ficam em destaque
- Suporte a touch (mobile)

**Botão "Personalizado"** ao lado dos botões 7d/14d/30d/60d/90d:
- Abre dropdown `DateRangePicker` com presets rápidos e inputs `<input type="date">`
- Ao aplicar, refaz a query com o número de dias exato
- Botão mostra o range ativo (`dd/mm → dd/mm`) com X para limpar
- Fecha ao clicar fora (useEffect com `mousedown`)

#### Preços dos projetos nos cards admin

Campo `value` exibido no card de projeto em `Projects.tsx`:
- Linha com prazo (esquerda) e `R$ X.XXX,XX` em azul (direita)
- Só aparece quando `value > 0`

#### Versões rejeitadas — sem botão de compartilhar

`ProjectApprovalViewer.tsx` (app clientes): botão "Compartilhar" oculto (`!isRejected`) em versões com `rejected_at`.

#### Auto-reprovação de versões pendentes

Ao fazer upload de nova versão (`uploadApprovalVersion`), o backend agora:
1. Busca todas as versões pendentes do projeto (`approved_at IS NULL AND rejected_at IS NULL`)
2. Marca como rejeitadas com `review_comment = 'Reprovada automaticamente — nova versão enviada'`
3. `rejected_by` = admin que fez o upload
4. A nova versão é inserida em seguida

Garante que nunca haja duas versões aguardando aprovação ao mesmo tempo.

---

### 27/07/2026 — v4.5.0 🔒 CHECKPOINT PERMANENTE

> ⚠️ **ESTE CHECKPOINT NUNCA DEVE SER REMOVIDO**
>
> **Commit de referência:** `1c71344`

#### Dashboard — Filtros Inteligentes e Navegação Contextual

**Filtro de Período (global):**
- Estado: `periodStart` / `periodEnd` — padrão mês atual, opção "Todos"
- Presets: Este mês, Mês passado, Últimos 7/30d, Este ano
- Afeta todos os badges via `filteredProjects` (useMemo)

**Filtro de Cliente (setorial):**
- Estado: `selectedClientId` — dropdown ordenado alfabeticamente
- Filtra dentro do período estabelecido
- Afeta: Indicadores Gerais, Projetos por Status, Indicadores Financeiros, Período

**Navegação contextual — `goToProjects(extra)`:**
- Monta URL `/admin/projects?clientId=X&dateFrom=Y&dateTo=Z&status=W`
- Qualquer badge clicável preserva os filtros ativos ao navegar

**Correção hooks (React error #310):**
- `filteredStatusBreakdown` e `filteredCounts` movidos para antes dos `return` antecipados
- Regra: nenhum `useMemo`/`useEffect`/`useState` pode ficar após `if (...) return`

#### Projetos — Filtro de Período

**Frontend:**
- Estado: `dateFrom` / `dateTo` lidos de `searchParams` na montagem
- Dropdown com presets + inputs manuais + botão limpar
- `queryKey` inclui `dateFrom` e `dateTo`

**Backend (`listProjects`):**
```typescript
if (dateFrom) { where += ' AND DATE(p.created_at) >= ?'; params.push(dateFrom); }
if (dateTo)   { where += ' AND DATE(p.created_at) <= ?'; params.push(dateTo); }
```

#### Status Cortesia (`courtesy`)

**Banco de dados:**
```sql
-- ENUM atualizado na migration
ENUM('received','analyzing','developing','awaiting_approval','in_revision',
     'finalized','delivered','cancelled','pending_payment','paid','reopened','courtesy')
```

**Regras de negócio:**
- `courtesy` entra em `CANCELLED_STATUSES` — não contabiliza em nenhum cálculo financeiro
- Nos cards (admin + cliente): exibe **"Cortesia — Gratuito"** em roxo itálico
- Linhas de Valor / Alterações / Total somem para projetos Cortesia
- No ProjectDetail do cliente: campo Valor exibe "Cortesia — Gratuito"
- Badge visual: `bg-purple-500/20 text-purple-400 border-purple-500/30`

**Arquivos afetados:**
```
backend/src/config/migrateModule.ts           — ENUM + STATUS_LABELS
backend/src/controllers/projects.controller.ts — STATUS_LABELS
frontend/src/types/index.ts                   — ProjectStatus
frontend/src/utils/index.ts                   — labels + cores
frontend/src/pages/admin/Dashboard.tsx        — CANCELLED_STATUSES
frontend/src/pages/admin/Projects.tsx         — ALL_STATUSES + display
frontend/src/pages/admin/ProjectDetail.tsx    — ALL_STATUSES
apps/clientes/src/types/index.ts              — ProjectStatus
apps/clientes/src/utils/index.ts              — labels + cores
apps/clientes/src/pages/client/ClientProjects.tsx — CANCELLED_STATUSES + display
apps/clientes/src/pages/client/ProjectDetail.tsx  — display
```

---

### 12/07/2026 — v3.9.1

#### Correções de Build TypeScript — Deploy Render

**Problemas bloqueando o deploy:**
1. **SharedLink.tsx linha 40**: erro `Uint8Array<ArrayBufferLike>[]` incompatível com `BlobPart[]`
2. **ProjectDetail.tsx linhas 105-107 e 390**: código duplicado causando erro de sintaxe

**Soluções aplicadas:**
- `SharedLink.tsx`: adicionado cast explícito `as BlobPart[]` ao retornar blob do download
- `ProjectDetail.tsx`: removida duplicação de código que fechava a função `handleDownload` duas vezes

**Contexto:** otimizações de download (remoção de chunking, buffer 512KB, timeout 0, achalote em barras de progresso) causaram merge incorreto, gerando código duplicado e tipo incompatível no streaming.

**Resultado:** build passa em ambiente Linux (Render) após correção.

---

### 08/07/2026 — v3.8.0

#### Notificações WhatsApp via whatsapp-web.js

**Objetivo:** Enviar notificação automática ao cliente quando uma nova versão de aprovação é enviada.

##### Arquitetura

```
Admin clica "WhatsApp" na versão
→ POST /api/whatsapp/send/:versionId
→ WhatsAppController busca projeto + cliente + telefone
→ Chama WhatsAppService.sendMessage()
→ WhatsAppService usa getNumberId() para resolver LID
→ client.sendMessage(numberId._serialized, message)
→ Registra resultado em whatsapp_notifications
→ Retorna { ok, notificationId, error? }
```

##### WhatsAppService (`backend/src/services/WhatsAppService.ts`)

Singleton com responsabilidades:
- **Inicialização**: `whatsapp-web.js` com `LocalAuth` — sessão persistida em `.wwebjs_auth/`
- **QR Code**: gerado no terminal E disponível via `GET /api/whatsapp/status` → campo `qr`
- **Throttle**: 2–5s aleatório entre envios (anti-spam)
- **Mutex por número**: `Set<string>` impede envios simultâneos para o mesmo destinatário
- **`getNumberId()`**: resolve o LID correto antes de enviar (fix para bug do WhatsApp)
- **Registro**: todo envio (sucesso ou erro) gravado em `whatsapp_notifications`

**Status possíveis:** `disconnected` | `initializing` | `qr_pending` | `authenticated` | `ready` | `auth_failure`

**Formato do número:** `+55DDNUMERO` ou `55DDNUMERO` → normalizado para `5575999878260@c.us`

##### Modelo de mensagem

```
Olá, {nome}!

Foi enviada uma nova versão do projeto *{título}* para sua aprovação.

Você pode visualizar diretamente pelo link abaixo:
{CLIENTES_URL}/#/client/projects/{project_id}

Após analisar, basta aprovar ou solicitar alterações.

Obrigado!
```

O link leva ao **portal do cliente autenticado** — não ao link público de compartilhamento.

##### Regras de segurança

- Apenas clientes `status = 'active'`
- Apenas números cadastrados em `users.phone`
- Nunca envia em massa automaticamente
- Intervalo mínimo de 2s entre envios
- Não permite envios simultâneos para o mesmo número

##### Novas rotas (`/api/whatsapp`) — admin only

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/whatsapp/status` | Estado da conexão + QR code (se pendente) |
| `GET` | `/api/whatsapp/notification/:versionId` | Último envio para uma versão |
| `POST` | `/api/whatsapp/send/:versionId` | Envia notificação ao cliente |

##### Nova tabela `whatsapp_notifications`

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | VARCHAR(36) PK | UUID |
| `project_id` | VARCHAR(36) | Projeto relacionado |
| `version_id` | VARCHAR(36) | Versão de aprovação |
| `client_id` | VARCHAR(36) | Cliente destinatário |
| `sent_by` | VARCHAR(36) | Admin que disparou |
| `recipient` | VARCHAR(30) | Número normalizado (`55DD@c.us`) |
| `message` | TEXT | Mensagem enviada |
| `success` | TINYINT(1) | 1 = sucesso, 0 = erro |
| `error_message` | TEXT NULL | Mensagem de erro (quando falhou) |
| `sent_at` | DATETIME | Timestamp do envio |

Migration automática no próximo start do backend (idempotente).

##### Interface no admin

Botão **WhatsApp** ao lado do ícone de lixeira em cada versão não rejeitada (`ProjectApprovalSection.tsx`):

- **Neutro** (cinza): versão ainda não foi notificada
- **Enviado** (verde com ✓): exibe data/hora do último envio abaixo do botão
- **Erro** (vermelho): tooltip com mensagem de erro, permite reenvio
- Estado `Enviando...` com spinner durante o envio
- Não aparece em versões com `rejected_at`

**Carregamento de histórico:** ao montar o componente, busca o último envio de cada versão não rejeitada via `GET /api/whatsapp/notification/:versionId`.

##### Aba WhatsApp na Supervisão

Nova aba **WhatsApp** em Admin → Supervisão → WhatsApp:

- **Card de status**: mostra estado atual (Desconectado / Iniciando / Aguardando QR / Autenticado / Conectado ✓ / Falha de auth)
- **QR Code visual**: aparece automaticamente quando `status = qr_pending` — imagem gerada via `api.qrserver.com` com o QR string do backend. Polling automático a cada 3s.
- **Instruções**: passo a passo para escanear no celular
- **QR em texto** (collapsible): fallback se a imagem não carregar
- **Sessão persistente**: após escanear uma vez, sessão salva em `backend/.wwebjs_auth/` — não pede QR novamente nos próximos restarts

##### Inicialização

Inicia 5 segundos após o `app.listen()`, em background (não bloqueia o servidor). Falhas na inicialização são logadas como `warn` e o servidor continua funcionando normalmente.

---

### 09/07/2026 — v3.9.0

#### Módulo Clube de Parceiros — Correções e Documentação

**Bug corrigido: `rejectPartnerRequest` retornava HTTP 500**

- **Erro:** `Data truncated for column 'partner_request_status' at row 1`
- **Causa raiz:** coluna `partner_request_status` criada como `VARCHAR(20)` não continha `'rejected'` como valor válido na ENUM do MariaDB — a coluna havia sido migrada sem o tipo ENUM correto.
- **Fix 1 (live):** `ALTER TABLE users MODIFY partner_request_status ENUM('pending','approved','rejected') NULL DEFAULT NULL;` aplicado diretamente no banco.
- **Fix 2 (persistente):** `migrateModule.ts` agora executa `MODIFY COLUMN` logo após o `ADD COLUMN IF NOT EXISTS`, garantindo que o tipo ENUM correto (com `'rejected'`) seja aplicado em qualquer ambiente após restart do servidor.

**Bug corrigido: sidebar do cliente mostrava "Em análise" após reprovação em sessão de impersonação**

- **Causa:** o polling de `GET /api/partner-requests/status` estava desabilitado com `enabled: !!user && !isAdminSession`. Durante impersonação, o token JWT ainda continha `partner_request_status='pending'` gerado antes da reprovação, e o store nunca era atualizado.
- **Fix:** polling habilitado para `enabled: !!user` — roda inclusive durante sessão de impersonação. O endpoint busca o status atualizado do banco a cada 5s, sincronizando o store e o sidebar automaticamente.
- **Segurança dos toasts:** toasts reativos (aprovação, remoção, reprovação) permanecem suprimidos durante `isAdminSession = true` — o admin não recebe alertas destinados ao cliente enquanto navega impersonando.

**Arquivos alterados:**
- `backend/src/config/migrateModule.ts` — `MODIFY COLUMN partner_request_status ENUM('pending','approved','rejected')`
- `apps/clientes/src/components/layout/ClientLayout.tsx` — `enabled: !!user` (era `!!user && !isAdminSession`); toasts condicionados a `!isAdminSession`

---

## 25. MÓDULO CLUBE DE PARCEIROS

### 25.1 Visão Geral

O Clube de Parceiros é um programa de benefícios para clientes selecionados. Ao ser admitido, o cliente passa a ter acesso à aba **Meus Arquivos** (bloqueada para não-membros) e pode baixar arquivos das suas pastas livremente.

**Colunas envolvidas na tabela `users`:**

| Coluna | Tipo | Significado |
|---|---|---|
| `partner_program` | TINYINT(1) DEFAULT 0 | `1` = membro ativo do Clube de Parceiros |
| `partner_request_status` | ENUM('pending','approved','rejected') NULL | `NULL` = nunca solicitou; `'pending'` = aguardando decisão; `'rejected'` = reprovado (pode re-solicitar) |

### 25.2 Fluxo Completo

```
1. Cliente clica "Solicitar análise de adesão" no modal Clube de Parceiros
   → POST /api/partner-requests
   → partner_request_status = 'pending'
   → INSERT audit_logs (action='partner_request_notification', metadata.read=false)
   → WhatsApp para o admin (se conectado)
   → Sidebar do cliente muda para "Em análise" (Clock âmbar pulsante)

2. Admin vê notificação no sino → GET /api/partner-requests
   (retorna notificações com metadata.read=false)

3a. Admin APROVA → PATCH /api/partner-requests/:id/approve
    → partner_program = 1, partner_request_status = NULL
    → Marca notificações do cliente como lidas
    → Cliente: toast de aprovação + modal de boas-vindas; sidebar muda para "Clube de Parceiros" (coroa amarela)
    → Aba "Meus Arquivos" desbloqueada

3b. Admin REPROVA → PATCH /api/partner-requests/:id/reject
    → partner_program mantém 0, partner_request_status = 'rejected'
    → Marca notificações do cliente como lidas
    → Cliente: toast de reprovação; sidebar volta ao estado "Clube de Parceiros" (apagado)
    → Botão muda para "Solicitar novamente"

4. Re-solicitação (após rejeição):
   → POST /api/partner-requests (mesma rota)
   → Limpa notificações antigas do cliente no audit_logs (read=true)
   → Cria nova notificação (read=false)
   → partner_request_status = 'pending'
```

### 25.3 Rotas do Módulo (`/api/partner-requests`)

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/partner-requests` | cliente | Solicita adesão (ou re-solicita após rejeição) |
| `GET` | `/api/partner-requests` | admin | Lista solicitações não lidas (sino do admin) |
| `PATCH` | `/api/partner-requests/:id/approve` | admin | Aprova: `partner_program=1`, `partner_request_status=NULL` |
| `PATCH` | `/api/partner-requests/:id/reject` | admin | Reprova: `partner_request_status='rejected'` |
| `GET` | `/api/partner-requests/status` | cliente | Consulta status próprio (com regra de consistência) |

**Regra de consistência do endpoint `/status`:**
- `'pending'` só é retornado se existir uma entrada em `audit_logs` com `action='partner_request_notification'` e `metadata.read=false` para o cliente.
- Se o admin leu/fechou o sino sem agir e a notificação foi marcada como lida, o status é auto-corrigido para `NULL` no banco.
- `'rejected'` é retornado diretamente sem verificar notificações — o admin agiu explicitamente.
- `partner_program=true` tem sempre precedência — status retorna `null` neste caso.

### 25.4 Controle via Admin

- **`PATCH /api/users/:id/partner-program`** — ativa/desativa o clube diretamente sem passar pelo fluxo de solicitação. Ao ativar: limpa `partner_request_status`. Ao desativar: também limpa `partner_request_status`.
- Endpoints de debug temporários presentes em `server.ts` (a remover):
  - `GET /api/debug-partner-status` — lista usuários com `partner_request_status` não nulo
  - `GET /api/fix-partner-status` — zera todos os `partner_request_status` do banco

> ⚠️ **AÇÃO PENDENTE**: Remover `GET /api/debug-partner-status` e `GET /api/fix-partner-status` de `server.ts` quando não forem mais necessários para debug.

### 25.5 Sidebar do App Clientes (`ClientLayout.tsx`)

O botão do Clube de Parceiros no sidebar tem 3 estados visuais:

| Estado | Condição | Aparência |
|---|---|---|
| Membro ativo | `partner_program = true` | Fundo amarelo, texto "Você faz parte do Clube de Parceiros", coroa dourada |
| Em análise | `requestStatus === 'pending'` | Fundo âmbar leve, Clock pulsante, texto "Clube de Parceiros · Em análise" |
| Não membro / reprovado | `requestStatus === null` ou `'rejected'` | Fundo cinza apagado, texto "Clube de Parceiros" |

**Nav item "Meus Arquivos":** bloqueado (substituído por botão que abre o modal) quando `partner_program = false`. Desbloqueado apenas para membros.

### 25.6 Polling de Status

- **Intervalo**: 5 segundos
- **Habilitado**: sempre que `!!user` — inclusive durante sessão de impersonação do admin
- **Toasts**: suprimidos quando `isAdminSession = true` (o admin não recebe alertas destinados ao cliente)
- **Sincronização**: a cada ciclo, `updateUser()` é chamado para manter o Zustand store alinhado com o banco
- **Re-solicitação**: ao enviar nova solicitação, `rejectedToastShown.current` é resetado para garantir que o toast de rejeição apareça novamente numa próxima reprovação

### 25.7 Schema de Notificação no `audit_logs`

```json
{
  "action": "partner_request_notification",
  "user_id": "<cliente_id>",
  "entity": "user",
  "entity_id": "<cliente_id>",
  "description": "Nome (@login) solicitou adesão ao Clube de Parceiros",
  "metadata": {
    "type": "partner_request_notification",
    "client_id": "<uuid>",
    "client_name": "Nome",
    "client_login": "login",
    "client_email": "email@...",
    "client_phone": "75...",
    "client_company": "Empresa",
    "read": false
  }
}
```

Ao aprovar ou reprovar, `metadata.read` é setado para `true` em **todas** as notificações não lidas daquele cliente.

### 25.8 Migration e Tipo da Coluna

A coluna `partner_request_status` foi inicialmente criada como `VARCHAR(20)`. A migration atual:
1. `ADD COLUMN IF NOT EXISTS partner_request_status VARCHAR(20) NULL DEFAULT NULL` — cria se não existir
2. `MODIFY COLUMN partner_request_status ENUM('pending','approved','rejected') NULL DEFAULT NULL` — converte para ENUM correto

Isso garante que `'rejected'` seja um valor válido em qualquer ambiente (incluindo após restart do servidor).

---

---

### 30/07/2026 — v4.6.0 🔒 CHECKPOINT PERMANENTE

> ⚠️ **ESTE CHECKPOINT NUNCA DEVE SER REMOVIDO**
>
> **Commit de referência:** `5522569` | **Commit atual:** `79db78c` (após amend)

#### Sistema de Backup MariaDB com Logs Detalhados + Supervisor Melhorado

**Funcionalidades implementadas:**

1. **Sistema de Backup Completo do MariaDB**
   - Botão "Backup do Servidor" na aba SUPERVISÃO do Supervisor desktop
   - Executa `mysqldump --all-databases --routines --events --triggers --single-transaction`
   - Formato: `backup_completo_YYYY-MM-DD_HHhMMmSSs.sql` (timestamp legível)
   - Armazenamento: `F:\backup_server\`
   - Política de retenção: mantém apenas os 3 backups mais recentes (deleta automático)
   - Tamanho médio: ~610 MB (2 bancos, 96 tabelas, milhões de linhas)

2. **Logs Detalhados de Backup (nível `backup`)**
   - Novo nível de log `backup` com cor roxa (`#a78bfa`) e negrito
   - Todos os logs aparecem na aba LOGS com filtro "backup"
   - Análise pré-backup completa:
     - 🗄️ **Bancos de dados** — lista com contagem de tabelas
     - 📋 **Tabelas detalhadas** — nome, número de linhas, tamanho em MB por banco
     - 📊 **Totais por banco** — soma de linhas e tamanho
     - 📊 **Total geral** — todas as linhas e tamanho consolidado
     - 🔧 **Triggers** — lista completa com banco e nome
     - ⚙️ **Procedures & Functions** — lista com banco, nome e tipo
     - 📅 **Eventos agendados** — lista com banco, nome e status
   - Verificação pós-backup:
     - ✅ Tamanho do arquivo gerado
     - 🔐 Caminho completo do arquivo salvo

3. **Correções no Supervisor**
   - Botão "Reiniciar Backend" agora força limpeza de processos orphan mesmo quando processo não está rastreado
   - Botão "Fazer Backup" volta ao estado normal após conclusão (não fica mais esmaecido)
   - Timeout de segurança de 3 minutos no botão para evitar travamento permanente

4. **Correção do Banco de Dados**
   - MariaDB 12.3: plugin de autenticação `auth_gssapi_client` incompatível → corrigido para `mysql_native_password`
   - Arquivo `.env` recriado com variável `PORT=3000` (backend subia na 3001 por falta dela)
   - Backend conecta sem erros de autenticação

**Solução técnica — arquitetura de logs:**

**Problema:** HTTP requests assíncronos individuais (`logToSupervisor`) causavam race condition — apenas 3-4 logs de 100+ chegavam ao servidor.

**Tentativas que falharam:**
- ❌ Chamar `logToSupervisor()` para cada linha → race condition (100 requests HTTP simultâneos)
- ❌ `execSync` com curl inline → travava thread principal do Electron
- ❌ `Promise.all()` com múltiplos requests → ainda tinha race
- ❌ Buffer + `setTimeout` delay → não confiável

**Solução definitiva:**
```javascript
const allLogs = [];
const sendLine = (line) => {
  if (mainWindow) mainWindow.webContents.send('backup-log', line);
  allLogs.push(`[BACKUP] ${line}`);
};

const flushAllLogs = () => {
  const logEntries = allLogs.map(msg => ({
    side: 'backend', module: 'electron', level: 'backup',
    message: msg, meta: { source: 'backup' }
  }));
  // 1 único HTTP request com array JSON
  http.request(options).write(JSON.stringify(logEntries)).end();
};
```

- Buffer coleta todos os logs durante a análise
- `flushAllLogs()` envia array de 100+ log entries em **1 único request HTTP**
- Servidor `/ingest` já aceita arrays nativamente
- Zero race condition — todos os logs chegam de uma vez

**Arquivos modificados:**
```
gerenciamento_sessao/supervisor-app/electron/main.js
  — ipcMain.handle('backup:run') com análise detalhada via execSync
  — flushAllLogs() envia array de logs em 1 request
  — restartBackend() força limpeza de orphan processes

gerenciamento_sessao/supervisor-app/electron/preload.js
  — backup.run() com Promise simplificada

gerenciamento_sessao/supervisor-app/public/app.js
  — Botão backup com timeout de segurança (3min)
  — finally() garante reabilitação do botão

gerenciamento_sessao/supervisor-app/public/index.html
  — Filtro "backup" adicionado nos dropdowns de nível

gerenciamento_sessao/supervisor-app/public/styles.css
  — Cor roxa (--c-backup: #a78bfa) + negrito para .lvl-backup

gerenciamento_sessao/supervisor-app/server.js
  — Nível "backup" adicionado na lista de níveis aceitos

versao_local/.env
  — Criado com PORT=3000 + credenciais do banco
```

**Bancos de dados no backup:**
- `histórico_alphahall` — 75 tabelas
- `pixelbox_portal` — 21 tabelas
- **Total:** 96 tabelas, ~milhões de linhas, ~610 MB

**Validação:**
1. ✅ Botão "Backup do Servidor" executa mysqldump completo
2. ✅ Arquivo salvo em `F:\backup_server\` com timestamp legível
3. ✅ Política de retenção mantém apenas 3 backups (deleta antigos)
4. ✅ Logs detalhados aparecem na aba LOGS filtrados por "backup" (roxo)
5. ✅ Logs incluem: bancos, tabelas com linhas/tamanho, triggers, procedures, eventos
6. ✅ Botão volta ao normal após backup (não trava mais)
7. ✅ Botão "Reiniciar Backend" limpa processos orphan corretamente
8. ✅ Backend conecta no MariaDB sem erros de autenticação
9. ✅ Thumbs e arquivos aparecem corretamente no admin e portal clientes (fix amend 1)

#### Amend 1 — Correção: .env Completo (commit `79db78c`)

**Problema:** Após o checkpoint, thumbs e arquivos pararam de aparecer no admin e portal clientes.

**Causa:** Arquivo `.env` na raiz estava incompleto, faltando variáveis críticas:
- `SERVER_FILES_PATH` — localização dos arquivos do servidor
- `THUMBS_PATH` — localização das thumbnails
- `PORTFOLIO_PATH` — localização do portfólio
- `FRONTEND_URL`, `CLIENTES_URL`, `PORTFOLIO_URL` — CORS
- `IGNORED_FOLDERS` — pastas a ignorar na listagem

**Solução:** `.env` completo copiado de `scripts_permanentes/.env` para a raiz. Backend reiniciado com configuração correta.

---

**FIM DA DOCUMENTAÇÃO**
