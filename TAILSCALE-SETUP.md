# 🔐 Configurar Tailscale - Render ↔ VPS

## O Que É?

Tailscale cria uma VPN privada que conecta o Render ao seu VPS como se estivessem na mesma rede local.

**Vantagem:** Não precisa expor MySQL na internet nem liberar IPs no firewall!

---

## 📋 Passo a Passo Completo:

### **1. Instalar Tailscale no VPS**

Conecte via SSH no VPS (`162.240.228.36`):

```bash
# Instalar Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Iniciar Tailscale
sudo tailscale up

# Vai aparecer um link - copie e cole no navegador para autorizar
```

Após autorizar, anote o **IP do Tailscale** do VPS:

```bash
tailscale ip -4
# Exemplo: 100.64.1.5
```

---

### **2. Gerar Authkey do Tailscale**

1. Acesse: https://login.tailscale.com/admin/settings/keys
2. Clique: **"Generate auth key"**
3. Configurar:
   - ✓ **Reusable** (para poder redeployar)
   - ✓ **Ephemeral** (remove automaticamente quando desconectar)
   - Expiration: **90 days**
4. Copiar o authkey (exemplo: `tskey-auth-xxxxxxxxxxxx`)

---

### **3. Configurar Render para usar Docker**

No Render, você precisa mudar de **Web Service** para **Docker**:

#### Opção A: Criar novo serviço (recomendado)

1. Dashboard Render → **New** → **Web Service**
2. Conectar repo: `PixelboxDesign/Gestao_de_trafego`
3. **Runtime:** Selecionar **Docker**
4. **Dockerfile Path:** `./Dockerfile`
5. **Docker Command:** (deixar vazio - usa CMD do Dockerfile)

#### Opção B: Converter serviço existente

No serviço atual:
1. Settings → **Environment** → **Docker**
2. Dockerfile Path: `./Dockerfile`

---

### **4. Adicionar Variáveis de Ambiente no Render**

No Render, adicionar estas variáveis:

```bash
# Tailscale
TAILSCALE_AUTHKEY=tskey-auth-xxxxxxxxxxxx

# Database (usar IP do Tailscale do VPS)
DB_HOST=100.64.1.5
DB_PORT=3306
DB_USER=hawktec_alpha_log
DB_PASSWORD=Alpha@3030
DB_NAME=historico_alphahall

# Node
NODE_ENV=production
PORT=10000

# Frontend (adicionar depois)
FRONTEND_URL=https://seu-frontend.onrender.com
```

⚠️ **Importante:** O `DB_HOST` deve ser o **IP do Tailscale do VPS** (começa com `100.`), não o IP público!

---

### **5. Commit e Push**

Os arquivos `Dockerfile` e `start.sh` já foram criados. Agora precisa fazer commit:

```bash
git add Dockerfile start.sh TAILSCALE-SETUP.md
git commit -m "feat: adicionar Tailscale para conexao segura com VPS"
git push origin main
```

Render vai detectar e fazer redeploy automático.

---

### **6. Verificar Conexão**

Nos logs do Render, você deve ver:

```
✅ Tailscale conectado
✅ Conectado ao MySQL: historico_alphahall
🚀 Servidor Backend rodando...
```

---

## 🔍 Troubleshooting:

### "Tailscale não conecta"
- Verificar se authkey está correto
- Authkey deve ter permissão "Reusable"
- Verificar logs: `tailscale status`

### "MySQL connection refused"
- Verificar IP do Tailscale do VPS: `tailscale ip -4`
- Verificar se MySQL está aceitando conexões: `netstat -tulpn | grep 3306`
- MySQL deve escutar em `0.0.0.0` ou no IP do Tailscale

### "Erro de permissão no MySQL"
Precisa criar usuário que aceita conexão do Tailscale:

```sql
-- No VPS, conecte no MySQL
mysql -u root -p

-- Criar usuário para Tailscale (substitua 100.64.% pela sua subnet)
CREATE USER 'hawktec_alpha_log'@'100.64.%' IDENTIFIED BY 'Alpha@3030';
GRANT ALL PRIVILEGES ON historico_alphahall.* TO 'hawktec_alpha_log'@'100.64.%';
FLUSH PRIVILEGES;
```

---

## 🎯 Alternativa Mais Simples:

Se Tailscale der trabalho, use **Railway** (banco MySQL grátis):

1. https://railway.app
2. New Project → MySQL
3. Copiar credenciais
4. Colar no Render
5. Pronto! (sem VPN, sem firewall)

---

## 📊 Comparação:

| Método | Complexidade | Custo | Latência |
|--------|--------------|-------|----------|
| Tailscale + VPS | Média | R$ 0 | Baixa |
| Railway MySQL | Baixa | R$ 0* | Média |
| Expor MySQL VPS | Baixa | R$ 0 | Baixa |

*Railway: Grátis até 500MB + 5GB tráfego/mês

---

## 🚀 Próximos Passos:

1. ✅ Instalar Tailscale no VPS
2. ✅ Gerar authkey
3. ✅ Fazer commit dos arquivos Docker
4. ✅ Configurar variáveis no Render
5. ✅ Deploy!

---

📅 Criado: 14/07/2026  
🔐 Solução: VPN mesh privada entre Render e VPS  
⚡ Benefício: MySQL privado, sem exposição na internet
