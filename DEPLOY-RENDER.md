# 🚀 Deploy no Render - Luna Tráfego (via Tailscale)

## 🏗️ Arquitetura

```
Render (Backend) 
    ↓ via Tailscale URL
Seu PC (Ponte Tailscale)
    ↓ localhost
VPS (MySQL)
```

**Vantagens:**
- ✅ Simples (sem Docker)
- ✅ Funciona igual projeto PixelBox Portal
- ✅ Backend roda 24/7 no Render
- ✅ Sem custo extra

**Requisito:**
- ⚠️ Seu PC precisa estar ligado com Tailscale ativo

---

## 📋 Passo a Passo:

### **Passo 1: Verificar Tailscale no Seu PC**

Abra o terminal e execute:

```bash
tailscale status
```

Deve mostrar:
```
desktop-e6jr4dk     100.78.156.3
    ...
```

Anote a URL: `desktop-e6jr4dk.tailc1230a.ts.net`

---

### **Passo 2: Criar Backend no Render**

1. Acesse: https://dashboard.render.com
2. **New** → **Web Service**
3. Conectar repositório: `PixelboxDesign/Gestao_de_trafego`
4. Configurações:
   - **Name:** `luna-trafego-backend`
   - **Region:** Oregon (US West)
   - **Branch:** `main`
   - **Root Directory:** (deixar vazio)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

---

### **Passo 3: Configurar Environment Variables**

Na aba **Environment**, adicionar:

```bash
NODE_ENV=production
PORT=10000

# Database via Tailscale
DB_HOST=desktop-e6jr4dk.tailc1230a.ts.net
DB_PORT=3306
DB_USER=hawktec_alpha_log
DB_PASSWORD=Alpha@3030
DB_NAME=historico_alphahall

# Frontend (preencher depois)
FRONTEND_URL=http://localhost:5173
```

⚠️ **Importante:** Trocar `desktop-e6jr4dk.tailc1230a.ts.net` pela sua URL do Tailscale se for diferente.

---

### **Passo 4: Deploy**

1. Clicar em **"Create Web Service"**
2. Aguardar deploy (~3 minutos)
3. Render vai mostrar a URL: `https://luna-trafego-backend.onrender.com`

---

### **Passo 5: Testar Backend**

Acessar: `https://luna-trafego-backend.onrender.com/health`

Deve retornar:
```json
{
  "status": "ok",
  "timestamp": "2026-07-14...",
  "environment": "production"
}
```

E nos logs deve aparecer:
```
✅ Conectado ao MySQL: historico_alphahall
🚀 Servidor Backend rodando...
```

---

### **Passo 6: Criar Frontend no Render**

1. **New** → **Static Site**
2. Conectar repositório: `PixelboxDesign/Gestao_de_trafego`
3. Configurações:
   - **Name:** `luna-trafego-frontend`
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`

4. **Environment Variables:**
   ```
   VITE_API_URL=https://luna-trafego-backend.onrender.com/api
   ```

5. Deploy

---

### **Passo 7: Atualizar FRONTEND_URL no Backend**

1. Voltar no Web Service do backend
2. **Environment** → Editar `FRONTEND_URL`
3. Trocar para: `https://luna-trafego-frontend.onrender.com`
4. Salvar (redeploy automático)

---

## ✅ Verificar se Funcionou

### **Backend:**
```
https://luna-trafego-backend.onrender.com/health
```

### **Frontend:**
```
https://luna-trafego-frontend.onrender.com
```

### **API (exemplo):**
```
https://luna-trafego-backend.onrender.com/api/clientes
```

---

## 🔍 Troubleshooting

### **Erro: "Erro ao conectar ao MySQL"**

**Causas:**
1. Tailscale não está ativo no seu PC
2. URL do Tailscale incorreta
3. VPS não está acessível

**Solução:**
```bash
# Verificar Tailscale
tailscale status

# Verificar se VPS está acessível via Tailscale
ping desktop-e6jr4dk.tailc1230a.ts.net

# Testar conexão MySQL via Tailscale
mysql -h desktop-e6jr4dk.tailc1230a.ts.net -u hawktec_alpha_log -p
```

### **Erro: "CORS"**

Verificar se `FRONTEND_URL` está correto no backend.

### **Erro: 503 Service Unavailable**

Render está hibernando (free tier). Primeiro acesso demora ~30 segundos.

---

## 🔄 Como Atualizar o Sistema

Sempre que fizer mudanças no código:

```bash
git add .
git commit -m "feat: descrição da mudança"
git push origin main
```

Render detecta e faz redeploy automático!

---

## 💡 Comparação com Projeto PixelBox Portal

| Item | PixelBox Portal | Luna Tráfego |
|------|----------------|--------------|
| Backend | Render Node | Render Node ✅ |
| Frontend | Render Static | Render Static ✅ |
| Database | VPS via Tailscale | VPS via Tailscale ✅ |
| Tailscale | PC como ponte | PC como ponte ✅ |
| Custo | R$ 0 | R$ 0 ✅ |

**Arquitetura idêntica!** 🎉

---

## 📝 Checklist Final

- [ ] Tailscale ativo no PC
- [ ] URL do Tailscale anotada
- [ ] Backend criado no Render
- [ ] Environment variables configuradas
- [ ] Backend testado (`/health`)
- [ ] Frontend criado no Render
- [ ] `VITE_API_URL` configurada
- [ ] `FRONTEND_URL` atualizada no backend
- [ ] Sistema funcionando!

---

## 🎯 Próximas Features

Depois que estiver funcionando, você pode me pedir:
- Adicionar autenticação
- Novos relatórios
- Integração com outras APIs
- Filtros avançados
- Exportação de dados
- E muito mais!

---

📅 Criado: 14/07/2026  
🏗️ Arquitetura: Render + Tailscale (PC como ponte)  
🔗 Igual ao: PixelBox Portal  
✅ Backend roda no Render 24/7
