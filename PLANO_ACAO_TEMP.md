# PLANO DE AÇÃO - THUMBNAILS E COMPONENTES KITS

> **ARQUIVO TEMPORÁRIO - Será deletado após conclusão**

---

## 🎯 OBJETIVO PRINCIPAL

1. **Catálogo web** deve usar thumbnails/descrições definidas no painel
2. **Fix:** Componentes (produtos) do kit não aparecem no modal (painel + site)

---

## 📊 DIAGNÓSTICO ATUAL

### ✅ O QUE ESTÁ FUNCIONANDO (NÃO MEXER)
- Backend Rust servindo na porta 3001
- Interface Tauri carregando via HTTP
- API `/api/catalogo/v2/kits` retorna dados
- API `/api/catalogo/v2/produtos` retorna dados
- Thumbnails dos componentes aparecem nos cards do painel
- Scroll vertical no painel

### ❌ O QUE PRECISA CORRIGIR

#### PROBLEMA 1: Site não usa dados do painel
**Localização:** `frontend/catalogo/`

**Situação atual:**
- Site busca dados de `/api/catalogo/marcas`, `/api/catalogo/kits/:marca`, `/api/catalogo/produtos/:marca`
- Essas rotas retornam dados do **filesystem** (info.json)
- **Deveria** buscar de `/api/catalogo/v2/kits` e `/api/catalogo/v2/produtos-individuais` (banco de dados)

**O que fazer:**
1. Trocar endpoint no `frontend/catalogo/src/api/client.ts`
2. Atualizar interfaces TypeScript para match com response do v2
3. Ajustar renderização dos cards para usar novos campos

#### PROBLEMA 2: Modal do kit não mostra componentes
**Localização:** `backend/src/pages/AbaKits.tsx` + `frontend/catalogo/src/components/CatalogViewport.tsx`

**Situação atual (PAINEL):**
- Modal abre mas seção "PRODUTOS QUE COMPÕEM ESTE KIT" está vazia
- Console mostra: "⚠️ Nenhum componente cadastrado no banco de dados"
- **API retorna componentes**, mas UI não renderiza

**Situação atual (SITE):**
- Modal do kit não tem seção de componentes
- Falta implementar visualização

**O que fazer:**
1. **Painel:** Verificar por que `kitDetalhes.componentes` está vazio mesmo com dados da API
2. **Site:** Adicionar seção "Produtos inclusos" no modal

---

## 🔧 PLANO DE EXECUÇÃO

### FASE 1: Investigação (Não mexer em nada ainda)

**1.1. Verificar response atual da API v2**
```bash
curl http://localhost:3001/api/catalogo/v2/kits
```
- ✅ Conferir se `componentes[]` vem populado
- ✅ Anotar estrutura exata do JSON

**1.2. Verificar response atual da API v1 (que o site usa)**
```bash
curl http://localhost:3001/api/catalogo/kits/Alphahall
```
- ✅ Anotar estrutura para comparar

**1.3. Ler código atual do painel**
- ✅ `backend/src/pages/AbaKits.tsx` - função que carrega detalhes do kit
- ✅ Entender fluxo: click card → fetch API → setState → render modal

**1.4. Ler código atual do site**
- ✅ `frontend/catalogo/src/api/client.ts` - funções fetch
- ✅ `frontend/catalogo/src/components/CatalogViewport.tsx` - modal

---

### FASE 2: Fix Modal Componentes (Painel)

**Arquivos envolvidos:**
- `backend/src/pages/AbaKits.tsx`

**Checklist:**
1. [ ] Localizar função que busca detalhes do kit (quando clica "Editar")
2. [ ] Verificar se usa endpoint correto (`/api/catalogo/v2/kits` ou busca individual)
3. [ ] Adicionar `console.log` para debug da response
4. [ ] Verificar se `kitDetalhes.componentes` está sendo populado
5. [ ] Se não estiver, corrigir mapeamento do setState
6. [ ] Testar no painel: abrir modal e ver componentes

**Critério de sucesso:**
- ✅ Modal do kit no painel mostra lista de componentes
- ✅ Cada componente mostra: nome + quantidade + thumbnail

---

### FASE 3: Migrar Site para API v2

**Arquivos envolvidos:**
- `frontend/catalogo/src/api/client.ts`
- `frontend/catalogo/src/types/index.ts`
- `frontend/catalogo/src/components/ProductCard.tsx`
- `frontend/catalogo/src/components/CatalogViewport.tsx`

**3.1. Atualizar interfaces TypeScript**
```typescript
// ANTES (API v1 - filesystem)
interface Produto {
  nome: string;
  preco?: string;
  descricao?: string;
  imagens: string[];
}

// DEPOIS (API v2 - database)
interface Produto {
  id: number;
  nome: string;
  nome_limpo: string;
  descricao?: string;
  preco_sugerido?: number;
  sku?: string;
  tem_thumb: boolean;
  thumb_ext?: string;
  total_imagens: number;
}
```

**3.2. Atualizar funções fetch**
```typescript
// client.ts

// ANTES
export async function fetchKits(marca: string) {
  return await apiGet(`/api/catalogo/kits/${marca}`);
}

// DEPOIS
export async function fetchKits() {
  return await apiGet('/api/catalogo/v2/kits');
}
```

**3.3. Atualizar renderização dos cards**
- Trocar `imagens[0]` por construir URL: `/api/catalogo/imagem/${marca}/${nome_limpo}/thumb.${thumb_ext}?tipo=produto`
- Usar `descricao` do banco em vez de info.json
- Usar `preco_sugerido` formatado

**3.4. Implementar modal com componentes (site)**
```tsx
// Adicionar seção no modal:
{kit.componentes?.length > 0 && (
  <section>
    <h3>🎁 Produtos inclusos</h3>
    {kit.componentes.map(comp => (
      <div key={comp.nome_limpo}>
        <img src={thumbUrl} />
        <span>{comp.nome_produto} (x{comp.quantidade})</span>
      </div>
    ))}
  </section>
)}
```

**Checklist:**
1. [ ] Atualizar interfaces
2. [ ] Trocar endpoints
3. [ ] Ajustar renderização cards
4. [ ] Adicionar seção componentes no modal
5. [ ] Testar site localmente
6. [ ] Build produção
7. [ ] Testar build

---

### FASE 4: Build e Deploy

**4.1. Frontend site**
```bash
cd frontend/catalogo
npm run build
```

**4.2. Frontend painel**
```bash
cd backend
npm run build
```

**4.3. Backend Rust**
```bash
cd backend/src-tauri
cargo build --release
```

**4.4. Testar executável**
```bash
.\target\release\luna-server.exe
```

**Validação:**
1. [ ] Painel abre e carrega
2. [ ] Aba Kits → Modal mostra componentes
3. [ ] Site (localhost ou Render) mostra thumbnails corretas
4. [ ] Site → Modal kit mostra componentes

---

## 🗺️ MAPEAMENTO DE DADOS

### API v2 Response (Database)

**GET** `/api/catalogo/v2/kits`
```json
{
  "kits": [
    {
      "id": 1,
      "nome": "Kit Cronograma 3 fases",
      "nome_limpo": "kit-cronograma-3-fases",
      "descricao": "Kit completo para cronograma capilar",
      "preco_disparo": 108.70,
      "sku_kit": "KIT-CRONO-3F",
      "tem_thumb": true,
      "thumb_ext": "jpg",
      "total_imagens_carrossel": 3,
      "componentes": [
        {
          "nome_limpo": "acidificante",
          "nome_produto": "Acidificante 300ml",
          "quantidade": 1,
          "tem_thumb": true,
          "thumb_ext": "jpg"
        }
      ]
    }
  ]
}
```

**GET** `/api/catalogo/v2/produtos-individuais`
```json
{
  "produtos": [
    {
      "id": 5,
      "nome": "Shampoo Hidratante",
      "nome_limpo": "shampoo-hidratante",
      "descricao": "Limpeza suave com hidratação",
      "preco_sugerido": 35.90,
      "sku": "PROD-SH-001",
      "tem_thumb": true,
      "thumb_ext": "jpg",
      "total_imagens": 2
    }
  ]
}
```

### URL Pattern para Imagens

**Thumbnail:**
```
/api/catalogo/imagem/{marca}/{nome_limpo}/thumb.{ext}?tipo=produto
/api/catalogo/imagem/{marca}/{nome_limpo}/thumb.{ext}?tipo=kit
```

**Carrossel:**
```
/api/catalogo/imagem/{marca}/{nome_limpo}/img_1.jpg?tipo=kit
/api/catalogo/imagem/{marca}/{nome_limpo}/img_2.jpg?tipo=kit
```

---

## ⚠️ PONTOS DE ATENÇÃO

### 1. Não quebrar o que funciona
- **Painel aba Produtos** - está ok, não mexer
- **Sistema de upload** - está ok, não mexer
- **Backend Axum** - rotas funcionando, só adicionar lógica se necessário

### 2. Testar após cada mudança
- Fazer mudança pequena
- Testar
- Se quebrou, reverter
- Se funcionou, commit intermediário

### 3. Commits intermediários
```bash
git add .
git commit -m "wip: ajusta interfaces TypeScript API v2"
# Testar
git add .
git commit -m "wip: migra fetchKits para v2"
# Testar
```

### 4. Se algo der errado
```bash
# Reverter último commit
git reset --hard HEAD~1

# Ou voltar para checkpoint
git reset --hard bb64fd8
```

---

## 📝 LOG DE PROGRESSO

### ✅ Concluído
- [x] FASE 1: Investigação - API v2 componentes vazios
- [x] FASE 2: Fix backend - deserialize componentes (quantidade i32 → f64)
- [x] FASE 3: Fix frontend painel produtos - URL thumbnail corrigida
- [x] FASE 4: Migrar site para API v2 (banco de dados)
  - [x] Atualizar interfaces TypeScript (types.ts)
  - [x] Trocar endpoints para v2 (client.ts)
  - [x] Ajustar ProductCard para usar campos corretos
  - [x] Ajustar CatalogViewport para usar item.id
  - [x] Build do site concluído
- [x] FASE 5: Build backend Rust release
- [x] FASE 6: Servidor rodando e testado (API v2 funcionando)
- [ ] FASE 7: Testar no painel e site
- [ ] FASE 8: Checkpoint final

### 🐛 Problemas Encontrados

**PROBLEMA 1:** API `/api/catalogo/v2/kits` retorna `componentes: []` vazio
- **Causa:** Deserialize falhando - `quantidade` era `i32` no banco mas `f64` no Rust
- **Solução:** Struct `ComponenteFromDB` com `quantidade: i32`, depois converte para `f64`
- **Status:** ✅ RESOLVIDO

**PROBLEMA 2:** Upload thumbnail produto salva mas não aparece no card
- **Causa:** URL da imagem no card usava `/produtos/` hardcoded em vez de query param `?tipo=produto`
- **Solução:** Corrigido URLs em `AbaProdutos.tsx`:
  - Card: `${API}/api/catalogo/imagem/${MARCA}/${nome}/thumb.${ext}?tipo=produto&t=${Date.now()}`
  - Modal: mesma URL
- **Status:** ✅ RESOLVIDO

### 🎯 PRÓXIMOS PASSOS

1. ~~**Testar no painel:** Upload de thumbnail em produto e verificar se aparece no card~~
2. **AGORA:** Migrar site para usar API v2 (banco de dados) - **PROBLEMA IDENTIFICADO:**
   - Site usa `/api/catalogo/produtos/:marca` (lê filesystem)
   - Painel salva no banco via API v2
   - **Thumbnails não aparecem porque site não lê do banco!**
3. **Build final e commit**

---

## 🔗 REFERÊNCIAS RÁPIDAS

**Arquivos críticos:**
- `backend/src-tauri/src/api/catalogo_db.rs` - Endpoints v2
- `backend/src-tauri/src/api/catalogo.rs` - Endpoints v1 (filesystem)
- `backend/src/pages/AbaKits.tsx` - Painel kits
- `frontend/catalogo/src/api/client.ts` - Fetch functions
- `frontend/catalogo/src/components/CatalogViewport.tsx` - Modal

**Endpoints importantes:**
- `/api/catalogo/v2/kits` - Lista kits (DB)
- `/api/catalogo/v2/produtos-individuais` - Lista produtos (DB)
- `/api/catalogo/imagem/:marca/:nome/:arquivo` - Serve imagens

---

**ÚLTIMA ATUALIZAÇÃO:** 09/09/2026 - 17:00
**STATUS:** 🟡 Em andamento
