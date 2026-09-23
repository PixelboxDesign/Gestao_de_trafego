# PROMPT TAREFA ATUAL — LEIA ISTO ANTES DE QUALQUER COISA

## ORDEM DE LEITURA OBRIGATÓRIA PARA O PRÓXIMO CHAT

Antes de fazer qualquer coisa, leia os arquivos nesta ordem:

1. `documentacao/readme.md` — visão geral do sistema
2. `documentacao/ARQUITETURA_SISTEMA.md` — portas, estrutura, deploy
3. `documentacao/CHECKPOINTS.md` — histórico de versões (v22 a v24 são os mais recentes)
4. `frontend/disparo/public/index.html` — painel admin (HTML estático)
5. `backend/src-tauri/src/api/catalogo_db.rs` — rotas v2 do backend
6. `backend/src-tauri/src/api/catalogo.rs` — rotas v1 do backend
7. `backend/src-tauri/src/api/mod.rs` — registro de rotas
8. Este arquivo por último — `PROMPT_TAREFA_ATUAL.md`

---

## O QUE É ESTE PROJETO

Sistema Luna Cosméticos — painel administrativo + catálogo web.

### Componentes principais:
- **Painel Disparo** (admin): `frontend/disparo/public/index.html` — HTML estático servido por `frontend/disparo/server.js` — hospedado no Render em https://luna-disparo.onrender.com
- **Backend API**: `backend/src-tauri/src/` — Rust/Axum, roda localmente na máquina, exposto via Cloudflare Tunnel
- **Catálogo web**: `frontend/catalogo/src/` — site público React

### ⚠️ ATENÇÃO CRÍTICA: O painel NÃO é React buildado
O painel admin é um único arquivo HTML estático (`frontend/disparo/public/index.html`).
Os arquivos em `backend/src/pages/*.tsx` (AbaProdutos.tsx, AbaKits.tsx etc.) NÃO são usados em produção.
Para alterar o painel, edite APENAS `frontend/disparo/public/index.html`.

### Portas CORRETAS (NUNCA usar 3000 — está ocupada com outro projeto):
- Backend API: **3001** (ou 3002 se 3001 ocupada)
- Disparo dev: **5173** (Vite, não usado em prod)
- Catálogo dev: **5174**

### Deploy:
- Render usa `frontend/disparo/` com `buildCommand: npm install` e `startCommand: node server.js`
- O server.js serve arquivos de `frontend/disparo/public/`
- Para deployar: commitar `index.html` e fazer push → Render detecta e redeploya
- Dashboard Render: https://dashboard.render.com/web/srv-d9roha7avr4c739pjlu0

---

## ESTADO ATUAL DO SISTEMA (v24)

### Funcionalidades implementadas e funcionando:

#### Aba Kits (`frontend/disparo/public/index.html`)
- ✅ Grid de kits com thumbnail, preço, componentes
- ✅ Filtros: visibilidade (Todos/Habilitados/Desabilitados) + thumbnail (Todos/Com/Sem)
- ✅ Botão "➕ Novo Kit" → modal de criação com seleção de produtos
- ✅ Modal de edição: nome editável (renomeia pasta + banco), preço, SKU, descrição
- ✅ Modal de edição: seção de componentes com adicionar/remover/alterar quantidade (salva automaticamente)
- ✅ Botão "👁️‍🗨️ Desabilitar/Habilitar" — alterna visível no catálogo web
- ✅ Botão "🗑️ Excluir Kit" — deleta pasta inteira + remove do banco
- ✅ Card amarelo para kits desabilitados

#### Aba Produtos
- ✅ Grid de produtos com thumbnail, preço, descrição
- ✅ Filtros: visibilidade + thumbnail
- ✅ Botão "➕ Novo Produto" → modal de criação → abre modal de edição completo
- ✅ Modal de edição: nome editável (renomeia pasta + banco), SKU, preço, peso, descrição, composição
- ✅ Upload de thumbnail e carrossel de imagens
- ✅ Botão "👁️‍🗨️ Desabilitar/Habilitar"
- ✅ Botão "🗑️ Excluir Produto"
- ✅ Card amarelo para produtos desabilitados

### Backend (roda localmente em localhost:3001):
- ✅ `GET /api/catalogo/v2/kits` — lista kits (filtra pastas inexistentes)
- ✅ `GET /api/catalogo/v2/produtos-individuais` — lista produtos
- ✅ `PUT /api/catalogo/v2/kit/:marca/:nome` — atualiza kit (nome, preço, SKU, visivel, renomeia pasta)
- ✅ `PUT /api/catalogo/v2/produto/:marca/:nome` — atualiza produto (idem)
- ✅ `PUT /api/catalogo/v2/kit/:marca/:nome/componentes` — atualiza componentes
- ✅ `POST /api/catalogo/criar-kit` — cria pasta + insere no banco
- ✅ `POST /api/catalogo/criar-produto` — cria pasta + insere no banco
- ✅ `DELETE /api/catalogo/kit/:marca/:nome` — deleta pasta inteira
- ✅ `DELETE /api/catalogo/produto/:marca/:nome` — deleta pasta inteira
- ✅ `POST /api/catalogo/upload-thumb/:marca/:kit?tipo=kit|produto` — upload de thumbnail

---

## TAREFAS PENDENTES

Nenhuma tarefa pendente definida no momento.
Aguardando novas instruções do usuário.

---

## ALERTAS CRÍTICOS:

### ❌ NÃO commitar a pasta dist/ do backend
O Render builda do código-fonte. dist/ é ignorada.

### ❌ NÃO usar porta 3000
Porta 3000 está ocupada com outro projeto (PixelBox).

### ❌ NÃO editar AbaProdutos.tsx ou AbaKits.tsx para o painel
O painel é o index.html estático. Os .tsx são código morto em produção.

### ❌ NÃO fazer múltiplas mudanças ao mesmo tempo
Uma coisa de cada vez. Confirmar que funcionou antes de avançar.

### ✅ Backend requer recompilação para mudanças em Rust
```bash
cd f:\luna_cosmeticos\backend\src-tauri
cargo build --release
# Matar processo antigo (verificar PID com netstat -ano | findstr :3001)
# Iniciar novo: .\target\release\luna-server.exe
```

---

## COMMITS RECENTES:
- `8269c7f` — feat: criar produto/kit + selecionar/remover componentes do kit (v24)
- `6a8dad5` — docs: checkpoint v23
- `0fba0bb` — feat: renomear nome e pasta ao salvar kit ou produto (v23)
- `244cdeb` — feat: filtros de visibilidade e thumbnail (v22+)
- `2326423` — feat: toggle Habilitar/Desabilitar + card visual amarelo (v22)
