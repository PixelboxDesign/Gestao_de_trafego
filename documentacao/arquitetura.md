# Arquitetura do Sistema — Luna Cosméticos

**Última atualização:** Em definição
**Status:** 🔧 Em construção

---

## Visão Geral

Sistema híbrido com backend local e app cliente instalável.

```
PC SERVIDOR (casa)                    NOTEBOOK (loja)
──────────────────                    ───────────────
MariaDB local          ◄────────►    portal_luna_cosmeticos
Arquivos locais        Tailscale      (app Electron instalado)
backend/ Node :3001    Serve/Tunnel   conecta via URL fixa
```

---

## Componentes

### 1. Backend (`backend/`)
- **Runtime:** Node.js
- **Porta:** 3001 (separado do PixelBox que usa 3000)
- **Banco:** MariaDB local — `histórico_alphahall`
- **Exposição:** Tailscale Serve (privado, só dispositivos autorizados)
- **Inicialização:** Serviço Windows, inicia automático com o PC
- **Responsabilidades:**
  - API REST para o banco de dados
  - Servir arquivos locais
  - Autenticação das requisições do portal

### 2. Portal Luna Cosméticos (`portal_luna_cosmeticos/`)
- **Tecnologia:** Electron + React
- **Distribuição:** instalador `.exe` para o notebook
- **Conectividade:** acessa o backend via URL Tailscale fixa
- **Funcionalidades:** A definir

### 3. Frontend (`frontend/`)
- Reservado para arquitetura futura
- Atualmente vazio

---

## Banco de Dados

- **Motor:** MariaDB / MySQL
- **Database:** `histórico_alphahall` (localhost)
- **Acesso remoto:** via backend na porta 3001

---

## Regras de Organização

| Pasta | Regra |
|---|---|
| `backend/` | Código de produção do servidor |
| `documentacao/` | Documentação sempre atualizada |
| `lixeira/` | Scripts criados na raiz → executados → movidos aqui |
| `portal_luna_cosmeticos/` | Código do app cliente |
| `scripts_permanentes/` | Scripts fixos, não alterar sem motivo |
| `scripts_temporarios/` | Todo script novo nasce aqui |

---

## Checkpoints

> Checkpoints marcam momentos de estabilidade. Nunca remover.

*(Nenhum checkpoint registrado ainda — sistema em construção)*

---

## Próximos Passos

1. Definir funcionalidades do portal
2. Criar estrutura do backend
3. Criar estrutura do portal Electron
4. Configurar Tailscale Serve porta 3001
5. Empacotar portal como instalador .exe
