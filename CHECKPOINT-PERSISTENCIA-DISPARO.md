# ✅ CHECKPOINT: Persistência de Configuração do Disparo

**Data:** 15/05/2026 15:40  
**Commit:** `5f55855`  
**Status:** ⚠️ REQUER EXECUÇÃO DE SQL NO BANCO

---

## 🎯 O que foi implementado

### 1. **API REST para Configuração do Disparo**
Criadas 2 novas rotas no backend Rust/Tauri:

- **POST `/api/disparos/config`** - Salva configuração do disparo
- **GET `/api/disparos/config`** - Retorna configuração salva

### 2. **Tabela no Banco de Dados**
Arquivo criado: `backend/sql/create_app_disparo_config.sql`

Estrutura da tabela:
- `id` - ID autoincrement
- `mensagem` - Mensagem do disparo (TEXT)
- `item_id` - ID do kit/produto selecionado
- `item_tipo` - "kit" ou "produto"
- `item_nome` - Nome do item
- `item_thumb_url` - URL da thumbnail
- `quantidade` - Quantidade de mensagens
- `intervalo_valor` - Valor do intervalo (ex: 1.5)
- `intervalo_unidade` - "horas" ou "minutos"
- `criado_em` - Data de criação
- `atualizado_em` - Data de última atualização

### 3. **Frontend Atualizado**
- Botão "💾 Salvar Configuração" agora envia para API
- Ao recarregar página, busca configuração da API
- Fallback para localStorage se API não estiver disponível
- Botões "🔄 Alterar" e "✕ Remover" no item selecionado

---

## ⚠️ AÇÃO NECESSÁRIA: Criar Tabela no Banco

### Opção 1: Via PHPMyAdmin (Recomendado)

1. Acesse: http://vps.hawktecnologia.com/phpmyadmin
2. **Usuário:** `hawktec_alpha_log`
3. **Senha:** `Alpha@3030`
4. Selecione o banco de dados
5. Vá em "SQL"
6. Cole o script abaixo e execute:

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

### Opção 2: Via Linha de Comando

```bash
mysql -h ns1.hawktecnologia.com -u hawktec_alpha_log -p -P 3306 < backend/sql/create_app_disparo_config.sql
# Senha: Alpha@3030
```

---

## 🧪 Como Testar

1. **Execute o SQL no banco** (acima)

2. **Reinicie o Luna Server:**
   ```bash
   cd f:\luna_cosmeticos\backend
   INICIAR-LUNA-SERVER-COMPLETO.bat
   ```

3. **No site (luna-disparo.onrender.com):**
   - Digite uma mensagem
   - Selecione um kit/produto
   - Configure quantidade e intervalo
   - Clique em "💾 Salvar Configuração"
   - Deve aparecer "✓ Configuração Salva!"

4. **Recarregue a página (F5):**
   - Todos os campos devem voltar com os valores salvos
   - Item selecionado deve aparecer com botões "Alterar" e "Remover"

5. **No Painel de Controle (Desktop):**
   - A configuração também deve aparecer lá
   - (Nota: o painel Desktop precisa ser atualizado para buscar da API)

---

## 📁 Arquivos Modificados

### Backend (Rust)
- `backend/src-tauri/src/api/disparos.rs` - Funções `salvar_config()` e `obter_config()`
- `backend/src-tauri/src/api/mod.rs` - Registra rotas `/api/disparos/config`
- `backend/sql/create_app_disparo_config.sql` - SQL para criar tabela

### Frontend
- `frontend/disparo/public/index.html`
  - Função `salvarConfigDisparoManual()` - POST para API
  - Função `carregarConfigDisparo()` - GET da API
  - Mantém fallback para localStorage

---

## 🔄 Fluxo de Persistência

```
[ Usuario clica "Salvar" ]
         ↓
[ Frontend: POST /api/disparos/config ]
         ↓
[ Backend Rust: salvar_config() ]
         ↓
[ MySQL: INSERT ou UPDATE em app_disparo_config ]
         ↓
[ Response: { ok: true } ]
         ↓
[ Frontend: Mostra "✓ Configuração Salva!" ]


[ Usuario recarrega página ]
         ↓
[ Frontend: GET /api/disparos/config ]
         ↓
[ Backend Rust: obter_config() ]
         ↓
[ MySQL: SELECT FROM app_disparo_config ]
         ↓
[ Response: { ok: true, config: {...} } ]
         ↓
[ Frontend: Preenche campos com dados salvos ]
```

---

## 🐛 Troubleshooting

### Erro: "Failed to fetch /api/disparos/config"
- Verifique se o Luna Server está rodando
- Verifique se o Cloudflare Tunnel está ativo
- Verifique logs no Luna Server

### Erro: "Table 'app_disparo_config' doesn't exist"
- Execute o SQL de criação da tabela (acima)

### Configuração não persiste ao recarregar
- Verifique se o SQL foi executado no banco
- Verifique se o Luna Server foi reiniciado após adicionar as rotas
- Veja console do navegador (F12) para erros

### Painel de Controle não mostra configuração
- O painel Desktop precisa ser atualizado para buscar `/api/disparos/config`
- Por enquanto, apenas o site web persiste configuração

---

## 📝 Próximos Passos

1. ✅ Executar SQL no banco de dados
2. ✅ Reiniciar Luna Server
3. ✅ Testar no site
4. ⏳ Atualizar painel Desktop (Tauri) para buscar config da API
5. ⏳ Adicionar sincronização em tempo real (WebSocket)

---

## ✅ Checklist

- [ ] SQL executado no banco
- [ ] Luna Server reiniciado
- [ ] Testado salvar configuração
- [ ] Testado recarregar página
- [ ] Configuração persistiu corretamente
- [ ] Botões "Alterar" e "Remover" funcionando

---

**🎯 Objetivo:** Configuração do disparo persiste no banco de dados e sincroniza entre site e painel de controle.

**Localização do SQL:** `f:\luna_cosmeticos\backend\sql\create_app_disparo_config.sql`

**Conexão do Banco:**
- Host: `ns1.hawktecnologia.com` ou `162.240.228.36`
- Porta: `3306`
- Usuário: `hawktec_alpha_log`
- Senha: `Alpha@3030`
