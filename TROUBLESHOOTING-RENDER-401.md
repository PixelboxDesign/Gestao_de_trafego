# 🔧 TROUBLESHOOTING - Erro 401 Unauthorized no Render.com

**Data:** 2026-09-01  
**Problema:** Botão "Atualizar URL no Render.com" retorna erro 401 Unauthorized  
**Frequência:** RECORRENTE - acontece sempre que há mudanças no token ou Service ID

---

## 🚨 Sintomas

### No Painel de Controle (Aba Tunnel):
```
❌ Erro: Erro do Render ao atualizar variável: 401 Unauthorized - {"message":"Unauthorized"}
```

### No Console/Logs:
```
Erro do Render ao atualizar variável: 401 Unauthorized - {"message":"Unauthorized"}
```

### Na API (teste manual):
```bash
curl http://localhost:3001/api/render/deploy-com-url-nova -X POST
# Retorna: 502 Bad Gateway
# Body: "Erro do Render ao atualizar variável: 401 Unauthorized"
```

---

## 🔍 Causas Raiz (em ordem de probabilidade)

### 1. 🔑 Token API Expirado ou Inválido (80% dos casos)

**Como acontece:**
- Tokens do Render.com podem expirar
- Token foi regenerado no dashboard do Render
- Token foi deletado/revogado
- Token hardcoded no código está desatualizado

**Como identificar:**
```bash
# Testar token atual
curl https://api.render.com/v1/services \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
  
# Se retornar 401: Token inválido
# Se retornar 200: Token válido
```

**Solução:**
1. Ir em: https://dashboard.render.com/u/settings/api-keys
2. Gerar novo token (ou verificar o existente)
3. Atualizar em 2 lugares:
   - `backend/src-tauri/.env` → `RENDER_API_KEY=rnd_NOVO_TOKEN`
   - `backend/src-tauri/src/api/render_deploy.rs` → fallback no código (linha ~58)
4. Recompilar: `cargo build --release`
5. Reiniciar Luna Server

---

### 2. 🎯 Service ID Incorreto (15% dos casos)

**Como acontece:**
- Serviço foi deletado e recriado no Render
- Service ID foi copiado errado (typo de 1 letra!)
- Múltiplos serviços e pegou o ID errado

**Como identificar:**
```bash
# Listar todos os serviços
curl https://api.render.com/v1/services \
  -H "Authorization: Bearer SEU_TOKEN" | jq '.[] | {id, name}'

# Procurar o serviço "luna-disparo"
# Copiar o ID correto (srv-XXXXX)
```

**Exemplo Real do Erro:**
- **Errado:** `srv-d9roha7avr4c739pjlu0` (com **j**)
- **Correto:** `srv-d9roha7avr4c739pliu0` (com **i**)
- Diferença de **UMA LETRA** causou o 401!

**Solução:**
1. Obter Service ID correto (comando acima)
2. Atualizar em 2 lugares:
   - `backend/src-tauri/.env` → `RENDER_SERVICE_ID=srv-CORRETO`
   - `backend/src-tauri/src/api/render_deploy.rs` → hardcoded (linha ~60)
3. Recompilar: `cargo build --release`
4. Reiniciar Luna Server

---

### 3. 📂 Arquivo `.env` Não Está Sendo Carregado (5% dos casos)

**Como acontece:**
- Código Rust não carrega `.env` automaticamente
- `.env` está no lugar errado
- Executável roda de diretório diferente

**Como identificar:**
```rust
// Adicionar logs temporários no render_deploy.rs:
info!("🔑 Token: {}...", &render_api_key[..15]);
info!("🎯 Service ID: {}", service_id);

// Se mostrar o token/ID antigo mesmo após atualizar .env:
// → .env NÃO está sendo carregado
```

**Solução:**
Verificar se `lib.rs` tem o carregamento do `.env`:

```rust
pub fn run() {
    // Carrega variáveis de ambiente do .env do diretório do executável
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));
    
    let env_path = exe_dir.join(".env");
    if env_path.exists() {
        match dotenv::from_path(&env_path) {
            Ok(_) => eprintln!("✅ .env carregado de: {:?}", env_path),
            Err(e) => eprintln!("⚠️ Erro ao carregar .env: {}", e),
        }
    }
    
    // ... resto do código
}
```

Se não tiver, adicionar e recompilar.

---

## 🛠️ Procedimento de Diagnóstico Completo

### Passo 1: Identificar Qual Componente Está Com Problema

```bash
# 1. Testar token atual
curl https://api.render.com/v1/services \
  -H "Authorization: Bearer TOKEN_DO_ENV"

# ✅ 200 OK: Token válido
# ❌ 401 Unauthorized: Token inválido → VÁ PARA SOLUÇÃO A

# 2. Testar Service ID
curl https://api.render.com/v1/services/SERVICE_ID_DO_ENV \
  -H "Authorization: Bearer TOKEN_DO_ENV"

# ✅ 200 OK: Service ID válido
# ❌ 404 Not Found: Service ID errado → VÁ PARA SOLUÇÃO B
```

---

### Passo 2: Verificar Configurações Atuais

```bash
# Verificar .env
cat backend/src-tauri/.env | grep RENDER

# Deve mostrar:
# RENDER_API_KEY=rnd_XXXXX
# RENDER_SERVICE_ID=srv-XXXXX
# RENDER_ENV_VAR_NAME=VITE_API_BASE_URL
```

```bash
# Verificar código
cat backend/src-tauri/src/api/render_deploy.rs | grep -A 3 "RENDER_API_KEY"

# Deve mostrar o fallback correto:
# .unwrap_or_else(|_| "rnd_TOKEN_VALIDO".to_string());
```

---

### Passo 3: Aplicar Correção

#### 🔧 SOLUÇÃO A: Atualizar Token

1. **Gerar novo token:**
   - https://dashboard.render.com/u/settings/api-keys
   - Criar novo ou copiar existente

2. **Atualizar `.env`:**
   ```bash
   # backend/src-tauri/.env
   RENDER_API_KEY=rnd_NOVO_TOKEN_AQUI
   ```

3. **Atualizar código (fallback):**
   ```rust
   // backend/src-tauri/src/api/render_deploy.rs (linha ~58)
   let render_api_key = std::env::var("RENDER_API_KEY")
       .unwrap_or_else(|_| "rnd_NOVO_TOKEN_AQUI".to_string());
   ```

4. **Recompilar:**
   ```bash
   cd backend/src-tauri
   cargo build --release
   ```

5. **Reiniciar:**
   ```bash
   taskkill /F /IM luna-server.exe
   cd target/release
   luna-server.exe
   ```

6. **Testar:**
   ```bash
   curl http://localhost:3001/api/render/deploy-com-url-nova -X POST
   # Deve retornar 200 OK
   ```

---

#### 🔧 SOLUÇÃO B: Atualizar Service ID

1. **Obter Service ID correto:**
   ```bash
   curl https://api.render.com/v1/services \
     -H "Authorization: Bearer SEU_TOKEN" | jq '.[] | select(.name=="luna-disparo") | .id'
   
   # Copiar o srv-XXXXX retornado
   ```

2. **Atualizar `.env`:**
   ```bash
   # backend/src-tauri/.env
   RENDER_SERVICE_ID=srv-ID_CORRETO_AQUI
   ```

3. **Atualizar código (hardcoded):**
   ```rust
   // backend/src-tauri/src/api/render_deploy.rs (linha ~60)
   let service_id = "srv-ID_CORRETO_AQUI";
   ```

4. **Recompilar e reiniciar** (mesmo processo da Solução A)

---

#### 🔧 SOLUÇÃO C: Corrigir Carregamento do `.env`

Se o `.env` existe mas não está sendo carregado:

1. **Verificar `lib.rs`:**
   ```rust
   // backend/src-tauri/src/lib.rs
   // Deve ter no início da função run():
   
   pub fn run() {
       let exe_dir = std::env::current_exe()
           .ok()
           .and_then(|p| p.parent().map(|d| d.to_path_buf()))
           .unwrap_or_else(|| std::path::PathBuf::from("."));
       
       let env_path = exe_dir.join(".env");
       if env_path.exists() {
           match dotenv::from_path(&env_path) {
               Ok(_) => eprintln!("✅ .env carregado"),
               Err(e) => eprintln!("⚠️ Erro: {}", e),
           }
       }
       
       // ... resto
   }
   ```

2. **Se não tiver, adicionar** (código acima)

3. **Recompilar e reiniciar**

---

## 🧪 Como Testar se Está Funcionando

### Teste 1: Via API (linha de comando)
```bash
curl http://localhost:3001/api/render/deploy-com-url-nova -X POST

# ✅ Sucesso:
# Status: 200
# Body: {"ok":true,"mensagem":"Deploy iniciado com sucesso!","deploy_id":"dep-XXX"}

# ❌ Falha:
# Status: 502
# Body: "Erro do Render ao atualizar variável: 401 Unauthorized"
```

### Teste 2: Via Painel de Controle
1. Abrir painel: `INICIAR-PAINEL.bat`
2. Ir na aba **Tunnel**
3. Aguardar URL do Cloudflare aparecer
4. Clicar em **"🔄 Atualizar URL no Render.com"**
5. Deve aparecer: ✅ "Deploy iniciado com sucesso!"

### Teste 3: Verificar Deploy no Render
1. Ir em: https://dashboard.render.com/web/luna-disparo/deploys
2. Deve aparecer novo deploy em progresso
3. Variável `VITE_API_BASE_URL` deve estar atualizada com nova URL do Cloudflare

---

## 📝 Checklist de Verificação

Antes de considerar resolvido, verificar:

- [ ] Token válido (teste com curl retorna 200)
- [ ] Service ID correto (teste com curl retorna 200)
- [ ] `.env` existe em `backend/src-tauri/.env`
- [ ] `.env` tem `RENDER_API_KEY` e `RENDER_SERVICE_ID`
- [ ] Código tem fallback correto em `render_deploy.rs`
- [ ] `lib.rs` carrega `.env` com `dotenv::from_path()`
- [ ] Luna Server foi recompilado (`cargo build --release`)
- [ ] Luna Server foi reiniciado
- [ ] Teste API retorna 200
- [ ] Teste painel funciona
- [ ] Deploy aparece no dashboard do Render

---

## 🗂️ Arquivos Envolvidos

### 1. Configuração (`.env`)
```
backend/src-tauri/.env
```
Contém:
- `RENDER_API_KEY` - Token de autenticação
- `RENDER_SERVICE_ID` - ID do serviço no Render
- `RENDER_ENV_VAR_NAME` - Nome da variável a atualizar (VITE_API_BASE_URL)

### 2. Código Backend (Rust)
```
backend/src-tauri/src/api/render_deploy.rs
```
Função: `deploy_com_url_nova()`
- Lê URL do Cloudflare de `tunnel-url.txt`
- Lê credenciais do `.env` (ou usa fallback)
- Chama API do Render para atualizar variável
- Triggera deploy automático

### 3. Carregamento de Variáveis
```
backend/src-tauri/src/lib.rs
```
Função: `run()`
- Carrega `.env` no início da execução
- Usa `dotenv::from_path()` para forçar diretório do executável

### 4. Frontend (Painel)
```
backend/src/pages/AbaTunnel.tsx
```
Componente: `<AbaTunnel />`
- Função `updateRenderEnv()` chama `/api/render/deploy-com-url-nova`

---

## 📊 Histórico de Ocorrências

### Ocorrência 1: 2026-09-01
**Causa:** Token expirado + Service ID com typo (1 letra errada)
- Token antigo: `rnd_bsQpbKjHzxS7RcLg4WpuBOCAajIf` (inválido)
- Token novo: `rnd_cyHZHxdwg0Aah04WKhrTYwzXSIuT` (válido)
- Service ID errado: `srv-d9roha7avr4c739pjlu0` (com **j**)
- Service ID correto: `srv-d9roha7avr4c739pliu0` (com **i**)

**Solução:**
1. Atualizado token em `.env` e código
2. Corrigido Service ID (typo de 1 letra)
3. Adicionado carregamento do `.env` em `lib.rs`
4. Recompilado em RELEASE
5. ✅ Funcionou

**Commit:** `ce36ed1 - fix: corrige token e Service ID do Render + carrega .env corretamente`

---

## 🚀 Script Rápido de Diagnóstico

Salve como `backend/diagnosticar-render.sh`:

```bash
#!/bin/bash

echo "🔍 DIAGNÓSTICO RENDER.COM"
echo "========================="

# Carregar .env
source backend/src-tauri/.env

echo ""
echo "1️⃣ Testando Token..."
if curl -s https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_API_KEY" | grep -q "service"; then
  echo "   ✅ Token válido"
else
  echo "   ❌ Token inválido - ATUALIZAR TOKEN"
fi

echo ""
echo "2️⃣ Testando Service ID..."
if curl -s https://api.render.com/v1/services/$RENDER_SERVICE_ID \
  -H "Authorization: Bearer $RENDER_API_KEY" | grep -q "name"; then
  echo "   ✅ Service ID válido"
else
  echo "   ❌ Service ID inválido - ATUALIZAR SERVICE ID"
fi

echo ""
echo "3️⃣ Verificando .env..."
if [ -f "backend/src-tauri/.env" ]; then
  echo "   ✅ .env existe"
else
  echo "   ❌ .env não encontrado"
fi

echo ""
echo "4️⃣ Testando API local..."
if curl -s http://localhost:3001/health | grep -q "ok"; then
  echo "   ✅ Luna Server rodando"
else
  echo "   ❌ Luna Server offline - INICIAR SERVIDOR"
fi

echo ""
echo "========================="
echo "Diagnóstico concluído"
```

---

## 💡 Dicas para Evitar o Problema

1. **Nunca delete/regenere tokens sem atualizar o código**
2. **Sempre copie Service ID com cuidado** (fácil errar 1 letra)
3. **Após atualizar `.env`, sempre recompilar** (`cargo build --release`)
4. **Manter fallback no código atualizado** (não confiar só no `.env`)
5. **Documentar tokens em local seguro** (1Password, Bitwarden, etc)

---

## 📞 Quando Tudo Falhar

Se depois de seguir TODOS os passos acima ainda não funcionar:

1. **Verificar permissões do token:**
   - Dashboard Render → API Keys
   - Token deve ter permissão "Full Access" ou pelo menos "Read/Write Services"

2. **Verificar se serviço existe:**
   - Dashboard Render → Services
   - Confirmar que "luna-disparo" está ativo

3. **Criar novo token do zero:**
   - Deletar token antigo
   - Criar novo com Full Access
   - Atualizar em TODOS os lugares

4. **Recriar serviço (última opção):**
   - Anotar todas as configurações atuais
   - Deletar serviço antigo
   - Criar novo serviço
   - Copiar novo Service ID
   - Atualizar código

---

**Última atualização:** 2026-09-01  
**Status:** ✅ Resolvido  
**Próxima revisão:** Sempre que erro 401 ocorrer novamente
