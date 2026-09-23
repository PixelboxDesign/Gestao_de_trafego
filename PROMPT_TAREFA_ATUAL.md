# PROMPT TAREFA ATUAL — LEIA ISTO ANTES DE QUALQUER COISA

## ORDEM DE LEITURA OBRIGATÓRIA PARA O PRÓXIMO CHAT

Antes de fazer qualquer coisa, leia os arquivos nesta ordem:

1. `documentacao/readme.md` — visão geral do sistema
2. `documentacao/ARQUITETURA_SISTEMA.md` — portas, estrutura, deploy
3. `documentacao/CHECKPOINTS.md` — histórico de versões
4. `backend/src/pages/AbaProdutos.tsx` — componente que tem o problema atual
5. `backend/src/pages/AbaKits.tsx` — componente de kits (referência de como funciona)
6. `backend/src-tauri/src/api/catalogo.rs` — rotas do backend (excluir/desabilitar)
7. `backend/src-tauri/src/api/catalogo_db.rs` — listagem de produtos/kits
8. `backend/src-tauri/src/api/mod.rs` — registro de rotas
9. Este arquivo por último — `PROMPT_TAREFA_ATUAL.md`

---

## O QUE É ESTE PROJETO

Sistema Luna Cosméticos — painel administrativo + catálogo web.

### Componentes principais:
- **Disparo** (painel admin): `backend/src/pages/` — hospedado no Render em https://luna-disparo.onrender.com
- **Backend API**: `backend/src-tauri/src/` — roda localmente na máquina do usuário, exposto via Cloudflare Tunnel
- **Catálogo web**: `frontend/catalogo/src/` — site público de catálogo

### Portas CORRETAS (NUNCA usar 3000 — está ocupada com outro projeto):
- Backend API: **3001** (ou 3002 se 3001 ocupada)
- Disparo dev: **1420** (Vite)
- Catálogo dev: **5174**

### Deploy:
- O Render faz o **próprio build** a partir do código-fonte em `backend/src/`
- O Render usa `npm run build` no diretório `backend/`
- **NÃO** usar a pasta `dist/` commitada — o Render ignora e faz o build dele mesmo
- Para fazer deploy: commitar o código-fonte e fazer push. O Render detecta e builda automaticamente
- Dashboard Render: https://dashboard.render.com/web/srv-d9roha7avr4c739pjlu0

---

## TAREFA PENDENTE — BOTÕES EXCLUIR E DESABILITAR NO MODAL DE PRODUTO

### O que foi pedido:
No **painel de disparo** (`luna-disparo.onrender.com`), na **aba Produtos**, quando o usuário clica em um card de produto e abre o modal de edição, devem aparecer dois botões no **footer do modal**:

1. **Botão "Desabilitar"** (amarelo) — marca o produto com `visivel: false` no info.json. O produto continua aparecendo no painel de disparo mas **NÃO aparece no Luna Catálogo** (site público)
2. **Botão "Excluir Produto"** (vermelho) — deleta a pasta inteira do produto com `fs::remove_dir_all()` no backend

### Estado atual:
- O modal de produto abre normalmente
- Os botões **NÃO aparecem** no modal em produção (Render)
- O código dos botões **ESTÁ** no arquivo `backend/src/pages/AbaProdutos.tsx` no footer do modal
- O Render faz o build e deploya, mas os botões não aparecem

### DIAGNÓSTICO DO PROBLEMA:
O modal que aparece na screenshot tem "Cancelar" e "Salvar" — esses botões **não existem** no `AbaProdutos.tsx`. Isso indica que o modal que está sendo aberto **pode não ser** o do `AbaProdutos.tsx`. Precisa investigar qual componente está sendo renderizado quando o usuário clica em um produto na aba Produtos.

**Suspeita principal**: O `AbaCatalogo.tsx` tem sub-abas "Kits" e "Produtos". A sub-aba "Produtos" renderiza `<AbaProdutos />`. Mas talvez o usuário esteja clicando em outra aba ou o componente errado está sendo montado.

### O que precisa fazer:
1. **Investigar** por que o modal com "Cancelar" e "Salvar" está aparecendo ao invés do modal do `AbaProdutos.tsx`
2. **Confirmar** qual componente tem "Cancelar" e "Salvar" no footer
3. **Adicionar** os botões Desabilitar e Excluir no componente correto
4. **Commitar apenas o código-fonte** (não commitar dist/) e fazer push
5. O Render vai buildar automaticamente

### Rotas backend já implementadas:
- `DELETE /api/catalogo/produto/:marca/:nome` → `catalogo::deletar_produto()` em `backend/src-tauri/src/api/catalogo.rs`
- `DELETE /api/catalogo/kit/:marca/:nome` → `catalogo::deletar_kit()`
- `PUT /api/catalogo/v2/produto/:id` → aceita `{ visivel: false }` para desabilitar

---

## OUTRAS TASKS JÁ CONCLUÍDAS (não mexer):

- ✅ Normalização de contagem: backend filtra apenas produtos/kits com pasta física existente
- ✅ Campo `visivel` no backend (catalogo_db.rs)
- ✅ Filtro `visivel=false` no Luna Catálogo (frontend/catalogo/src/components/CatalogViewport.tsx)
- ✅ Rotas DELETE registradas em mod.rs
- ✅ Botões já implementados no AbaKits.tsx (funciona como referência)

---

## ALERTAS CRÍTICOS PARA NÃO ERRAR:

### ❌ NÃO commitar a pasta dist/
O Render faz o próprio build. Commitar dist/ não resolve nada e só confunde.

### ❌ NÃO usar porta 3000
Porta 3000 está ocupada com outro projeto (PixelBox). Sempre usar 3001 ou 3002.

### ❌ NÃO confundir Disparo com Catálogo
- **Disparo** = painel admin em `backend/src/pages/` → luna-disparo.onrender.com
- **Catálogo** = site público em `frontend/catalogo/src/` → outro serviço

### ❌ NÃO fazer múltiplas mudanças ao mesmo tempo
Fazer uma coisa de cada vez. Confirmar que funcionou antes de partir para a próxima.

---

## ESTRUTURA DE PASTAS IMPORTANTE:

```
f:\luna_cosmeticos\
├── backend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AbaProdutos.tsx   ← ARQUIVO COM O PROBLEMA
│   │   │   ├── AbaKits.tsx       ← REFERÊNCIA (já tem botões)
│   │   │   └── AbaCatalogo.tsx   ← monta AbaProdutos e AbaKits
│   │   └── App.tsx
│   ├── src-tauri/src/api/
│   │   ├── catalogo.rs           ← funções deletar_produto, deletar_kit
│   │   ├── catalogo_db.rs        ← listar produtos/kits
│   │   └── mod.rs                ← registro de rotas
│   └── dist/                     ← IGNORAR, Render builda do zero
├── frontend/
│   └── catalogo/src/             ← Luna Catálogo (site público)
├── documentacao/
│   ├── readme.md
│   ├── ARQUITETURA_SISTEMA.md
│   └── CHECKPOINTS.md
└── PROMPT_TAREFA_ATUAL.md        ← ESTE ARQUIVO
```

---

## COMMITS RELEVANTES:
- `06d6a7d` - normalizar contagem
- `9266885` - botão excluir produto (primeira tentativa)
- `2c54f57` - botão desabilitar produto
- `4783b87` - botões no modal de kit
- `a755064` - campo visivel + filtro catálogo
- `5bbfdc0` - último commit (reescrita do AbaProdutos)
