# 🚀 Como Fazer Deploy do Frontend no Render

## 📋 Passo a Passo Completo

### **Passo 1: Criar Static Site no Render**

1. Acesse: https://dashboard.render.com
2. Clique em **"New +"** → **"Static Site"**

---

### **Passo 2: Conectar Repositório**

1. **Connect a repository:**
   - Escolha: **GitHub**
   - Selecione: `PixelboxDesign/Gestao_de_trafego`
   - Clique em **"Connect"**

---

### **Passo 3: Configurações do Site**

Preencha os campos:

| Campo | Valor |
|-------|-------|
| **Name** | `luna-trafego-frontend` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

---

### **Passo 4: Adicionar Environment Variable**

Clique em **"Advanced"** → **"Add Environment Variable"**

**Variável obrigatória:**

```
Key: VITE_API_URL
Value: https://gestao-de-trafego.onrender.com/api
```

⚠️ **IMPORTANTE:** Use a URL do seu backend que já está rodando!

---

### **Passo 5: Criar o Site**

1. Clique em **"Create Static Site"**
2. Aguarde o build (~3-5 minutos)
3. O Render vai:
   - ✅ Clonar o repositório
   - ✅ Instalar dependências (`npm install`)
   - ✅ Fazer build do Vite (`npm run build`)
   - ✅ Publicar a pasta `dist`

---

### **Passo 6: Copiar URL do Frontend**

Após o deploy, você vai ter uma URL tipo:
```
https://luna-trafego-frontend.onrender.com
```

**Copie essa URL!**

---

### **Passo 7: Atualizar FRONTEND_URL no Backend**

1. Volte para o **Web Service** do backend
2. Vá em **Environment**
3. Editar a variável **FRONTEND_URL**:
   ```
   FRONTEND_URL=https://luna-trafego-frontend.onrender.com
   ```
4. **Save Changes**

O backend vai fazer redeploy automático (~1 min)

---

## ✅ Verificar se Funcionou

### **1. Acessar o Frontend**
```
https://luna-trafego-frontend.onrender.com
```

Deve aparecer a página com:
- ✅ Menu lateral (Dashboard, Clientes, Pedidos, etc.)
- ✅ Página "Clientes" mostrando lista completa
- ✅ Cards com estatísticas (Total, Fontes, Filtrados)

### **2. Testar Funcionalidades**

1. ✅ **Buscar cliente:** Digite um nome na caixa de busca
2. ✅ **Filtrar por fonte:** Selecione uma fonte no dropdown
3. ✅ **Exportar CSV:** Clique no botão "Exportar CSV"
4. ✅ **Recarregar:** Clique em "Recarregar"

---

## 📊 Estrutura Completa

Após o deploy, você terá:

```
┌─────────────────────────────┐
│  Frontend (Static Site)     │
│  React + Vite               │
│  luna-trafego-frontend      │
│  https://...onrender.com    │
└──────────┬──────────────────┘
           │
           │ API Calls
           │
┌──────────▼──────────────────┐
│  Backend (Web Service)      │
│  Node.js + Express          │
│  gestao-de-trafego          │
│  https://...onrender.com    │
└──────────┬──────────────────┘
           │
           │ Via IP Direto
           │
┌──────────▼──────────────────┐
│  VPS MySQL                  │
│  162.240.228.36             │
│  hawktec_alpha-ecommerce    │
└─────────────────────────────┘
```

---

## 🔧 Troubleshooting

### **Erro: "Failed to fetch"**

**Causa:** Frontend não consegue acessar o backend

**Solução:**
1. Verificar se `VITE_API_URL` está correta
2. Verificar se backend está rodando
3. Verificar CORS no backend (já configurado)

### **Build Falhou**

**Causa:** Erro no código ou dependências

**Solução:**
1. Verificar logs do Render
2. Testar build localmente: `npm run build` na pasta `frontend`
3. Corrigir erros e fazer novo push

### **Página em Branco**

**Causa:** Erro de JavaScript no navegador

**Solução:**
1. Abrir DevTools (F12)
2. Ver erros no Console
3. Verificar se `VITE_API_URL` foi configurada

---

## 🎨 Funcionalidades do Frontend

### **Página "Clientes"**

✅ **Cards de Resumo:**
- Total de clientes encontrados
- Número de fontes de dados
- Total de clientes filtrados

✅ **Filtros:**
- 🔍 Busca por nome, email ou cidade
- 📊 Filtro por fonte de dados
- 🔄 Botão recarregar

✅ **Tabela:**
- Nome do cliente
- Fonte de dados (com badge colorido)
- Email
- Cidade
- Estado

✅ **Exportar:**
- 📥 Exportar para CSV
- Inclui todos os clientes filtrados
- Nome do arquivo: `clientes-luna-YYYY-MM-DD.csv`

---

## 📝 Configurações Importantes

### **package.json (Frontend)**
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

### **vite.config.js**
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
})
```

---

## ⚡ Performance

### **Build Time:**
- ⏱️ ~2-3 minutos (primeira vez)
- ⏱️ ~1-2 minutos (builds subsequentes)

### **Deploy Automático:**
- ✅ Cada push para `main` no GitHub
- ✅ Render detecta automaticamente
- ✅ Faz novo build e deploy

---

## 🎯 Checklist Final

- [ ] Static Site criado no Render
- [ ] Root Directory = `frontend`
- [ ] Build Command = `npm install && npm run build`
- [ ] Publish Directory = `dist`
- [ ] Environment Variable `VITE_API_URL` configurada
- [ ] Build bem-sucedido (verde)
- [ ] Frontend acessível na URL
- [ ] Backend `FRONTEND_URL` atualizada
- [ ] CORS funcionando (sem erros no console)
- [ ] Página "Clientes" carregando dados
- [ ] Busca funcionando
- [ ] Filtros funcionando
- [ ] Exportar CSV funcionando

---

## 🌐 URLs Finais

**Backend:**
```
https://gestao-de-trafego.onrender.com
```

**Frontend:**
```
https://luna-trafego-frontend.onrender.com
```

**API Endpoint (Todos Clientes):**
```
https://gestao-de-trafego.onrender.com/api/todos-clientes
```

---

📅 Criado: 14/07/2026  
🚀 Deploy: Frontend React + Vite  
✅ Pronto para produção!
