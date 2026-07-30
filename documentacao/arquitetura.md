# Arquitetura do Sistema — Luna Cosméticos
**Versão:** 1.0.0  
**Última atualização:** 2026-07  
**Status:** 🔧 Em modelagem

---

## 1. VISÃO GERAL

O sistema é composto por três camadas independentes que se comunicam via API HTTP:

```
┌─────────────────────────────────────────────────────────────────┐
│                        REDE / INTERNET                          │
│            (Tailscale Serve — privado, porta 3001)              │
└──────────────┬──────────────────────────────┬───────────────────┘
               │                              │
   ┌───────────▼──────────┐      ┌────────────▼────────────┐
   │   TAURI CLIENT       │      │   FRONTEND WEB          │
   │  (app instalável)    │      │  (browser, qualquer PC) │
   │  notebook da loja    │      │  consome a mesma API    │
   └───────────┬──────────┘      └────────────┬────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │ HTTP/REST
               ┌──────────────▼───────────────┐
               │       TAURI SERVER           │
               │  (roda 24/7 no PC de casa)   │
               │  porta 3001 — Rust backend   │
               │  ├─ API REST                 │
               │  ├─ MariaDB local            │
               │  ├─ Arquivos locais          │
               │  └─ System tray (sem janela) │
               └──────────────────────────────┘
```

---

## 2. COMPONENTES

### 2.1 Tauri Server (PC de casa — servidor central)

| Item | Detalhe |
|---|---|
| **Tecnologia** | Tauri 2.x + Rust backend |
| **Porta** | 3001 (separada do PixelBox que usa 3000) |
| **Banco** | MariaDB local — `histórico_alphahall` |
| **Exposição** | Tailscale Serve (privado, só dispositivos autorizados) |
| **Interface** | System tray — sem janela, sem terminal |
| **Inicialização** | Serviço Windows — inicia automático com o PC |
| **Frontend interno** | Painel de administração embutido (WebView local) |

**Responsabilidades:**
- Expor todas as rotas de API REST na porta 3001
- Conectar e gerenciar o MariaDB local
- Servir arquivos do sistema de arquivos local
- Gerenciar autenticação dos clientes
- Executar tarefas nativas do Windows (acesso a pastas, arquivos, processos)
- Manter-se vivo 24/7 como serviço

**Por que Tauri aqui?**  
Justifica-se pelo acesso a funcionalidades nativas do Windows necessárias ao backend: leitura de arquivos locais, acesso ao sistema de arquivos, execução de processos nativos, integração com a bandeja do sistema. Um Node.js puro não teria acesso seguro e nativo a essas funcionalidades.

---

### 2.2 Tauri Client (notebook da loja — app instalável)

| Item | Detalhe |
|---|---|
| **Tecnologia** | Tauri 2.x + React/TypeScript frontend |
| **Distribuição** | Instalador `.exe` (Windows) |
| **Conectividade** | Consome API do Tauri Server via Tailscale URL fixa |
| **Autenticação** | Token JWT emitido pelo Tauri Server |
| **Modo offline** | Cache local para dados essenciais (a definir) |

**Responsabilidades:**
- Interface principal do usuário na loja
- Consumir todos os dados via API REST do Tauri Server
- Funcionalidades a definir (disparos, clientes, pedidos, etc.)

---

### 2.3 Frontend Web (camada de browser)

| Item | Detalhe |
|---|---|
| **Tecnologia** | React + Vite (SPA) |
| **Hospedagem** | Pasta `frontend/` — a definir (estático ou embutido no Server) |
| **Conectividade** | Mesma API do Tauri Server |
| **Acesso** | Via browser em qualquer dispositivo na rede Tailscale |

**Responsabilidades:**
- Interface alternativa via browser
- Mesmas funcionalidades do Tauri Client
- Útil para acesso eventual sem instalar o app

---

## 3. COMUNICAÇÃO E REDE

### 3.1 Tailscale Serve (tunnel privado)

```
Tailscale Funnel (público — PixelBox)  →  porta 3000  [NÃO ALTERAR]
Tailscale Serve  (privado — Luna)      →  porta 3001  [NOVO]
```

- O **Funnel** é público (internet aberta) — usado pelo PixelBox
- O **Serve** é privado (só dispositivos com Tailscale logado na mesma conta)
- Os dois coexistem sem conflito na mesma máquina

**Configuração (uma vez, no PC de casa):**
```bash
tailscale serve --tcp 3001 tcp://localhost:3001
```

### 3.2 URL de acesso

- Tauri Client conecta em: `http://100.x.x.x:3001` (IP Tailscale do PC de casa)
- O IP Tailscale nunca muda enquanto a conta for a mesma

---

## 4. BANCO DE DADOS

| Item | Detalhe |
|---|---|
| **Motor** | MariaDB (local, localhost:3306) |
| **Database** | `histórico_alphahall` |
| **Acesso** | Apenas pelo Tauri Server (nunca direto do cliente) |
| **Driver Rust** | `sqlx` com MySQL |
| **Telefones** | 12.608 únicos mapeados |

---

## 5. DEPENDÊNCIAS DE DESENVOLVIMENTO

### 5.1 Tauri Server e Tauri Client (ambos)

| Dependência | Versão | Propósito |
|---|---|---|
| **Rust** | ≥ 1.77.2 (stable via rustup) | Compilar o backend Tauri |
| **Node.js** | ≥ 20 LTS | Build do frontend web |
| **npm/pnpm** | Latest | Gerenciar pacotes JS |
| **WebView2** | Evergreen | Renderizar UI no Windows |
| **Tauri CLI** | 2.x (`cargo install tauri-cli`) | Comandos de build/dev |
| **VS Build Tools** | 2022 | Compilar dependências nativas Rust no Windows |

### 5.2 Dependências Rust (Cargo) — Tauri Server

| Crate | Propósito |
|---|---|
| `tauri` 2.x | Framework principal |
| `tauri-plugin-localhost` | Expor servidor HTTP interno |
| `sqlx` (feature mysql) | Conexão com MariaDB |
| `axum` ou `actix-web` | Router HTTP para a API REST |
| `tokio` | Runtime assíncrono |
| `serde` / `serde_json` | Serialização JSON |
| `jsonwebtoken` | Autenticação JWT |
| `dotenv` | Variáveis de ambiente |

### 5.3 Dependências Rust (Cargo) — Tauri Client

| Crate | Propósito |
|---|---|
| `tauri` 2.x | Framework principal |
| `reqwest` | Chamadas HTTP para o Tauri Server |
| `serde` / `serde_json` | Serialização JSON |
| `tokio` | Runtime assíncrono |

### 5.4 Dependências JS/TS (frontend de ambos)

| Pacote | Propósito |
|---|---|
| `react` + `react-dom` 18 | UI |
| `typescript` | Tipagem |
| `vite` | Build e dev server |
| `@tauri-apps/api` 2.x | Bridge JS ↔ Rust |
| `@tauri-apps/plugin-http` | HTTP do cliente Tauri |
| `axios` ou `fetch` nativo | Chamadas REST |
| `react-router-dom` | Rotas SPA |

---

## 6. ESTRUTURA DE PASTAS

```
f:\luna_cosmeticos\
├── backend/                         → Tauri Server
│   ├── src-tauri/                   → Rust backend
│   │   ├── src/
│   │   │   ├── main.rs              → Entry point
│   │   │   ├── api/                 → Rotas HTTP (axum/actix)
│   │   │   │   ├── clientes.rs
│   │   │   │   ├── pedidos.rs
│   │   │   │   └── telefones.rs
│   │   │   ├── db/                  → Conexão MariaDB (sqlx)
│   │   │   └── auth.rs              → JWT
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   └── src/                         → Frontend admin embutido (React)
│
├── portal_luna_cosmeticos/          → Tauri Client
│   ├── src-tauri/                   → Rust client
│   │   ├── src/main.rs
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   └── src/                         → Frontend React (app da loja)
│
├── frontend/                        → Frontend Web (browser)
│   └── src/                         → React SPA (mesma API)
│
├── documentacao/
│   ├── readme.md
│   └── arquitetura.md               → Este arquivo
│
├── scripts_permanentes/             → Scripts git e automações
├── scripts_temporarios/             → Scripts em validação
└── lixeira/                         → Scripts de uso único descartados
```

---

## 7. FLUXO DE AUTENTICAÇÃO

```
Tauri Client / Frontend Web
        │
        ├── POST /auth/login {usuario, senha}
        │
        ▼
Tauri Server
        │
        ├── valida credenciais no MariaDB
        ├── gera JWT (exp: 8h)
        └── retorna {token}
        │
        ▼
Cliente armazena token
        │
        └── todas as requisições: Authorization: Bearer <token>
```

---

## 8. ROTAS DE API (planejadas)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Status do servidor |
| `POST` | `/auth/login` | Autenticação |
| `GET` | `/api/clientes` | Lista clientes com filtros |
| `GET` | `/api/clientes/:id/pedidos` | Pedidos de um cliente |
| `GET` | `/api/telefones` | Lista telefones únicos |
| `GET` | `/api/pedidos` | Lista pedidos |
| `GET` | `/api/pedidos/stats` | Estatísticas de pedidos |
| `GET` | `/api/arquivos` | Lista arquivos locais |
| `GET` | `/api/arquivos/:path` | Serve arquivo local |

---

## 9. CHECKPOINTS

> Checkpoints marcam estabilidade comprovada. **Nunca remover.**

*(Nenhum checkpoint ainda — sistema em construção)*

---

## 10. PRÓXIMOS PASSOS

1. ✅ Mapear arquitetura
2. ⬜ Instalar pré-requisitos (Rust, WebView2, VS Build Tools)
3. ⬜ Criar estrutura do Tauri Server (`backend/`)
4. ⬜ Implementar API REST básica (health + clientes)
5. ⬜ Conectar MariaDB via sqlx
6. ⬜ Criar estrutura do Tauri Client (`portal_luna_cosmeticos/`)
7. ⬜ Configurar Tailscale Serve porta 3001
8. ⬜ Empacotar Tauri Client como `.exe` instalável
9. ⬜ Definir funcionalidades do portal com o usuário
