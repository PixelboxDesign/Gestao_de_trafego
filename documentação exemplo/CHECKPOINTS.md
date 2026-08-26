# PIXELBOX PORTAL — CHECKPOINTS PERMANENTES

> **Este arquivo é o registro oficial de todos os marcos de estabilidade do sistema.**
>
> **Regras:**
> - ❌ **NUNCA remova um checkpoint** — eles são o histórico de versões estáveis
> - ✅ Cada checkpoint possui commit de referência para rollback seguro
> - ✅ Novos checkpoints são adicionados no topo (mais recente primeiro)
> - ✅ Consulte `ARQUITETURA_SISTEMA.md` para detalhes técnicos de cada feature
> - ✅ Consulte `README.md` para visão geral do sistema

---

## ÍNDICE DE CHECKPOINTS

| Versão | Data | Título | Commit original | Commit atual | Amends |
|---|---|---|---|---|---|
| [v4.7.0](#checkpoint-v470) | 12/07/2026 | Sistema de Alterações Automáticas + Identidade Visual de Status | `eee1709` | `eee1709` | — |
| [v4.6.0](#checkpoint-v460) | 30/07/2026 | Sistema de Backup MariaDB com Logs Detalhados | `5522569` | **`79db78c`** ← usar este | [a1](#v460-amend-1-correção-env-completo) |
| [v4.5.0](#checkpoint-v450) | 27/07/2026 | Filtros Dashboard + Navegação para Projetos + Status Cortesia | `1c71344` | **`24b6f0e`** ← usar este | [a1](#v450-amend-1-documentação-stack-e-correções) |
| [v4.4.0](#checkpoint-v440) | 23/07/2026 | Valor por Alteração nos Projetos | `a2374ee` | `a2374ee` | — |
| [v4.3.0](#checkpoint-v430) | 19/07/2026 | Limpeza + Dashboard de Banda + Regras de Negócio | `f1ce1bd` | `f1ce1bd` | — |
| [v4.2.0](#checkpoint-v420) | 19/07/2026 | Migração de Infraestrutura Render | `cab439f` | `cab439f` | — |
| [v4.1.0](#checkpoint-v410) | 17/07/2026 | WhatsApp Large File Support | `0821369` | `0821369` | — |
| [v4.0.0](#checkpoint-v400) | 17/07/2026 | Sistema de Downloads Resilientes | `f40ddca` | `f40ddca` | — |

> ⚠️ **Regra de restauração:** Sempre use o **Commit atual** para rollback. Quando há amends, o commit original deixa de existir no Git e é substituído pelo mais recente.

---

## CHECKPOINT v4.7.0

**Título:** Sistema de Alterações Automáticas + Identidade Visual de Status + Melhorias de UX

**Data:** 12/07/2026 | **Commit:** `eee1709` | **Status:** ✅ ESTÁVEL

**O que foi implementado:**

### 1. **Sistema de Alterações Gratuitas e Cobrança Automática**

**Regra de negócio:**
- Primeiras 5 versões de aprovação são **gratuitas**
- A partir da 6ª versão: cobra automaticamente **30% do valor da arte por alteração**
- Cálculo: `(total_versões - 5) × (valor_arte × 0.30)`
- Admin pode ajustar manualmente porcentagem ou valor

**Botão "Auto" (verde com ícone $):**
- Aparece ao lado do botão "Editar" na seção Alterações
- Calcula automaticamente quando há 6+ versões
- Validações:
  - Se ≤5 versões: toast informativo "Ainda dentro das 5 alterações gratuitas"
  - Se valor = 0: toast erro "Projeto sem valor definido"
- Após cálculo: mostra toast com resultado "3× R$ 15,00 (30%)"
- Atualiza via `qc.invalidateQueries()` sem reload da página

**Campo de porcentagem editável:**
- Padrão: 30%
- Sincronização bidirecional:
  - Mudar % → recalcula valor: `(valor_arte × %) / 100`
  - Mudar valor → recalcula %: `(valor / valor_arte) × 100`
- Admin pode ajustar conforme negociação com cliente

**Contador de alterações gratuitas no WhatsApp:**
- Mensagem customizada por versão:
  - **Versão 1:** "Primeira versão. Você tem 5 alterações gratuitas restantes."
  - **Versões 2-5:** "Versão X (Alteração Y). Ainda restam N alterações gratuitas."
  - **Versão 6+:** "Versão X (Alteração Y). Alterações gratuitas esgotadas. Valor adicional: R$ XXX (30% por alteração)."
- Cliente sempre ciente de quantas alterações gratuitas restam

**Arquivos modificados:**
```
backend/src/controllers/whatsapp.controller.ts
  — shareApprovalVersion() com lógica de contador de alterações
  — Mensagem customizada por faixa de versão (1, 2-5, 6+)

frontend/src/pages/admin/ProjectDetail.tsx
  — Botão "Auto" com validações e cálculo
  — Campo de porcentagem sincronizado com valor
  — handlePercentChange() e handleValueChange() bidirecionais
  — qc.invalidateQueries() sem reload
```

### 2. **Botão Colar Imagem da Área de Transferência**

**Funcionalidade:**
- Novo botão "Colar" ao lado de "Selecionar arquivos" no upload de aprovação
- Lê imagem diretamente do clipboard com `navigator.clipboard.read()`
- Suporta Ctrl+C + Ctrl+V de screenshots ou imagens copiadas
- Gera nome automático: `clipboard-[timestamp].[extensão]`
- Detecta tipo MIME automaticamente (png, jpg, gif, webp)

**Use case:**
- Admin dá print screen (Win+Shift+S ou PrtScn)
- Abre projeto → Modelos para Aprovação
- Clica "Colar" → imagem aparece como preview
- Envia versão sem precisar salvar arquivo no disco

**Arquivos modificados:**
```
frontend/src/components/ui/ProjectApprovalSection.tsx
  — Botão "Colar" com ícone de clipboard
  — handlePasteFromClipboard() lê clipboard API
  — Converte blob para File com nome automático
```

### 3. **Card Inteiro Clicável + Botão Duplicar Projeto**

**Melhorias de UX:**
- ❌ **Removido:** botão olhinho (Eye) dos cards de projeto
- ✅ **Card inteiro clicável:** clicar em qualquer lugar abre o detalhe do projeto
- ✅ **Botão caneta (Pencil)** permanece para edição inline
- ✅ **Novo botão "Duplicar"** na página de detalhe do projeto

**Botão Duplicar:**
- Abre modal de criação com todos os campos preenchidos:
  - Cliente
  - Título (com sufixo " - Cópia")
  - Descrição
  - Empresa
  - Prioridade
  - Valor
  - Data de entrega
- Admin pode ajustar antes de criar
- Útil para projetos recorrentes ou variações de um mesmo trabalho

**Arquivos modificados:**
```
frontend/src/pages/admin/Projects.tsx
  — Card inteiro com onClick → navigate
  — Botão Eye removido
  — Botão Pencil preservado com stopPropagation

frontend/src/pages/admin/ProjectDetail.tsx
  — Botão "Duplicar" no header
  — handleDuplicate() abre modal com dados preenchidos
```

### 4. **Identidade Visual Única para Cada Status**

**Problema anterior:**
Vários status tinham cores iguais ou muito similares — difícil diferenciar visualmente.

**Solução:**
Cada status agora tem uma cor única e significativa que representa seu contexto:

| Status | Cor | Significado Visual |
|--------|-----|-------------------|
| 🆕 **Recebido** | Cinza azulado (`slate-600`) | Novo projeto, ainda não iniciado |
| 🔍 **Em análise** | Azul (`blue-600`) | Estudando requisitos, analisando |
| 💻 **Em desenvolvimento** | Roxo (`purple-600`) | Criando, desenvolvendo |
| ⏳ **Aguardando aprovação** | Amarelo (`yellow-600`) | Esperando decisão do cliente |
| 🔄 **Em revisão** | Laranja (`orange-600`) | Ajustando, corrigindo feedback |
| ✅ **Finalizado** | Verde escuro (`emerald-600`) | Pronto, completo, aprovado |
| 📦 **Entregue** | Verde claro (`green-600`) | Enviado ao cliente |
| ❌ **Cancelado** | Vermelho (`red-600`) | Parado, não vai acontecer |
| 💰 **Pendente pagamento** | Âmbar/Dourado (`amber-600`) | Aguardando pagamento |
| ✔️ **Pago** | Ciano (`cyan-600`) | Dinheiro recebido |
| 🔁 **Reaberto** | Rosa/Magenta (`pink-600`) | Voltou, reabertura |
| 🎁 **Cortesia** | Índigo (`indigo-600`) | Presente, trabalho grátis |

**Tom de cor ajustado:**
- Base: `-600` (mais saturado)
- Background: `/20` opacity
- Text: `-300` (mais claro para contraste)
- Border: `-500/40` (meio termo)

**Aplicado em:**
- ✅ Frontend Admin — cards de projetos e badges
- ✅ Frontend Clientes — cards de projetos e badges
- ✅ Consistência visual em ambos os portais

**Arquivos modificados:**
```
frontend/src/utils/index.ts
  — PROJECT_STATUS_COLORS com 12 cores únicas

apps/clientes/src/utils/index.ts
  — PROJECT_STATUS_COLORS sincronizado com admin
```

**Reverter:**
```bash
git checkout eee1709
git checkout -b rollback-v4.7.0
```

**Validação:**
1. ✅ Botão "Auto" calcula corretamente após 6ª versão
2. ✅ Porcentagem e valor sincronizam bidirecionalmente
3. ✅ Mensagem WhatsApp mostra contador de alterações gratuitas
4. ✅ Botão "Colar" lê imagem do clipboard com sucesso
5. ✅ Card inteiro clicável e botão "Duplicar" funcional
6. ✅ 12 status com cores únicas e significativas
7. ✅ Cores consistentes entre admin e clientes

**Funcionalidades garantidas (além das anteriores):**
- ✅ Sistema de cobrança automática de alterações (5 gratuitas + 30%)
- ✅ UX melhorada com card clicável e duplicação de projetos
- ✅ Upload via clipboard sem salvar arquivo no disco
- ✅ Identidade visual clara para cada status
- ✅ Todos os checkpoints anteriores preservados

**Commits incluídos neste checkpoint:**
```
eee1709 — feat: cores unicas e significativas para cada status
0f40026 — fix: remove reload automatico e simplifica botao Auto
744ac9c — debug: adiciona logs backend para revision_value e revision_qty
ebabe1b — debug: adiciona logs COMPLETOS do FormData e resposta do servidor
9f73684 — fix: adiciona reload forcado apos calculo automatico
fe93aed — debug: adiciona logs e refetch no botao Auto
dcb0d44 — feat: botao Auto para calculo manual de revisao 30%
0a93241 — feat: adiciona botao manual auto-calcular + logs detalhados
7743e20 — debug: adiciona logs detalhados no calculo automatico
9c29b12 — chore: trigger render redeploy
340fdfd — feat: calculo automatico de revisao com porcentagem editavel
92c2046 — fix: corrige nome do metodo para listApprovalVersions
8c9ab58 — feat: calculo automatico de revisao + contador alteracoes gratuitas
fb9fdf0 — feat: botao colar imagem da area de transferencia
bad01bd — feat: card inteiro clicavel + botao duplicar projeto
```

---

## CHECKPOINT v4.6.0

**Título:** Sistema de Backup MariaDB com Logs Detalhados + Supervisor Melhorado

**Data:** 30/07/2026 | **Commit original:** `5522569` | **Commit atual:** `79db78c` | **Status:** ✅ ESTÁVEL

**O que foi implementado:**

1. **Sistema de Backup Completo do MariaDB**
   - Botão "Backup do Servidor" na aba SUPERVISÃO do Supervisor desktop
   - Executa `mysqldump` com todos os bancos, routines, events, triggers, single-transaction
   - Backup incremental com timestamp legível: `backup_completo_YYYY-MM-DD_HHhMMmSSs.sql`
   - Armazenamento: `F:\backup_server\`
   - Política de retenção: mantém apenas os 3 backups mais recentes (deleta automático)
   - Tamanho médio: ~610 MB (2 bancos, 96 tabelas, milhões de linhas)

2. **Logs Detalhados de Backup (nível `backup`)**
   - Novo nível de log `backup` com cor roxa (`#a78bfa`) e negrito
   - Todos os logs aparecem na aba LOGS com filtro "backup"
   - Análise pré-backup completa:
     - 🗄️ **Bancos de dados** — lista com contagem de tabelas
     - 📋 **Tabelas detalhadas** — nome, número de linhas, tamanho em MB por banco
     - 📊 **Totais por banco** — soma de linhas e tamanho
     - 📊 **Total geral** — todas as linhas e tamanho consolidado
     - 🔧 **Triggers** — lista completa com banco e nome
     - ⚙️ **Procedures & Functions** — lista com banco, nome e tipo
     - 📅 **Eventos agendados** — lista com banco, nome e status
   - Verificação pós-backup:
     - ✅ Tamanho do arquivo gerado
     - 🔐 Caminho completo do arquivo salvo

3. **Correções no Supervisor**
   - Botão "Reiniciar Backend" agora força limpeza de processos orphan mesmo quando processo não está rastreado
   - Botão "Fazer Backup" volta ao estado normal após conclusão (não fica mais esmaecido)
   - Funnel Tailscale monitorado a cada 30s e reativado automaticamente se cair

4. **Correção do Banco de Dados**
   - MariaDB 12.3: plugin de autenticação `auth_gssapi_client` incompatível → corrigido para `mysql_native_password`
   - Arquivo `.env` recriado com variável `PORT=3000` (backend subiu na 3001 por falta dela)
   - Backend conecta sem erros de autenticação

5. **Arquitetura de Logs (solução técnica)**
   - Problema: HTTP requests assíncronos (`logToSupervisor`) causavam race condition — só alguns logs chegavam
   - Solução: buffer de logs coletados + flush em 1 único request HTTP com array JSON
   - `flushAllLogs()` envia array de log entries de uma vez antes do mysqldump iniciar
   - Servidor `/ingest` já suporta arrays nativamente

**Arquivos modificados:**
```
gerenciamento_sessao/supervisor-app/electron/main.js
  — ipcMain.handle('backup:run') com análise detalhada
  — flushAllLogs() envia array de logs em 1 request
  — restartBackend() força limpeza de orphan processes

gerenciamento_sessao/supervisor-app/electron/preload.js
  — backup.run() com Promise simplificada

gerenciamento_sessao/supervisor-app/public/app.js
  — Botão backup com timeout de segurança (3min)
  — finally() garante reabilitação do botão

gerenciamento_sessao/supervisor-app/public/index.html
  — Filtro "backup" adicionado nos dropdowns de nível

gerenciamento_sessao/supervisor-app/public/styles.css
  — Cor roxa (--c-backup: #a78bfa) + negrito para .lvl-backup

gerenciamento_sessao/supervisor-app/server.js
  — Nível "backup" adicionado na lista de níveis aceitos

versao_local/.env
  — Criado com PORT=3000 + credenciais do banco
```

**Bancos de dados no backup:**
- `histórico_alphahall` — 75 tabelas
- `pixelbox_portal` — 21 tabelas
- **Total:** 96 tabelas, ~milhões de linhas, ~610 MB

**Reverter:**
```bash
git checkout 79db78c
git checkout -b rollback-v4.6.0
```

**Validação:**
1. ✅ Botão "Backup do Servidor" executa mysqldump completo
2. ✅ Arquivo salvo em `F:\backup_server\` com timestamp legível
3. ✅ Política de retenção mantém apenas 3 backups (deleta antigos)
4. ✅ Logs detalhados aparecem na aba LOGS filtrados por "backup" (roxo)
5. ✅ Logs incluem: bancos, tabelas com linhas/tamanho, triggers, procedures, eventos
6. ✅ Botão volta ao normal após backup (não trava mais)
7. ✅ Botão "Reiniciar Backend" limpa processos orphan corretamente
8. ✅ Backend conecta no MariaDB sem erros de autenticação
9. ✅ Thumbs e arquivos aparecem corretamente no admin e portal clientes

**Funcionalidades garantidas (além das anteriores):**
- ✅ Sistema de backup completo do banco com logs detalhados
- ✅ Supervisor desktop com controles de backend funcionais
- ✅ Todos os checkpoints anteriores preservados

---

### v4.6.0 — Amend 1 — Correção: .env Completo

**Commit após amend:** `79db78c` | **Data:** 30/07/2026

**Problema identificado:**
Após o checkpoint v4.6.0, thumbs e arquivos pararam de aparecer no admin e portal clientes. As imagens não carregavam, os cards de projetos mostravam ícones quebrados.

**Causa raiz:**
O arquivo `.env` na raiz do projeto estava **incompleto**, faltando variáveis críticas que o backend precisa para localizar as pastas de thumbs, arquivos e portfólio:

**Variáveis faltando no `.env` da raiz:**
```env
SERVER_FILES_PATH=F:\PixelBox\arquivos_server
THUMBS_PATH=F:\PixelBox\arquivos_server\thumbs
PORTFOLIO_PATH=F:\PixelBox\PORTIFÓLIO
FRONTEND_URL=https://admin-piv6.onrender.com
CLIENTES_URL=https://clientes-5sjd.onrender.com
PORTFOLIO_URL=https://portifolio-e1g9.onrender.com
IGNORED_FOLDERS=pixelbox-portal,.vscode,templates,pessoal,orçamentos,password 123 d5 render,STAND ALTA RESOLUCAO,impressora 3d,versao_local,arquivos_server
```

**Solução aplicada:**
- Copiado `.env` completo de `scripts_permanentes/.env` para a raiz
- Backend reiniciado para ler o `.env` correto
- Thumbs e arquivos voltaram a aparecer normalmente

**Arquivos alterados:**
```
versao_local/.env — restaurado com todas as variáveis necessárias
```

**Commit final após amend:** `79db78c`

> **Nota sobre amends:** Este amend corrige um problema crítico de configuração que impedia o carregamento de thumbs. O commit `5522569` foi substituído por `79db78c`. Para rollback, use sempre `79db78c`.

---

## CHECKPOINT v4.5.0

**Título:** Filtros Inteligentes no Dashboard + Navegação Contextual para Projetos + Status Cortesia

**Data:** 27/07/2026 | **Commit:** `1c71344` | **Status:** ✅ ESTÁVEL

**O que foi implementado:**

1. **Filtro de Período no Dashboard (global, primário)**
   - Padrão: mês atual (1º ao último dia)
   - Opção "Todos" para ver sem restrição de data
   - Presets rápidos: Este mês, Mês passado, Últimos 7/30d, Este ano
   - Inputs manuais para qualquer intervalo customizado
   - Todos os badges respondem a este filtro

2. **Filtro de Cliente no Dashboard (setorial, secundário)**
   - Dropdown com todos os clientes em ordem alfabética
   - Filtra dentro do período já estabelecido
   - Afeta: Indicadores Gerais, Projetos por Status, Indicadores Financeiros, Indicadores do Período

3. **Badges clicáveis — navegação contextual**
   - Qualquer badge clicável navega para `/admin/projects` com os filtros ativos
   - Status badges → `?status=X&clientId=Y&dateFrom=Z&dateTo=W`
   - "A Receber" → projetos pendentes | "Recebido" → pagos | "Cancelados" → cancelados
   - Filtros do dashboard são preservados na navegação

4. **Filtro de Período na tela Projetos**
   - Mesmo padrão do dashboard com presets + inputs manuais
   - Backend aceita `dateFrom` e `dateTo` via `DATE(created_at)`
   - "Limpar filtros" também limpa o período

5. **Todos os indicadores respondem ao filtro de cliente**
   - `filteredStatusBreakdown` calculado de `filteredProjects`
   - `filteredCounts` (Projetos, Ativos, Entregues, Arquivos) calculado de `filteredProjects`
   - Clientes e Storage fixos (não fazem sentido filtrar)

6. **Status Cortesia**
   - Novo status `courtesy` adicionado ao ENUM da tabela `projects`
   - Badge visual roxo: `bg-purple-500/20 text-purple-400`
   - Projetos com status Cortesia têm valores zerados em todos os cards e badges
   - Nos cards exibe **"Cortesia — Gratuito"** no lugar dos valores
   - `CANCELLED_STATUSES` inclui `'courtesy'` — não entra em nenhum cálculo financeiro
   - Aparece em todos os dropdowns de status (admin e cliente)

**Arquivos modificados:**
```
backend/src/config/migrateModule.ts              — ENUM com 'courtesy'
backend/src/controllers/projects.controller.ts   — STATUS_LABELS com 'courtesy'
frontend/src/types/index.ts                      — ProjectStatus com 'courtesy'
frontend/src/utils/index.ts                      — labels + cores + courtesy
frontend/src/pages/admin/Dashboard.tsx           — filtros + CANCELLED_STATUSES + goToProjects()
frontend/src/pages/admin/Projects.tsx            — filtro período + ALL_STATUSES + zera valores
frontend/src/pages/admin/ProjectDetail.tsx       — ALL_STATUSES com 'courtesy'
apps/clientes/src/types/index.ts                 — ProjectStatus com 'courtesy'
apps/clientes/src/utils/index.ts                 — labels + cores + courtesy
apps/clientes/src/pages/client/ClientProjects.tsx — CANCELLED_STATUSES + zera valores
apps/clientes/src/pages/client/ProjectDetail.tsx  — zera valores para courtesy
```

**Reverter:**
```bash
git checkout 24b6f0e
git checkout -b rollback-v4.5.0
```

**Validação:**
1. ✅ Filtro de período no dashboard com presets e inputs manuais
2. ✅ Filtro de cliente afeta todos os 4 blocos de badges
3. ✅ Clique em badge navega para projetos com filtros aplicados
4. ✅ Filtro de período na tela de projetos funcional
5. ✅ React error #310 corrigido (hooks antes dos returns antecipados)
6. ✅ Status Cortesia aparece em todos os dropdowns
7. ✅ Projetos Cortesia exibem "Cortesia — Gratuito" com valores zerados
8. ✅ Backend: migration atualiza ENUM ao reiniciar

---

### v4.5.0 — Amend 1 — Documentação: stack.md + Correções

**Commit após amend:** `24b6f0e` | **Data:** 28/07/2026

**O que foi incluído no amend:**
- Criação de `documentacao/stack.md` — guia de estudo completo das tecnologias do projeto
- Correção do índice: data `23/07` → `27/07`, commit `6a219d0` → `1c71344`
- Atualização do título do checkpoint para incluir "Status Cortesia"
- ARQUITETURA_SISTEMA.md: data atualizada + seção Status Cortesia no changelog

**Commit final após amend:** `24b6f0e`

> **Nota sobre amends:** Um amend reescreve o commit anterior. O commit `1c71344` foi substituído por `24b6f0e`. Para rollback, use sempre o commit mais recente listado aqui.

---

## CHECKPOINT v4.4.0

**Título:** Sistema de Valor por Alteração nos Projetos

**Data:** 23/07/2026 | **Commit:** `a2374ee` | **Status:** ✅ ESTÁVEL

**O que foi implementado:**
- Colunas `revision_value` (DECIMAL) e `revision_qty` (INT) na tabela `projects`
- Seção "Alterações" editável inline no ProjectDetail do admin
- Cards padronizados com 3 linhas: Valor / Alterações / Total (admin + cliente)
- Badges financeiros do cliente calculam valor real incluindo alterações

**Reverter:**
```bash
git checkout a2374ee
git checkout -b rollback-v4.4.0
```

**Validação:**
1. ✅ Migration cria colunas ao reiniciar o backend
2. ✅ Admin edita alterações inline no ProjectDetail
3. ✅ Cards mostram Valor / Alterações / Total padronizados
4. ✅ Badges Pendente/Pago somam alterações no cálculo

**Funcionalidades garantidas (além das anteriores):**
- ✅ Sistema de precificação de alterações por projeto
- ✅ Todos os checkpoints anteriores preservados

---

## CHECKPOINT v4.3.0

**Título:** Limpeza do Repositório + Dashboard de Banda + Regras de Negócio

**Data:** 19/07/2026 | **Commit:** `f1ce1bd` | **Status:** ✅ ESTÁVEL

**O que foi implementado:**

1. **Dashboard de Banda no Telemetria**
   - Seção "Consumo de Banda" com 6 badges
   - Estimativa Render por módulo (sessões × bundle size)
   - Sessões admin incluídas via `audit_logs LOGIN`
   - Estimativa Tailscale (downloads reais + API)
   - Histórico mensal 12 meses + barra de uso do free tier (100GB)

2. **Regras de Negócio**
   - Botão "Enviar arquivo" só aparece para `paid`/`finalized`/parceiro/`one_time_download`
   - Links WhatsApp com domínio correto (`clientes-5sjd`)
   - CSP do servidor atualizado

3. **Limpeza do repositório**
   - 13 scripts obsoletos movidos para `LIXEIRA/`
   - Pastas `logs/`, `plano_migracao/`, `themes/`, `tailscale_linux/` removidas da raiz

**Reverter:**
```bash
git checkout f1ce1bd
git checkout -b rollback-v4.3.0
```

**Validação:**
1. ✅ Dashboard de banda funciona com dados reais
2. ✅ Botão "Enviar arquivo" segue regra de negócio
3. ✅ Mensagem WhatsApp com domínio correto
4. ✅ Repositório limpo

---

## CHECKPOINT v4.2.0

**Título:** Migração de Infraestrutura Render — Novos Domínios

**Data:** 19/07/2026 | **Commit:** `cab439f` | **Status:** ✅ ESTÁVEL

**O que foi implementado:**
- Limite de 5GB do Render atingido — 3 serviços recriados com novos domínios
- CORS, keep-alive e variáveis de ambiente atualizados em todo o sistema

**Novos domínios:**
```
Admin:     https://admin-piv6.onrender.com
Clientes:  https://clientes-5sjd.onrender.com
Portfolio: https://portifolio-e1g9.onrender.com
```

**Configurações de build no Render:**
| Serviço | Root Directory | Build Command | Publish Directory |
|---|---|---|---|
| admin | `frontend` | `npm install && npm run build` | `dist` |
| clientes | vazio | `cd apps/clientes && npm install && npm run build` | `apps/clientes/dist` |
| portfolio | vazio | `cd apps/portfolio && npm install && npm run build` | `apps/portfolio/dist` |

**Variáveis de ambiente — Admin:**
```
VITE_API_URL=https://desktop-e6jr4dk.tailc1230a.ts.net
VITE_CLIENTES_URL=https://clientes-5sjd.onrender.com
```
**Clientes e Portfolio:**
```
VITE_API_URL=https://desktop-e6jr4dk.tailc1230a.ts.net
```

**Reverter:**
```bash
git checkout cab439f
git checkout -b rollback-v4.2.0
```

**Validação:**
1. ✅ 3 serviços deployados nos novos domínios
2. ✅ CORS do backend atualizado
3. ✅ Keep-alive do supervisor apontando para novos domínios

---

## CHECKPOINT v4.1.0

**Título:** WhatsApp Large File Support — Bypass de Serialização CDP

**Data:** 17/07/2026 | **Commit:** `0821369` | **Status:** ✅ ESTÁVEL

**Problema resolvido:**
Arquivos grandes (>50MB) causavam crash do Puppeteer com `Protocol error (Runtime.callFunctionOn): Target closed` ~3 segundos após `client.sendMessage()`.

**Causa raiz:**
`pupPage.evaluate(fn, MessageMedia[283MB])` serializa 283MB via CDP numa única mensagem — mata o processo Chrome.

**Solução:**
```
1. Injeta base64 em 540 partes de 512KB em window.__pixelbox_b64
2. Cria MessageMedia(mimeType, 'PIXELBOX_USE_PAGE_B64', fileName)
3. patchWhatsAppClient intercepta sendMessage
4. Executa envio inteiramente dentro do evaluate — zero bytes grandes via CDP
```

**Arquivos:**
```
backend/src/utils/patchWhatsAppClient.ts  — monkeypatch de sendMessage
backend/src/services/WhatsAppService.ts   — injeção base64 + uso do patch
```

**Reverter:**
```bash
git checkout 0821369
git checkout -b rollback-v4.1.0
```

**Validação:**
1. ✅ Arquivo 202MB (.cdr) enviado com sucesso via WhatsApp
2. ✅ WhatsApp permanece em `ready` após envio
3. ✅ Arquivo recebido como documento único (sem fragmentação)
4. ✅ Arquivos pequenos continuam funcionando normalmente

**Observações:**
- Monkeypatch reaplicado automaticamente a cada evento `ready`
- `window.__pixelbox_b64` limpo após cada envio
- Injeção de 540 chunks leva ~12s para 202MB — comportamento esperado

---

## CHECKPOINT v4.0.0

**Título:** Sistema de Downloads Resilientes — Range Requests HTTP 206 + Performance Monitor

**Data:** 17/07/2026 | **Commit:** `f40ddca` | **Status:** ✅ ESTÁVEL

**Problema resolvido:**
Downloads via Tailscale Funnel travavam em 0% — o Funnel bufferizava o arquivo inteiro antes de iniciar a transmissão. Barras de progresso não funcionavam.

**Solução:**
- Range Requests HTTP 206 — streaming chunked com partial content
- Performance Monitor — métricas de throughput, latência I/O e backpressure
- Compressão seletiva — skip automático de binários
- Chunk dinâmico — 64KB a 1MB baseado no tamanho do arquivo

**Arquivos:**
```
backend/src/utils/rangeStream.ts                    — streamFileWithRange()
backend/src/utils/performanceMonitor.ts             — métricas em tempo real
backend/src/utils/compressionHelper.ts              — compressão seletiva
backend/src/controllers/files.controller.ts         — Range support
backend/src/controllers/sharedLinks.controller.ts   — Range support
backend/src/controllers/clientFolders.controller.ts — Range support
apps/clientes/src/api/clientFolders.ts              — maxContentLength Infinity
apps/clientes/src/pages/shared/FolderExplorer.tsx   — onDownloadProgress + achalote
```

**Performance medida:**
```
Throughput médio:   >30MB/s  (arquivos 1-10MB)
Throughput grandes: >20MB/s  (arquivos >10MB)
Latência I/O:       <50ms    (disco local SSD)
```

**Reverter:**
```bash
git checkout f40ddca
git checkout -b rollback-v4.0.0
```

**Validação:**
1. ✅ Download inicia imediatamente (sem buffering completo)
2. ✅ Barra de progresso precisa com animação achalote
3. ✅ Performance Monitor logando métricas
4. ✅ WhatsApp conectado e enviando notificações
5. ✅ Telemetria gravando eventos sem falhas

**Observações:**
- Tailscale Funnel remove `Content-Length` com `stream.pipe()` — usar `res.sendFile()` em rotas públicas
- Compressão desabilitada para binários economiza 30-40% de CPU

---

> **PRÓXIMOS CHECKPOINTS** serão adicionados no topo deste arquivo.
> **NUNCA remova checkpoints anteriores** — eles são o histórico de pontos de restauração seguros.
