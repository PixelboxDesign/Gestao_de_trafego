# 🚀 Como Deployar o Site Estático no Render

## ⚠️ PROBLEMA ATUAL

O site está com URL antiga hardcoded no JavaScript porque a variável `VITE_API_BASE_URL` só é injetada **DURANTE O BUILD**, não em runtime.

Quando você muda a variável no Render, o site NÃO rebuilda automaticamente.

---

## ✅ SOLUÇÃO IMEDIATA (2 opções)

### **Opção 1: Forçar Rebuild no Render (RECOMENDADO)**

1. Acesse: https://dashboard.render.com/web/srv-d9roha7avr4c739pjlu0
2. Clique em **"Manual Deploy"** → **"Deploy latest commit"**
3. Aguarde ~2-5 minutos
4. Teste: https://luna-disparo.onrender.com

**OU**

1. Vá em **Settings** → **Build & Deploy**
2. Clique em **"Clear build cache & deploy"**
3. Aguarde ~2-5 minutos

---

### **Opção 2: Trigger Deploy via API**

Execute no PowerShell:

```powershell
cd f:\luna_cosmeticos\backend

$apiKey = "SUA_API_KEY_AQUI"
$serviceId = "srv-d9roha7avr4c739pjlu0"

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

$body = @{
    clearCache = "clear"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.render.com/v1/services/$serviceId/deploys" `
    -Headers $headers `
    -Method POST `
    -Body $body
```

---

## 🔧 CONFIGURAÇÃO PERMANENTE

Para evitar esse problema no futuro, você tem 3 opções:

### **A) Build local + Push (Atual)**

1. Toda vez que a URL do Cloudflare mudar:
   ```powershell
   $env:VITE_API_BASE_URL = "https://sua-nova-url.trycloudflare.com"
   npm run build
   ```

2. Commit e push do `dist/`:
   ```bash
   git add dist/
   git commit -m "Update build with new Cloudflare URL"
   git push
   ```

3. Render detecta e deploya automaticamente

---

### **B) Runtime Config (Melhor opção)**

Modificar o site para buscar a URL em runtime via `window` ou API:

```typescript
// config.ts
export const API_BASE_URL = 
  // 1. Tenta pegar de window (injetado pelo servidor)
  (window as any).__API_URL__ ||
  // 2. Tenta variável de ambiente (build time)
  import.meta.env.VITE_API_BASE_URL ||
  // 3. Fallback para localhost
  'http://localhost:3001';
```

E no `index.html` injetar via script:
```html
<script>
  window.__API_URL__ = '<%= VITE_API_BASE_URL %>';
</script>
```

---

### **C) Cloudflare Tunnel Permanente**

Use um tunnel **named** ao invés de **quick**:

```bash
cloudflared tunnel create luna-server
cloudflared tunnel route dns luna-server luna.seudominio.com
cloudflared tunnel run luna-server
```

URL fixa: `https://luna.seudominio.com` (nunca muda!)

---

## 📋 CHECKLIST DE DEPLOY

- [ ] URL do Cloudflare atualizada no Render (`VITE_API_BASE_URL`)
- [ ] Build gerado com URL correta (`npm run build` com env var)
- [ ] Deploy triggerado no Render (manual ou via API)
- [ ] Aguardar 2-5 minutos
- [ ] Testar: https://luna-disparo.onrender.com
- [ ] Verificar console do navegador (deve mostrar URL correta no log)

---

## 🐛 TROUBLESHOOTING

**Site ainda mostra "servidor inacessível"?**

1. Abra DevTools (F12) → Console
2. Procure por `[Config] API Base URL:`
3. Se mostrar URL antiga, o build não foi atualizado
4. Force rebuild no Render

**Render não está buildando?**

1. Verifique se tem `package.json` no repositório
2. Verifique se o **Build Command** está: `npm install && npm run build`
3. Verifique se o **Publish Directory** está: `dist`

**URL do Cloudflare muda toda hora?**

É normal para Quick Tunnels. Considere usar Named Tunnel (opção C acima).

---

## 📞 SUPORTE

Se nada funcionar:
1. Verifique logs do Render: https://dashboard.render.com/web/srv-d9roha7avr4c739pjlu0/logs
2. Verifique variáveis: https://dashboard.render.com/web/srv-d9roha7avr4c739pjlu0/env
3. Teste a URL do Cloudflare diretamente: `https://sua-url.trycloudflare.com/health`
