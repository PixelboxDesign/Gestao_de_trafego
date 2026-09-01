# 📦 Sistema de Configuração Persistente do Disparo

## 📋 Visão Geral

Sistema que permite salvar e carregar a configuração do disparo WhatsApp entre o site (Render) e o painel desktop (Tauri), usando MySQL como backend.

### Funcionalidades

- ✅ **Persistência no MySQL**: Configuração salva no banco de dados
- ✅ **Sincronização**: Mesma config no site e painel desktop
- ✅ **Botão Salvar**: Controle manual do usuário
- ✅ **Auto-carregamento**: Restaura config ao recarregar página
- ✅ **Fallback localStorage**: Se API falhar, usa cache local

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│  Frontend (JS)  │
│   index.html    │ ← Botão "💾 Salvar Configuração"
└────────┬────────┘
         │ HTTP POST/GET
         ↓
┌─────────────────┐
│ Luna Server     │
│  (Rust/Axum)    │ ← Rotas /api/disparos/config
└────────┬────────┘
         │ SQL
         ↓
┌─────────────────┐
│     MySQL       │
│ app_disparo_    │ ← Tabela de configuração
│     config      │
└─────────────────┘
```

### Fluxo de Dados

1. **Salvamento**:
   - Usuário preenche campos
   - Clica "💾 Salvar Configuração"
   - Frontend → POST `/api/disparos/config`
   - Backend → INSERT/UPDATE MySQL
   - Retorna `{ok: true}`

2. **Carregamento**:
   - Página carrega
   - Frontend → GET `/api/disparos/config`
   - Backend → SELECT MySQL
   - Retorna `{ok: true, config: {...}}`
   - Frontend preenche campos

---

## 📁 Estrutura de Arquivos

### Backend (Rust)
```
backend/src-tauri/src/api/
├── disparos.rs          # ← Funções salvar_config() e obter_config()
└── mod.rs               # ← Registro das rotas

backend/sql/
└── create_app_disparo_config.sql  # ← DDL da tabela
```

### Frontend (JavaScript)
```
frontend/disparo/public/
└── index.html           # ← Funções salvarConfigDisparoManual() e carregarConfigDisparo()
```

### Scripts de Deploy
```
backend/
├── DEPLOY-DISPARO-CONFIG-COMPLETO.bat  # ← Script completo (recomendado)
├── REBUILD-LUNA-SERVER.bat             # ← Apenas recompila
├── criar-tabela-disparo-config.js      # ← Cria tabela MySQL
├── verificar-estado-disparo.js         # ← Diagnóstico completo
└── TROUBLESHOOTING-DISPARO-CONFIG.md   # ← Guia de problemas
```

---

## 🚀 Deploy Rápido

### Opção 1: Script Completo (RECOMENDADO)

```batch
cd f:\luna_cosmeticos\backend
DEPLOY-DISPARO-CONFIG-COMPLETO.bat
```

Esse script executa:
1. Cria tabela `app_disparo_config` no MySQL
2. Recompila Luna Server com novas rotas
3. Inicia Luna Server

**Tempo:** 3-5 minutos

---

### Opção 2: Passo a Passo Manual

#### Passo 1: Criar Tabela no MySQL

**Via Node.js:**
```batch
cd f:\luna_cosmeticos\backend
node criar-tabela-disparo-config.js
```

**Via PHPMyAdmin:**
1. Acesse: http://vps.hawktecnologia.com/phpmyadmin
2. Login: `hawktec_alpha_log` / `Alpha@3030`
3. Selecione database: `hawktec_alpha_log`
4. SQL > Cole o conteúdo de `sql/create_app_disparo_config.sql`
5. Executar

#### Passo 2: Recompilar Luna Server

```batch
cd f:\luna_cosmeticos\backend
REBUILD-LUNA-SERVER.bat
```

Ou manualmente:
```batch
cd f:\luna_cosmeticos\backend\src-tauri
cargo build --release
cd target\release
luna-server.exe
```

---

## 🔍 Verificação

### Script de Diagnóstico

```batch
cd f:\luna_cosmeticos\backend
node verificar-estado-disparo.js
```

Este script verifica:
- ✅ Arquivos existem e estão atualizados
- ✅ Tabela existe no MySQL
- ✅ Luna Server está rodando
- ✅ Rotas /api/disparos/config funcionam

### Testes Manuais

#### 1. Health Check
```bash
curl http://localhost:3001/health
```
Esperado: `{"status":"ok",...}`

#### 2. Listar Config (vazia)
```bash
curl http://localhost:3001/api/disparos/config
```
Esperado: `{"ok":true,"config":null}`

#### 3. Salvar Config
```bash
curl -X POST http://localhost:3001/api/disparos/config \
  -H "Content-Type: application/json" \
  -d "{\"mensagem\":\"Teste\",\"item_id\":1,\"item_tipo\":\"produto\",\"item_nome\":\"Produto Teste\",\"quantidade\":10,\"intervalo_valor\":1.0,\"intervalo_unidade\":\"horas\"}"
```
Esperado: `{"ok":true}`

#### 4. Listar Config (com dados)
```bash
curl http://localhost:3001/api/disparos/config
```
Esperado: `{"ok":true,"config":{...}}`

---

## 📊 Estrutura da Tabela

```sql
CREATE TABLE `app_disparo_config` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mensagem` TEXT NOT NULL,
  `item_id` INT DEFAULT NULL,
  `item_tipo` VARCHAR(50) DEFAULT NULL COMMENT 'kit ou produto',
  `item_nome` VARCHAR(255) DEFAULT NULL,
  `item_thumb_url` TEXT DEFAULT NULL,
  `quantidade` INT UNSIGNED NOT NULL DEFAULT 10,
  `intervalo_valor` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `intervalo_unidade` VARCHAR(20) NOT NULL DEFAULT 'horas',
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Campos

- **mensagem**: Texto da mensagem WhatsApp
- **item_id**: ID do produto/kit na tabela `relacao_produtos_kits_disparo_luna`
- **item_tipo**: `"kit"` ou `"produto"`
- **item_nome**: Nome do produto/kit selecionado
- **item_thumb_url**: URL da thumbnail
- **quantidade**: Número de mensagens a enviar
- **intervalo_valor**: Valor numérico do intervalo (ex: 1.5)
- **intervalo_unidade**: `"horas"` ou `"minutos"`
- **criado_em**: Timestamp de criação
- **atualizado_em**: Timestamp de última atualização

---

## 🔌 API Endpoints

### POST /api/disparos/config

Salva ou atualiza a configuração do disparo.

**Request Body:**
```json
{
  "mensagem": "Olá! Confira nosso produto",
  "item_id": 123,
  "item_tipo": "produto",
  "item_nome": "Açucarante + Kit Cronograma",
  "item_thumb_url": "https://...",
  "quantidade": 10,
  "intervalo_valor": 1.5,
  "intervalo_unidade": "horas"
}
```

**Response:**
```json
{
  "ok": true
}
```

**Lógica:**
- Se já existe config (qualquer registro), faz UPDATE
- Se não existe, faz INSERT
- Sempre mantém apenas 1 registro (último)

---

### GET /api/disparos/config

Retorna a última configuração salva.

**Response (com dados):**
```json
{
  "ok": true,
  "config": {
    "id": 1,
    "mensagem": "Olá! Confira nosso produto",
    "item_id": 123,
    "item_tipo": "produto",
    "item_nome": "Açucarante + Kit Cronograma",
    "item_thumb_url": "https://...",
    "quantidade": 10,
    "intervalo_valor": 1.5,
    "intervalo_unidade": "horas",
    "criado_em": "2026-07-14T10:30:00",
    "atualizado_em": "2026-07-14T15:45:00"
  }
}
```

**Response (vazia):**
```json
{
  "ok": true,
  "config": null
}
```

---

## 💻 Frontend (JavaScript)

### Função: salvarConfigDisparoManual()

Chamada pelo botão "💾 Salvar Configuração".

```javascript
async function salvarConfigDisparoManual() {
    console.log('[Disparo] Salvando configuração...');
    
    const payload = {
        mensagem: document.getElementById('mensagem-whatsapp').value,
        item_id: parseInt(document.getElementById('item-id').value) || 0,
        item_tipo: document.getElementById('item-tipo').value || 'produto',
        item_nome: document.getElementById('item-nome').value || '',
        item_thumb_url: document.getElementById('item-thumb').value || null,
        quantidade: parseInt(document.getElementById('quantidade-mensagens').value) || 10,
        intervalo_valor: parseFloat(document.getElementById('intervalo-valor').value) || 1.0,
        intervalo_unidade: document.getElementById('intervalo-unidade').value || 'horas'
    };

    const response = await fetch(`${API_BASE_URL}/api/disparos/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (data.ok) {
        alert('✅ Configuração salva com sucesso!');
        localStorage.setItem('disparo_config', JSON.stringify(payload));
    } else {
        throw new Error(data.erro || 'Erro ao salvar');
    }
}
```

### Função: carregarConfigDisparo()

Chamada automaticamente no `window.addEventListener('load')`.

```javascript
async function carregarConfigDisparo() {
    console.log('[Disparo] Carregando configuração da API...');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/disparos/config`);
        const data = await response.json();

        if (data.ok && data.config) {
            const cfg = data.config;
            
            // Preenche campos
            document.getElementById('mensagem-whatsapp').value = cfg.mensagem || '';
            document.getElementById('quantidade-mensagens').value = cfg.quantidade || 10;
            document.getElementById('intervalo-valor').value = cfg.intervalo_valor || 1;
            document.getElementById('intervalo-unidade').value = cfg.intervalo_unidade || 'horas';
            
            // Se tem item selecionado, exibe
            if (cfg.item_id) {
                selecionarItem({
                    id: cfg.item_id,
                    tipo: cfg.item_tipo,
                    nome: cfg.item_nome,
                    thumbnail_url: cfg.item_thumb_url
                });
            }
            
            // Salva no localStorage como backup
            localStorage.setItem('disparo_config', JSON.stringify(cfg));
        }
    } catch (error) {
        console.error('[Disparo] Erro ao carregar:', error);
        
        // Fallback: tenta carregar do localStorage
        const localConfig = localStorage.getItem('disparo_config');
        if (localConfig) {
            const cfg = JSON.parse(localConfig);
            // ... preenche campos ...
        }
    }
}
```

---

## 🐛 Troubleshooting

### Erro 404 ao salvar/carregar

**Causa:** Luna Server não foi recompilado após adicionar as rotas.

**Solução:**
```batch
REBUILD-LUNA-SERVER.bat
```

Veja mais detalhes em: `TROUBLESHOOTING-DISPARO-CONFIG.md`

### Tabela não existe

**Causa:** Tabela `app_disparo_config` não foi criada no MySQL.

**Solução:**
```batch
node criar-tabela-disparo-config.js
```

### Configuração não persiste

**Verificar:**
1. Luna Server recompilado?
   ```batch
   dir src-tauri\target\release\luna-server.exe
   ```
   (data deve ser de hoje)

2. Tabela existe?
   ```sql
   SHOW TABLES LIKE 'app_disparo_config';
   ```

3. Rotas funcionam?
   ```bash
   curl http://localhost:3001/api/disparos/config
   ```

---

## 📝 Commits

Toda funcionalidade já está commitada:

- `5f55855` - Adiciona endpoint POST/GET /api/disparos/config (backend)
- `3ce7991` - Adiciona botão Salvar e carregamento automático (frontend)
- `dccc418` - Deploy frontend com persistência

---

## 🎯 Como Usar

### 1. Deploy Inicial

```batch
cd f:\luna_cosmeticos\backend
DEPLOY-DISPARO-CONFIG-COMPLETO.bat
```

### 2. Verificar

```batch
node verificar-estado-disparo.js
```

### 3. Testar no Navegador

1. Acesse: http://localhost:3001
2. Preencha os campos:
   - Mensagem
   - Kit/Produto (pesquise e selecione)
   - Quantidade
   - Intervalo
3. Clique **"💾 Salvar Configuração"**
4. Pressione **F5** (recarregar)
5. ✅ Os campos devem estar preenchidos

---

## 📞 Suporte

Se algo não funcionar:

1. Execute diagnóstico:
   ```batch
   node verificar-estado-disparo.js
   ```

2. Leia troubleshooting:
   ```
   TROUBLESHOOTING-DISPARO-CONFIG.md
   ```

3. Verifique logs:
   - Console do navegador (F12)
   - Terminal do Luna Server
   - MySQL (PHPMyAdmin)

---

## 🔗 Links Úteis

- **PHPMyAdmin**: http://vps.hawktecnologia.com/phpmyadmin
- **Luna Server Local**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Config**: http://localhost:3001/api/disparos/config

---

## ✅ Checklist de Deploy

- [ ] Tabela `app_disparo_config` criada no MySQL
- [ ] Luna Server recompilado com `cargo build --release`
- [ ] Luna Server rodando em http://localhost:3001
- [ ] GET `/api/disparos/config` retorna `{ok: true, config: null}`
- [ ] POST `/api/disparos/config` retorna `{ok: true}`
- [ ] Frontend salva ao clicar botão
- [ ] Frontend carrega ao recarregar (F5)
- [ ] Configuração persiste no MySQL
- [ ] Site Render também funciona (após deploy)

---

**Última atualização:** 2026-07-14
