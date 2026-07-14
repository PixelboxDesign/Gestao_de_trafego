# 🚀 Deploy no Render - Guia Completo

## 📋 Pré-requisitos
1. Conta no GitHub (já tem: `PandboxDesign/Gastao-de-trafego`)
2. Conta no Render.com (gratuita)
3. Banco MySQL acessível via internet

---

## 🗄️ Configurar Banco de Dados MySQL

### Opção 1: Railway.app (Recomendado - Grátis)
1. Acesse https://railway.app
2. Crie conta com GitHub
3. New Project → Database → MySQL
4. Anote as credenciais:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

### Opção 2: Usar VPS atual (hawktecnologia.com)
- Host: `162.240.228.36`
- Port: `3306`
- User: `hawktec_alpha_log`
- Password: `Alpha@3030`
- Database: `historico_alphahall`

⚠️ **IMPORTANTE:** Liberar IP do Render no firewall do VPS!

---

## 🔧 Deploy do Backend (API)

### 1. Criar Web Service no Render

1. Login no Render: https://dashboard.render.com
2. **New > Web Service**
3. **Connect Repository:** `PandboxDesign/Gastao-de-trafego`
4. **Configurações:**
   - **Name:** `luna-trafego-api`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Root Directory:** (deixe vazio)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

### 2. Configurar Variáveis de Ambiente

Na página do serviço, vá em **Environment** e adicione:

```env
NODE_ENV=production
PORT=10000

# Database (use Railway ou VPS)
DB_HOST=seu-mysql-host.railway.app
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_forte
DB_NAME=historico_alphahall

# Frontend URL (preencher depois)
FRONTEND_URL=https://luna-trafego.onrender.com
```

### 3. Deploy

Clique em **"Create Web Service"** e aguarde o deploy (3-5 minutos).

Anote a URL da API: `https://luna-trafego-api.onrender.com`

---

## 🎨 Deploy do Frontend (Static Site)

### 1. Criar Static Site no Render

1. **New > Static Site**
2. **Connect Repository:** `PandboxDesign/Gastao-de-trafego`
3. **Configurações:**
   - **Name:** `luna-trafego`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

### 2. Configurar Variável de Ambiente

Na página do site, vá em **Environment** e adicione:

```env
VITE_API_URL=https://luna-trafego-api.onrender.com/api
```

### 3. Deploy

Clique em **"Create Static Site"** e aguarde (2-3 minutos).

A URL do frontend será: `https://luna-trafego.onrender.com`

---

## 🔄 Atualizar Backend com URL do Frontend

1. Volte no **Web Service** do backend
2. Vá em **Environment**
3. Edite a variável `FRONTEND_URL`:
   ```
   FRONTEND_URL=https://luna-trafego.onrender.com
   ```
4. Salve e aguarde redeploy automático

---

## ✅ Testar o Sistema

### Backend
Acesse: `https://luna-trafego-api.onrender.com/health`

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2026-07-14...",
  "environment": "production"
}
```

### Frontend
Acesse: `https://luna-trafego.onrender.com`

Deve carregar o dashboard com dados.

---

## 🔍 Debugging

### Backend não conecta ao banco
1. Verifique credenciais em **Environment**
2. Se usar VPS, libere IP do Render no firewall
3. Veja logs: Dashboard > Logs

### Frontend não carrega dados
1. Verifique `VITE_API_URL` no Static Site
2. Abra DevTools (F12) > Console
3. Verifique erros de CORS

### Erro 503/504
- Render Free tier hiberna após 15min sem uso
- Primeiro acesso demora ~30 segundos

---

## 📦 Variáveis de Ambiente Completas

### Backend (.env para o Render)
```env
NODE_ENV=production
PORT=10000
DB_HOST=containers-us-west-xxx.railway.app
DB_PORT=3306
DB_USER=root
DB_PASSWORD=xxxxxxxxxxxxx
DB_NAME=historico_alphahall
FRONTEND_URL=https://luna-trafego.onrender.com
```

### Frontend (.env para o Render)
```env
VITE_API_URL=https://luna-trafego-api.onrender.com/api
```

---

## 🔄 Atualizar o Sistema

Basta fazer push no GitHub:

```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
```

O Render detecta o push e faz redeploy automático! ✨

---

## 💰 Custos

- **Render Free Tier:**
  - Backend: 750 horas/mês (suficiente)
  - Frontend: Ilimitado
  - ⚠️ Hiberna após 15min inativo
  
- **Railway MySQL Free:**
  - 500 MB storage
  - 5GB transferência/mês
  - ⚠️ Upgrade se precisar mais

---

## 🆘 Suporte

**Problemas com deploy?**
- Render Docs: https://render.com/docs
- Railway Docs: https://docs.railway.app

**Problemas com código?**
- Verifique logs no Render Dashboard
- Teste localmente primeiro: `npm run dev`

---

✅ **Após seguir este guia, seu sistema estará 100% online e acessível via HTTPS!**
