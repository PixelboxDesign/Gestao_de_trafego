# PixelBox Portal

Sistema completo de gerenciamento de portfólio, projetos e clientes com integração WhatsApp e streaming otimizado.

---

## 🔒 CHECKPOINTS PERMANENTES

> **Última versão estável:** [v4.7.0 — Sistema de Alterações Automáticas + Identidade Visual de Status](./CHECKPOINTS.md#checkpoint-v470) (commit `eee1709`)
>
> Todos os checkpoints e marcos de estabilidade estão documentados em **[CHECKPOINTS.md](./CHECKPOINTS.md)**.

---

## 🚀 Iniciar Desenvolvimento

**Clique no atalho "PixelBox Supervisor" na área de trabalho**

Ou execute:
```bash
F:\PixelBox\versao_local\INICIAR_SUPERVISOR_SEM_TERMINAL.vbs
```

## 🌐 URLs do Sistema

| Módulo | Desenvolvimento | Produção |
|---|---|---|
| **Admin** | http://localhost:5173 | https://admin-piv6.onrender.com |
| **Clientes** | http://localhost:5174 | https://clientes-5sjd.onrender.com |
| **Portfolio** | http://localhost:5175 | https://portifolio-e1g9.onrender.com |
| **Backend API** | http://localhost:3000 | https://desktop-e6jr4dk.tailc1230a.ts.net |
| **Supervisor** | http://localhost:4500 | https://desktop-e6jr4dk.tailc1230a.ts.net/logs |

## 📁 Estrutura do Projeto

```
versao_local/
├── backend/                    # API REST (Express + TypeScript)
│   └── src/
│       ├── controllers/        # Lógica de negócio
│       ├── routes/             # Definição de rotas
│       ├── middleware/         # Auth, erros, upload
│       ├── config/             # DB, migrations, seed
│       ├── services/           # WhatsAppService
│       └── utils/              # Logger, telemetria, thumbs
├── frontend/                   # Admin (React + Vite + TypeScript)
│   └── src/
│       ├── pages/admin/        # Páginas do painel admin
│       ├── components/ui/      # Componentes reutilizáveis
│       └── api/                # Cliente API (axios)
├── apps/
│   ├── clientes/               # Portal do Cliente (React)
│   ├── portfolio/              # Portfolio Público (React)
│   └── supervisor/             # Electron app (gerenciamento)
├── documentacao/               # Documentação do sistema
│   ├── README.md               # Visão geral e features
│   ├── ARQUITETURA_SISTEMA.md  # Documentação técnica completa
│   └── CHECKPOINTS.md         # Histórico de versões estáveis
└── shared/                     # Código compartilhado entre apps
```

## ✨ Funcionalidades Principais

### 📊 Admin
- Dashboard com KPIs e gráficos financeiros
- Gestão completa de clientes (CRUD + múltiplos logins)
- Gestão de projetos (11 status + aprovações + valor por alteração)
- Sistema de thumbs inteligente (Windows Shell API)
- Telemetria e analytics de uso + consumo de banda
- Integração WhatsApp para notificações (arquivos de qualquer tamanho)
- Links compartilhados com expiração
- Supervisão e manutenção do sistema
- **Performance Monitor** — métricas de throughput e I/O

### 👥 Portal do Cliente
- Visualização de projetos com Valor / Alterações / Total
- **Download otimizado** via Range Requests HTTP 206
- Sistema de aprovação de modelos
- Histórico de versões
- Notificações e badges financeiros
- Clube de Parceiros
- **Barra de progresso precisa** com animação achalote

### 🎨 Portfolio Público
- Navegação por categorias
- Lightbox com zoom e navegação
- Vídeos otimizados (H.264 CRF23)
- Telemetria de visualizações
- **Streaming resiliente** via Tailscale Funnel

## 🔐 Sistema de Múltiplos Logins

Cada cliente pode ter múltiplos usuários com telefones diferentes:
- **Login Principal**: armazenado na tabela `users`
- **Logins Adicionais**: armazenado na tabela `client_logins`
- **WhatsApp**: modal de seleção quando cliente tem 2+ logins
- **Compartilhamento**: todos os logins veem os mesmos projetos

## 📱 Integração WhatsApp

- Notificações automáticas de aprovações
- Envio de arquivos de qualquer tamanho (testado 202MB)
- Suporte a múltiplos destinatários
- Sessão persistente (LocalAuth)
- QR Code visual no painel admin
- Logs estruturados de envios
- Throttle anti-spam (2-5s entre envios)

## 🗄️ Banco de Dados

**MariaDB** local (localhost:3306)
- Database: `pixelbox_portal`
- 23+ tabelas principais
- Migrations automáticas no startup
- Seed de dados em produção

## 📦 Deploy

### Frontends (Render.com)
```bash
git push origin main
# Deploy automático em ~5 minutos
```

### Backend (Local)
```bash
cd backend
npm run dev  # Desenvolvimento com hot-reload
npm run build && npm start  # Produção
```

## 🛠️ Scripts Úteis

| Script | Descrição |
|---|---|
| `INICIAR_SUPERVISOR_SEM_TERMINAL.vbs` | Inicia todo o sistema |
| `capturar-thumbs-clientes-v2.ps1` | Gera thumbs de clientes em massa |
| `extrair-thumb-windows.ps1` | Extrai thumb individual (Windows Shell API) |

## 📚 Documentação Completa

**Leia antes de fazer alterações:**
- **[ARQUITETURA_SISTEMA.md](./ARQUITETURA_SISTEMA.md)** — Documentação técnica completa
- **[CHECKPOINTS.md](./CHECKPOINTS.md)** — Histórico de versões estáveis

## 🔧 Tecnologias

### Backend
- Node.js 20 + TypeScript 5.3
- Express 4.18
- MariaDB via mysql2
- JWT (access + refresh tokens)
- WhatsApp Web.js + Puppeteer
- FFmpeg (otimização de vídeos)
- Sharp (processamento de imagens)
- Winston (logs estruturados)

### Frontend
- React 18 + TypeScript
- Vite 5 (build tool)
- TanStack Query (React Query)
- Tailwind CSS 3.4
- Framer Motion (animações)
- Zustand (estado global)

## 🚨 Troubleshooting

### Download travado em 0%
**Causa:** Tailscale Funnel bufferizando arquivo completo
**Solução:** Implementado Range Requests HTTP 206 — já resolvido na v4.0.0

### WhatsApp não conecta
1. Deletar pasta `.wwebjs_auth/`
2. Reiniciar backend
3. Escanear QR Code em Admin → Supervisão → WhatsApp

### Thumbs não aparecem
1. Ctrl+Shift+R (hard reload no browser)
2. Verificar permissões na pasta `F:\PixelBox\`
3. Executar "Gerar Thumbnails" no painel de manutenção

### Deploy falha no Render
1. Verificar logs em https://dashboard.render.com
2. Checar erros de TypeScript no build
3. Validar variáveis de ambiente (`VITE_API_URL`)

### Performance baixa em downloads
1. Verificar logs do Performance Monitor no backend
2. Throughput < 1MB/s → possível gargalo de rede/disco
3. Latência I/O > 200ms → disco lento (verificar `F:\` disponível)

## 📞 Suporte

Em caso de dúvidas, consulte:
1. **ARQUITETURA_SISTEMA.md** — documentação técnica completa
2. **CHECKPOINTS.md** — histórico de versões e rollback
3. Logs do sistema em `F:\PixelBox\arquivos_server\logs\`
4. Console do supervisor (http://localhost:4500)

---

**Última Atualização:** 27/07/2026  
**Versão:** 4.5.0 — Checkpoint Permanente

**Domínios em produção:**
- Admin: https://admin-piv6.onrender.com
- Clientes: https://clientes-5sjd.onrender.com
- Portfolio: https://portifolio-e1g9.onrender.com
- Backend: https://desktop-e6jr4dk.tailc1230a.ts.net
