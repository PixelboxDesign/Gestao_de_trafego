# WhatsApp Integration - Luna Server

## Como Funciona

O Luna Server integra WhatsApp Web através de um **sidecar Node.js** que roda em background na porta 3002.

### Arquitetura

```
Luna Server (Rust/Tauri) → Porta 3001 (API REST)
     ↓
WhatsApp Sidecar (Node.js) → Porta 3002 (whatsapp-web.js)
     ↓
Sessão Persistente → whatsapp-sidecar/sessao-whatsapp/
```

### Inicialização Automática

Quando você inicia o Luna Server através do shortcut ou executável, o sistema:

1. **Mata processos anteriores** (luna-server.exe, node.exe, cloudflared.exe)
2. **Inicia o WhatsApp sidecar** em background na porta 3002
3. **Inicia o Luna Server** que expõe a API na porta 3001
4. **O sidecar gera o QR Code** automaticamente se ainda não houver sessão autenticada

### Sessão Persistente

A sessão do WhatsApp é salva em `whatsapp-sidecar/sessao-whatsapp/`. Isso significa:

- ✅ **Primeira vez**: Escaneia o QR Code com seu WhatsApp
- ✅ **Próximas vezes**: Conecta automaticamente sem precisar escanear novamente
- ✅ **Comportamento igual ao WhatsApp Web**

Se você clicar em "Desconectar" na aba WhatsApp, a sessão será removida e um novo QR Code será gerado.

### Scripts Disponíveis

#### `INICIAR-LUNA-SERVER-COMPLETO.bat` (RECOMENDADO)
Inicia o sistema completo:
- WhatsApp sidecar (porta 3002)
- Luna Server (porta 3001)
- Cloudflare Tunnel (expõe publicamente)

#### `copy-sidecar.bat`
Copia o sidecar WhatsApp para o diretório do executável após build.
Executado automaticamente durante o build.

### Endpoints da API

#### GET `/api/whatsapp/status`
Retorna status da conexão WhatsApp:
```json
{
  "status": "qr" | "connected" | "connecting" | "disconnected" | "error",
  "qr_base64": "data:image/png;base64,...",
  "numero": "5511999999999",
  "erro": null
}
```

#### POST `/api/whatsapp/desconectar`
Desconecta o WhatsApp e remove a sessão salva.

#### POST `/api/whatsapp/send`
Envia uma mensagem via WhatsApp:
```json
{
  "numero": "5511999999999",
  "mensagem": "Olá!"
}
```

### Como Fazer Build

```bash
cd f:\luna_cosmeticos\backend

# Build completo (frontend + backend)
npm run tauri build

# Copiar sidecar para diretório do executável
.\copy-sidecar.bat
```

O executável final estará em:
```
backend\src-tauri\target\release\luna-server.exe
```

### Troubleshooting

#### QR Code não aparece

1. Verifique se a porta 3002 está livre:
   ```bash
   Test-NetConnection -ComputerName localhost -Port 3002
   ```

2. Inicie o sidecar manualmente para ver erros:
   ```bash
   cd backend\whatsapp-sidecar
   node server.js
   ```

#### Sessão desconecta sozinha

Isso pode acontecer se:
- O WhatsApp no celular foi desconectado
- Passou muito tempo sem usar (inatividade)
- O celular ficou offline

Basta escanear o QR Code novamente.

#### Porta 3002 já está em uso

Mate o processo Node.js antigo:
```bash
taskkill /F /IM node.exe
```

Depois reinicie o sistema.

### Dependências

O sidecar precisa de:
- **Node.js** instalado no sistema (disponível no PATH)
- **whatsapp-web.js**: biblioteca que emula WhatsApp Web
- **qrcode**: gera o QR Code em base64
- **express**: servidor HTTP para a API

Todas as dependências estão em `whatsapp-sidecar/node_modules/` e são copiadas automaticamente durante o build.
