# ⚙️ Configuração dos Ambientes

## 📁 Arquivos de Configuração

### 1. **`.env`** - Desenvolvimento Local ✅

**Quando usar:** Rodar o sistema no seu PC

```env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=1728f1br
DB_NAME=historico_alphahall

FRONTEND_URL=http://localhost:5173
```

**Como rodar:**
```bash
cd F:\luna_cosmeticos\trafego_luna_cosmeticos
npm run dev
```

---

### 2. **`.env.render`** - Produção (Render) ✅

**Quando usar:** Deploy no Render.com

```env
NODE_ENV=production
PORT=10000

# Via Tailscale (PC como ponte)
DB_HOST=desktop-e6jr4dk.tailc1230a.ts.net
DB_PORT=3306
DB_USER=hawktec_alpha_log
DB_PASSWORD=Alpha@3030
DB_NAME=historico_alphahall

FRONTEND_URL=https://seu-frontend.onrender.com
```

**Como configurar no Render:**
1. Acesse: https://dashboard.render.com
2. Web Service → Environment
3. Adicionar cada variável acima
4. **NÃO copiar comentários (#)**

---

## 🔍 Diferenças Entre Ambientes

| Item | Local (`.env`) | Render (`.env.render`) |
|------|----------------|------------------------|
| **NODE_ENV** | development | production |
| **PORT** | 3000 | 10000 |
| **DB_HOST** | localhost | desktop-e6jr4dk.tailc1230a.ts.net |
| **DB_USER** | root | hawktec_alpha_log |
| **DB_PASSWORD** | 1728f1br | Alpha@3030 |
| **DB_NAME** | historico_alphahall | historico_alphahall ✅ |
| **FRONTEND_URL** | http://localhost:5173 | https://seu-frontend.onrender.com |

---

## ⚠️ IMPORTANTE: Database Name

### ❌ NÃO use:
```
DB_NAME=hawktec_alpha-ecommerce
```

### ✅ USE:
```
DB_NAME=historico_alphahall
```

**Por quê?**
- Você já importou as 62 tabelas para `historico_alphahall` (local)
- O VPS tem as mesmas tabelas em `historico_alphahall`
- `hawktec_alpha-ecommerce` é outro database (dados brutos)

---

## 🔗 Conexões

### Local (Desenvolvimento)
```
Seu PC (Backend)
    ↓ localhost:3306
MySQL Local (historico_alphahall)
```

### Render (Produção)
```
Render (Backend)
    ↓ Via Tailscale URL
Seu PC (Ponte Tailscale)
    ↓ localhost:3306
MySQL Local OU VPS (historico_alphahall)
```

---

## 🚀 Como Testar Localmente

### 1. Backend:
```bash
cd F:\luna_cosmeticos\trafego_luna_cosmeticos
npm run dev:backend
```

Acessar: http://localhost:3000/health

### 2. Frontend:
```bash
cd F:\luna_cosmeticos\trafego_luna_cosmeticos
npm run dev:frontend
```

Acessar: http://localhost:5173

### 3. Tudo junto:
```bash
npm run dev
```

---

## 🌐 Como Configurar no Render

### Passo 1: Criar Web Service

1. Acesse: https://dashboard.render.com
2. **New** → **Web Service**
3. Conectar: `PixelboxDesign/Gestao_de_trafego`

### Passo 2: Configurações Básicas

- **Name:** `luna-trafego-backend`
- **Region:** Oregon (US West)
- **Branch:** `main`
- **Root Directory:** (vazio)
- **Environment:** `Node` ⚠️ **NÃO Docker!**
- **Build Command:** `npm install`
- **Start Command:** `npm start`

### Passo 3: Environment Variables

Adicionar uma por uma no Render:

| Key | Value |
|-----|-------|
| NODE_ENV | production |
| PORT | 10000 |
| DB_HOST | desktop-e6jr4dk.tailc1230a.ts.net |
| DB_PORT | 3306 |
| DB_USER | hawktec_alpha_log |
| DB_PASSWORD | Alpha@3030 |
| DB_NAME | historico_alphahall |
| FRONTEND_URL | http://localhost:5173 |

⚠️ Depois de criar o frontend, voltar e atualizar `FRONTEND_URL`

---

## ✅ Checklist de Verificação

### Antes do Deploy:

- [x] `.env` atualizado (desenvolvimento)
- [x] `.env.render` atualizado (produção)
- [x] Database: `historico_alphahall` ✅
- [x] Tailscale ativo no PC
- [ ] Verificar URL do Tailscale: `tailscale status`
- [ ] MySQL local rodando
- [ ] Database `historico_alphahall` existe

### No Render:

- [ ] Web Service criado
- [ ] Runtime: Node (não Docker)
- [ ] Environment Variables configuradas
- [ ] DB_NAME = `historico_alphahall`
- [ ] Deploy bem-sucedido
- [ ] Logs mostram: `✅ Conectado ao MySQL: historico_alphahall`
- [ ] Endpoint `/health` responde OK

---

## 🔧 Troubleshooting

### ❌ "Erro ao conectar ao MySQL"

**No Local:**
```bash
# Verificar MySQL
mysql -u root -p1728f1br -e "SHOW DATABASES" | findstr historico
```

**No Render:**
```bash
# Verificar Tailscale
tailscale status

# Testar conexão via Tailscale
ping desktop-e6jr4dk.tailc1230a.ts.net
```

### ❌ "Database 'hawktec_alpha-ecommerce' não encontrado"

Trocar no Render:
```
DB_NAME=historico_alphahall
```

### ❌ "ECONNREFUSED"

- Verificar se MySQL está rodando
- Verificar se Tailscale está ativo
- Verificar credenciais

---

## 📊 Resumo

| Ambiente | Arquivo | Status | Uso |
|----------|---------|--------|-----|
| **Local** | `.env` | ✅ Pronto | `npm run dev` |
| **Render** | `.env.render` | ✅ Pronto | Copiar para Environment |
| **Database** | historico_alphahall | ✅ Correto | 62 tabelas |
| **Tailscale** | desktop-e6jr4dk | ✅ Configurado | PC como ponte |

---

📅 Atualizado: 14/07/2026  
✅ Configuração completa!
