# ❌ Erro: "Erro ao conectar ao MySQL"

## 🔍 Problema

O Render não consegue conectar ao MySQL via Tailscale porque:
- Render **não está** na sua rede Tailscale
- Somente seu PC está conectado ao Tailscale
- Render não pode acessar `desktop-e6jr4dk.tailc1230a.ts.net`

---

## ✅ Solução: Usar IP Direto do VPS

### **Passo 1: Atualizar Environment Variables no Render**

No Render Dashboard → Web Service → Environment:

```
DB_HOST=162.240.228.36
```

**Remover:**
```
❌ DB_HOST=desktop-e6jr4dk.tailc1230a.ts.net
```

---

### **Passo 2: Verificar Firewall do VPS**

O VPS precisa permitir conexões externas na porta 3306:

```bash
# Testar conexão do seu PC para o VPS
mysql -h 162.240.228.36 -P 3306 -u hawktec_alpha_log -pAlpha@3030 -e "SHOW DATABASES"
```

Se funcionar, o Render também vai conseguir conectar!

---

### **Passo 3: Configurar MySQL no VPS (se necessário)**

Se o teste acima **falhar**, você precisa configurar o MySQL no VPS:

#### **A. Editar my.cnf no VPS**

```bash
# Conectar no VPS via SSH
ssh usuario@162.240.228.36

# Editar configuração do MySQL
sudo nano /etc/mysql/my.cnf
```

Procurar e alterar:
```ini
[mysqld]
bind-address = 0.0.0.0
```

Se estiver `127.0.0.1`, trocar para `0.0.0.0`

#### **B. Permitir acesso do usuário**

```sql
-- Conectar no MySQL do VPS
mysql -u root -p

-- Permitir acesso externo para o usuário
GRANT ALL PRIVILEGES ON historico_alphahall.* TO 'hawktec_alpha_log'@'%' IDENTIFIED BY 'Alpha@3030';
FLUSH PRIVILEGES;
```

#### **C. Reiniciar MySQL**

```bash
sudo systemctl restart mysql
```

---

## 🔒 Opção Alternativa: Tunnel SSH

Se você **não quer** expor o MySQL publicamente, pode usar um tunnel SSH no Render.

### **Configurar no Render:**

```bash
# Adicionar variáveis de ambiente
DB_HOST=localhost
DB_PORT=3306

# E configurar um túnel SSH no start command
ssh -L 3306:localhost:3306 usuario@162.240.228.36 -N &
npm start
```

Mas isso é mais complexo e requer configurar chave SSH no Render.

---

## ✅ Solução Recomendada

### **1. Usar IP Direto (Mais Simples)**

No Render Environment:
```
DB_HOST=162.240.228.36
DB_PORT=3306
DB_USER=hawktec_alpha_log
DB_PASSWORD=Alpha@3030
DB_NAME=historico_alphahall
```

### **2. Verificar se VPS aceita conexões externas:**

```bash
mysql -h 162.240.228.36 -P 3306 -u hawktec_alpha_log -pAlpha@3030 -e "SELECT 1"
```

Se retornar `1`, está OK! ✅

Se der erro, configurar o VPS (Passo 3 acima).

---

## 🔄 Atualizar no Render

### **Passo a Passo:**

1. Acesse: https://dashboard.render.com
2. Abra seu Web Service: `luna-trafego-backend`
3. Vá em **Environment**
4. Editar `DB_HOST`:
   - Remover: `desktop-e6jr4dk.tailc1230a.ts.net`
   - Colocar: `162.240.228.36`
5. **Save**

O Render vai fazer redeploy automático.

---

## ✅ Verificar se Funcionou

Acessar:
```
https://luna-trafego-backend.onrender.com/health
```

Verificar nos logs:
```
✅ Conectado ao MySQL: historico_alphahall
```

---

## 📊 Comparação de Opções

| Opção | Vantagens | Desvantagens |
|-------|-----------|--------------|
| **IP Direto** | ✅ Simples<br>✅ Funciona 24/7<br>✅ Não depende do PC | ⚠️ MySQL exposto na internet<br>⚠️ Precisa configurar firewall |
| **Tailscale** | ✅ Seguro<br>✅ Não expõe MySQL | ❌ Não funciona no Render<br>❌ Render não pode entrar na rede Tailscale |
| **SSH Tunnel** | ✅ Seguro<br>✅ MySQL não exposto | ❌ Mais complexo<br>❌ Precisa configurar chaves SSH |

---

## 🎯 Recomendação Final

Use **IP Direto** para simplificar:

1. ✅ Atualizar `DB_HOST=162.240.228.36` no Render
2. ✅ Verificar firewall do VPS (porta 3306)
3. ✅ Testar conexão do seu PC
4. ✅ Redeploy no Render
5. ✅ Verificar logs

---

📅 Criado: 14/07/2026  
🔧 Troubleshooting: Conexão MySQL no Render
