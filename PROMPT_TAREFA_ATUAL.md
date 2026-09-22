# TAREFA ATUAL - EXCLUIR E DESABILITAR PRODUTOS/KITS

## CONTEXTO
Data: 15/05/2026
Usuário: Matheus Maia

## O QUE FOI PEDIDO

### PROBLEMA INICIAL
- A aba de produtos do disparo estava contabilizando 431 produtos
- Usuário apagou manualmente várias pastas que não eram produtos de fato
- Precisa normalizar para mostrar apenas o que existe fisicamente nas pastas

### FUNCIONALIDADES SOLICITADAS

#### 1. NORMALIZAÇÃO DE CONTAGEM
- Backend deve filtrar e mostrar apenas produtos/kits que têm pasta física existente
- Equalizar contagem do frontend com o que realmente existe no filesystem

#### 2. BOTÕES NO MODAL (DISPARO - NÃO CATÁLOGO)
**Localização**: No TOPO do modal quando clicar em um card de produto/kit na aba Produtos ou aba Kits do **DISPARO**

**Botão EXCLUIR**:
- Exclui o produto/kit completamente
- Deleta a pasta inteira e todo seu conteúdo do filesystem
- Rota: DELETE /api/catalogo/produto/:marca/:nome ou DELETE /api/catalogo/kit/:marca/:nome

**Botão DESABILITAR**:
- NÃO exclui nada
- Produto/kit continua com todas as informações
- Produto/kit continua aparecendo no painel de DISPARO
- Produto/kit NÃO aparece no frontend do CATÁLOGO (Luna Catálogo - outro webservice)
- Campo `visivel: false` no banco/info.json

#### 3. SEPARAR EM TASKS
Usuário pediu explicitamente para **dividir em tasks separadas** e **fazer uma por vez** para não se perder.

## ESTRUTURA DO SISTEMA

### Frontends
1. **Disparo** (painel admin): `backend/src/pages/` - Porta 5173 (dev)
   - `AbaProdutos.tsx` - gerencia produtos
   - `AbaKits.tsx` - gerencia kits
   
2. **Catálogo** (web público): `frontend/catalogo/src/` - Porta 5174 (dev)
   - É onde os produtos desabilitados NÃO devem aparecer

### Backend
- **API REST**: `backend/src-tauri/src/api/` - Porta 3001
  - `catalogo.rs` - rotas de manipulação de arquivos
  - `catalogo_db.rs` - rotas de consulta ao banco

### Estrutura de Pastas
- Produtos: `F:\luna_cosmeticos\catalogos\Alphahall\produtos\{nome}\`
- Kits: `F:\luna_cosmeticos\catalogos\Alphahall\kits\{nome}\`
- Cada pasta contém `info.json` com metadados

## TASKS DEFINIDAS

### ✅ Task #1: Normalizar contagem backend
- Filtrar em `catalogo_db.rs` nas funções `listar_produtos_individuais_db()` e `listar_kits_db()`
- Adicionar `if !pasta_produto.exists() || !pasta_produto.is_dir() { continue; }`
- **STATUS**: CONCLUÍDO

### ✅ Task #2: Botão Excluir no modal de produto (AbaProdutos.tsx)
- Adicionar botão "🗑️ Excluir Produto" no TOPO/FOOTER do modal
- Cor vermelha, confirmar antes de executar
- Fazer DELETE para `/api/catalogo/produto/:marca/:nome`
- **STATUS**: CONCLUÍDO

### ✅ Task #3: Botão Desabilitar no modal de produto (AbaProdutos.tsx)
- Adicionar botão "👁️‍🗨️ Desabilitar" no TOPO/FOOTER do modal
- Cor amarela
- Fazer PUT para `/api/catalogo/v2/produto/:marca/:nome` com `{visivel: false}`
- **STATUS**: CONCLUÍDO

### ✅ Task #4: Botão Excluir no modal de kit (AbaKits.tsx)
- Adicionar botão "🗑️ Excluir Kit" no TOPO/FOOTER do modal
- Cor vermelha, confirmar antes de executar
- Fazer DELETE para `/api/catalogo/kit/:marca/:nome`
- **STATUS**: CONCLUÍDO

### ✅ Task #5: Botão Desabilitar no modal de kit (AbaKits.tsx)
- Adicionar botão "👁️‍🗨️ Desabilitar" no TOPO/FOOTER do modal
- Cor amarela
- Fazer PUT para `/api/catalogo/v2/kit/:marca/:nome` com `{visivel: false}`
- **STATUS**: CONCLUÍDO

### ✅ Task #6: Backend - função deletar_produto (catalogo.rs)
- Criar função `deletar_produto()` que recebe `:marca` e `:nome`
- Usar `fs::remove_dir_all()` para deletar pasta recursivamente
- Path: `catalogos/{marca}/produtos/{nome}/`
- **STATUS**: CONCLUÍDO

### ✅ Task #7: Backend - função deletar_kit (catalogo.rs)
- Criar função `deletar_kit()` que recebe `:marca` e `:nome`
- Usar `fs::remove_dir_all()` para deletar pasta recursivamente
- Path: `catalogos/{marca}/kits/{nome}/`
- **STATUS**: CONCLUÍDO

### ✅ Task #8: Registrar rotas DELETE (mod.rs)
- Registrar `.route("/api/catalogo/produto/:marca/:nome", axum::routing::delete(catalogo::deletar_produto))`
- Registrar `.route("/api/catalogo/kit/:marca/:nome", axum::routing::delete(catalogo::deletar_kit))`
- **STATUS**: CONCLUÍDO

### ✅ Task #9: Backend - adicionar campo visivel na resposta
- Modificar structs `ProdutoResponse` e `KitResponse` em `catalogo_db.rs`
- Adicionar campo `visivel: bool` (default `true`)
- Ler de `info.json` ou do banco de dados
- **STATUS**: CONCLUÍDO

### ✅ Task #10: Frontend Catálogo - filtrar visivel=false
- No Luna Catálogo (`frontend/catalogo/src/`), filtrar produtos/kits
- Aplicar `.filter(p => p.visivel !== false)` antes de renderizar
- **STATUS**: CONCLUÍDO

### ✅ Task #11: Compilar e testar backend
- `cd backend/src-tauri && cargo build`
- Fix: Adicionar campo `visivel: true` ao criar KitInfo em `salvar_info()`
- Backend compilado com sucesso
- **STATUS**: CONCLUÍDO

### ⏳ Task #12: Commit e push final
- Fazer commit das alterações
- Push para repositório
- Validação end-to-end
- **STATUS**: PENDENTE

## ATENÇÃO - ERROS COMUNS A EVITAR

### ❌ PORTA 3000 ESTÁ OCUPADA
- A porta 3000 NO COMPUTADOR DO USUÁRIO está ocupada com OUTRO PROJETO (PixelBox)
- **NUNCA** usar porta 3000 para o projeto Luna Cosméticos
- **Portas corretas**:
  - Backend API: **3001**
  - Disparo (dev): **5173**
  - Catálogo (dev): **5174**
- Documentado em `documentacao/ARQUITETURA_SISTEMA.md`

### ❌ CONFUNDIR DISPARO COM CATÁLOGO
- **Disparo** = Painel admin interno (backend/src/pages/)
- **Catálogo** = Site público web (frontend/catalogo/src/)
- Botões excluir/desabilitar vão no DISPARO
- Filtro de visibilidade aplica no CATÁLOGO

### ❌ ESQUECER DO SUMMARY
- Quando atingir limite de contexto, criar novo summary atualizado
- Incluir status de cada task
- Manter este arquivo como referência permanente

## PRÓXIMOS PASSOS
1. ✅ Task #1-11 CONCLUÍDAS
2. Task #12: Push para repositório e testar end-to-end
3. Testes manuais:
   - Abrir painel de disparo (porta 5173)
   - Clicar em um produto/kit e testar botão "Excluir" → verificar pasta deletada
   - Clicar em um produto/kit e testar botão "Desabilitar" → verificar que continua no disparo mas não aparece no catálogo web (porta 5174)

---
**IMPORTANTE**: Este arquivo deve ser consultado SEMPRE que houver dúvida sobre o que foi pedido ou qual o próximo passo.

## COMMITS REALIZADOS
- `06d6a7d` - feat: normalizar contagem - apenas produtos/kits com pasta existente
- `9266885` - feat: adicionar botão excluir no modal de produto (task #2)
- `2c54f57` - feat: adicionar botão desabilitar no modal de produto (task #3)
- `4783b87` - feat: adicionar botões excluir e desabilitar no modal de kit (tasks #4 e #5)
- `a755064` - feat: adicionar campo visivel e filtrar produtos/kits ocultos no catálogo (tasks #8-#10)
- `c9b01ce` - fix: adicionar campo visivel ao salvar KitInfo
