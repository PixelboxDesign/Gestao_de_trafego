# ⚠️ INSTRUÇÕES URGENTES - ERRO 404 DISPARO CONFIG

## 🚨 Problema Atual

**Status da resposta: 404**  
**Erro: Resposta vazia do servidor**

### Por Que Isso Acontece?

O código das rotas `/api/disparos/config` **JÁ ESTÁ NO CÓDIGO FONTE**, mas o **Luna Server NÃO FOI RECOMPILADO**.

O arquivo `luna-server.exe` que está rodando é uma versão antiga, de antes de adicionar essas rotas.

---

## ✅ SOLUÇÃO COMPLETA (Escolha UMA opção)

### 🎯 OPÇÃO 1: Script Automático (MAIS FÁCIL)

Abra um terminal no Windows e execute:

```batch
cd f:\luna_cosmeticos\backend
DEPLOY-DISPARO-CONFIG-COMPLETO.bat
```

**O que esse script faz:**
1. ✅ Conecta no MySQL e cria tabela `app_disparo_config`
2. ✅ Recompila Luna Server com novas rotas
3. ✅ Inicia Luna Server automaticamente

**Tempo:** 3-5 minutos

---

### 🎯 OPÇÃO 2: Passo a Passo Manual

#### Passo 1: Criar Tabela no MySQL

**Via Node.js (recomendado):**
```batch
cd f:\luna_cosmeticos\backend
node criar-tabela-disparo-config.js
```

**OU via PHPMyAdmin:**

1. Acesse: **http://vps.hawktecnologia.com/phpmyadmin**
2. Login:
   - Usuário: `hawktec_alpha_log`
   - Senha: `Alpha@3030`
3. Selecione o banco de dados: `hawktec_alpha_log`
4. Clique em **"SQL"** no menu superior
5. Cole e execute este SQL:

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

#### Passo 2: Recompilar Luna Server

**Via Script:**
```batch
cd f:\luna_cosmeticos\backend
REBUILD-LUNA-SERVER.bat
```

**OU Manualmente:**
```batch
# 1. Parar processo anterior
taskkill /F /IM luna-server.exe

# 2. Recompilar
cd f:\luna_cosmeticos\backend\src-tauri
cargo build --release

# 3. Iniciar
cd target\release
luna-server.exe
```

**⏰ Tempo de compilação:** 2-4 minutos

---

## 🔍 Como Verificar se Funcionou?

### Teste 1: Verificação Automática
```batch
cd f:\luna_cosmeticos\backend
node verificar-estado-disparo.js
```

Esse script verifica TUDO automaticamente e mostra um relatório completo.

### Teste 2: Manual

#### 2.1. Health Check
Abra no navegador: http://localhost:3001/health

Esperado:
```json
{"status":"ok","service":"luna-server",...}
```

#### 2.2. Teste Rota Config
Abra no navegador: http://localhost:3001/api/disparos/config

Esperado:
```json
{"ok":true,"config":null}
```

Se retornar **404**, o Luna Server ainda não foi recompilado.

#### 2.3. Teste no Site

1. Acesse: http://localhost:3001
2. Preencha os campos de disparo
3. Clique em **"💾 Salvar Configuração"**
4. Deve aparecer: **"✅ Configuração salva com sucesso!"**
5. Pressione **F5** para recarregar a página
6. ✅ Os campos devem estar preenchidos com os valores salvos

---

## 📋 Checklist de Verificação

Antes de testar, confirme:

- [ ] **Tabela criada no MySQL**
  - Via Node: `node criar-tabela-disparo-config.js`
  - OU via PHPMyAdmin (SQL acima)

- [ ] **Luna Server recompilado**
  - Via Script: `REBUILD-LUNA-SERVER.bat`
  - OU manual: `cargo build --release`

- [ ] **Luna Server rodando**
  - Deve ver janela do terminal com logs
  - OU iniciar: `backend\src-tauri\target\release\luna-server.exe`

- [ ] **Rota funciona**
  - Testar: http://localhost:3001/api/disparos/config
  - Esperado: `{"ok":true,"config":null}`

---

## 🐛 Problemas Comuns

### "node: command not found"
**Solução:** Use a opção PHPMyAdmin para criar a tabela manualmente.

### "cargo: command not found"
**Causa:** Rust não instalado.  
**Solução:** Instale de https://rustup.rs/ e reinicie terminal.

### "Erro ao conectar ao MySQL"
**Solução:** Verifique credenciais no arquivo `.env`:
```
DB_HOST=ns1.hawktecnologia.com
DB_PORT=3306
DB_USER=hawktec_alpha_log
DB_PASSWORD=Alpha@3030
DB_NAME=hawktec_alpha_log
```

### Compilação trava ou dá erro
**Solução 1:** Limpar e recompilar:
```batch
cd f:\luna_cosmeticos\backend\src-tauri
cargo clean
cargo build --release
```

**Solução 2:** Verificar espaço em disco (precisa ~2GB livre)

### Rota ainda retorna 404 após recompilar
**Causa:** Está rodando versão antiga do executável.

**Solução:**
1. Fechar TODAS as janelas do Luna Server
2. Verificar no Task Manager se `luna-server.exe` está rodando
3. Finalizar processo se existir
4. Recompilar novamente
5. Iniciar novo executável

---

## 📚 Documentação Completa

Para mais detalhes, consulte:

- **README-DISPARO-CONFIG.md** - Documentação completa da funcionalidade
- **TROUBLESHOOTING-DISPARO-CONFIG.md** - Guia detalhado de problemas

---

## 📞 Suporte Rápido

Se nada funcionar:

1. Execute o diagnóstico:
   ```batch
   node verificar-estado-disparo.js
   ```

2. Capture:
   - Output do diagnóstico
   - Console do navegador (F12)
   - Terminal do Luna Server
   - Screenshot do erro

3. Verifique data de modificação do executável:
   ```batch
   dir f:\luna_cosmeticos\backend\src-tauri\target\release\luna-server.exe
   ```
   A data deve ser de **HOJE**.

---

## ⚡ Solução Mais Rápida

Se você só quer que funcione AGORA:

```batch
cd f:\luna_cosmeticos\backend
DEPLOY-DISPARO-CONFIG-COMPLETO.bat
```

Aguarde 3-5 minutos. Pronto!

---

**Última atualização:** 2026-07-14  
**Commit:** a22d8ba
