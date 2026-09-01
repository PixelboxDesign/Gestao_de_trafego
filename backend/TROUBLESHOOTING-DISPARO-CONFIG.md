# 🔧 Troubleshooting - Disparo Config

## ❌ Problema: 404 ao salvar/carregar configuração

### Sintomas
```
[Disparo] Status da resposta: 404
[Disparo] Resposta raw: (vazia)
[Disparo] Erro: Resposta vazia do servidor
```

### Causa Raiz
O Luna Server **NÃO FOI RECOMPILADO** após adicionar as rotas `/api/disparos/config`.

O código Rust está correto (em `src-tauri/src/api/disparos.rs` e `mod.rs`), mas o executável `luna-server.exe` ainda é a versão antiga.

---

## ✅ Solução Completa (Automática)

### Opção 1: Script Completo (RECOMENDADO)
```batch
cd f:\luna_cosmeticos\backend
DEPLOY-DISPARO-CONFIG-COMPLETO.bat
```

Este script:
1. ✅ Cria tabela `app_disparo_config` no MySQL
2. ✅ Recompila Luna Server
3. ✅ Inicia Luna Server

**Tempo estimado:** 3-5 minutos

---

## ✅ Solução Manual (Passo a Passo)

### Passo 1: Criar Tabela no MySQL

#### Opção A: Via Node.js (automático)
```batch
cd f:\luna_cosmeticos\backend
node criar-tabela-disparo-config.js
```

#### Opção B: Via PHPMyAdmin (manual)
1. Acesse: http://vps.hawktecnologia.com/phpmyadmin
2. Usuário: `hawktec_alpha_log`
3. Senha: `Alpha@3030`
4. Selecione banco: `hawktec_alpha_log`
5. Clique em "SQL"
6. Cole e execute:

```sql
CREATE TABLE IF NOT EXISTS `app_disparo_config` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mensagem` TEXT NOT NULL,
  `item_id` INT DEFAULT NULL,
  `item_tipo` VARCHAR(50) DEFAULT NULL COMMENT 'kit ou produto',
  `item_nome` VARCHAR(255) DEFAULT NULL,
  `item_thumb_url` TEXT DEFAULT NULL,
  `quantidade` INT UNSIGNED NOT NULL DEFAULT 10,
  `intervalo_valor` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `intervalo_unidade` VARCHAR(20) NOT NULL DEFAULT 'horas' COMMENT 'horas ou minutos',
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Passo 2: Recompilar Luna Server

```batch
cd f:\luna_cosmeticos\backend
REBUILD-LUNA-SERVER.bat
```

**OU manualmente:**

```batch
cd f:\luna_cosmeticos\backend\src-tauri

# Parar processos
taskkill /F /IM luna-server.exe

# Recompilar
cargo build --release

# Iniciar
cd target\release
luna-server.exe
```

### Passo 3: Verificar

1. Abra: http://localhost:3001/health
   - Deve retornar: `{"status":"ok",...}`

2. Teste a rota config:
   ```bash
   curl http://localhost:3001/api/disparos/config
   ```
   - Deve retornar: `{"ok":true,"config":null}`

3. Recarregue o site e teste salvar configuração

---

## 🔍 Checklist de Verificação

### ✅ Backend compilado?
```batch
dir f:\luna_cosmeticos\backend\src-tauri\target\release\luna-server.exe
```
- Verifique a **data de modificação** do arquivo
- Deve ser **HOJE** após a recompilação

### ✅ Rotas registradas no código?
Abra `src-tauri/src/api/mod.rs` e procure por:
```rust
.route("/api/disparos/config", get(disparos::obter_config))
.route("/api/disparos/config", axum::routing::post(disparos::salvar_config))
```

### ✅ Funções existem?
Abra `src-tauri/src/api/disparos.rs` e procure por:
```rust
pub async fn salvar_config(...)
pub async fn obter_config(...)
```

### ✅ Tabela existe no MySQL?
Via PHPMyAdmin ou MySQL CLI:
```sql
SELECT * FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'hawktec_alpha_log' 
AND TABLE_NAME = 'app_disparo_config';
```

### ✅ Luna Server está rodando?
```batch
tasklist | findstr luna-server.exe
```

### ✅ Porta 3001 está aberta?
```bash
curl http://localhost:3001/health
```

---

## 🐛 Erros Comuns

### Erro: "Tabela 'app_disparo_config' não existe"

**Solução:** Execute o Passo 1 (criar tabela)

### Erro: "404 Not Found"

**Solução:** Execute o Passo 2 (recompilar Luna Server)

### Erro: "Connection refused"

**Causa:** Luna Server não está rodando

**Solução:**
```batch
cd f:\luna_cosmeticos\backend\src-tauri\target\release
luna-server.exe
```

### Erro: "cargo: command not found"

**Causa:** Rust não está instalado

**Solução:** Instale Rust de https://rustup.rs/

### Erro: Compilação falha

**Soluções:**
1. Limpar build anterior:
   ```batch
   cd f:\luna_cosmeticos\backend\src-tauri
   cargo clean
   cargo build --release
   ```

2. Atualizar dependências:
   ```batch
   cargo update
   cargo build --release
   ```

---

## 📊 Como Saber se Funcionou?

### Teste 1: Health Check
```bash
curl http://localhost:3001/health
```
✅ Resposta: `{"status":"ok",...}`

### Teste 2: Listar Config (vazia)
```bash
curl http://localhost:3001/api/disparos/config
```
✅ Resposta: `{"ok":true,"config":null}`

### Teste 3: Salvar Config
```bash
curl -X POST http://localhost:3001/api/disparos/config \
  -H "Content-Type: application/json" \
  -d "{\"mensagem\":\"teste\",\"item_id\":1,\"item_tipo\":\"produto\",\"item_nome\":\"Teste\",\"quantidade\":10,\"intervalo_valor\":1,\"intervalo_unidade\":\"horas\"}"
```
✅ Resposta: `{"ok":true}`

### Teste 4: Listar Config (com dados)
```bash
curl http://localhost:3001/api/disparos/config
```
✅ Resposta: `{"ok":true,"config":{...}}`

### Teste 5: Frontend
1. Acesse: http://localhost:3001
2. Configure disparo
3. Clique "💾 Salvar Configuração"
4. F5 para recarregar
5. ✅ Campos devem estar preenchidos

---

## 📝 Logs para Debug

### Backend Logs
O Luna Server loga todas as requisições:
```
📨 [HTTP IN] GET /api/disparos/config
✅ [HTTP OUT] GET /api/disparos/config - Status: 200 - Tempo: 15ms
```

Se ver **404**, significa que a rota não existe → **Recompilar**

### Frontend Logs
Console do navegador:
```javascript
[Disparo] Carregando configuração da API...
[Disparo] Config carregada: {...}
```

Se ver **404** ou **Erro ao carregar**, backend não foi recompilado.

---

## 🎯 Resumo da Solução

```batch
# 1. Criar tabela
node criar-tabela-disparo-config.js

# 2. Recompilar e iniciar
REBUILD-LUNA-SERVER.bat

# 3. Testar
curl http://localhost:3001/api/disparos/config
```

**OU simplesmente:**

```batch
DEPLOY-DISPARO-CONFIG-COMPLETO.bat
```

---

## 📞 Suporte

Se o problema persistir:

1. Capture logs:
   - Console do navegador (F12)
   - Terminal do Luna Server
   - PHPMyAdmin (verifica se tabela existe)

2. Verifique:
   - Data de modificação de `luna-server.exe`
   - Tabela existe no MySQL
   - Porta 3001 está livre

3. Documente:
   - Erro exato
   - Passos executados
   - Output dos comandos
