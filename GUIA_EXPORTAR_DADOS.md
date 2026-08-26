# 📦 Guia: Exportar Database luna_cosmeticos via phpMyAdmin

## 🎯 Objetivo
Baixar a estrutura completa (tabelas + dados) do database `luna_cosmeticos` do servidor para o seu computador.

---

## 📋 Passo a Passo

### 1️⃣ Acessar o phpMyAdmin
Você já está com acesso (vejo na sua imagem).

### 2️⃣ Selecionar o Database
- No painel esquerdo, clique em **`luna_cosmeticos`**
- Você verá a lista de todas as tabelas

### 3️⃣ Exportar o Database Completo

#### Opção A: Exportação Rápida (Recomendado)
1. Com o database `luna_cosmeticos` selecionado
2. Clique na aba **"Exportar"** no topo
3. Selecione:
   - **Método:** Rápido
   - **Formato:** SQL
4. Clique em **"Executar"**
5. O arquivo `luna_cosmeticos.sql` será baixado

#### Opção B: Exportação Personalizada (Mais Completa)
1. Com o database `luna_cosmeticos` selecionado
2. Clique na aba **"Exportar"** no topo
3. Selecione:
   - **Método:** Personalizado
   - **Formato:** SQL
4. **Marque estas opções importantes:**
   - ✅ Estrutura
     - ✅ `DROP TABLE / VIEW / PROCEDURE / FUNCTION / EVENT / TRIGGER`
     - ✅ `CREATE TABLE`
     - ✅ `IF NOT EXISTS`
   - ✅ Dados
     - ✅ `INSERT`
     - ✅ `INSERT IGNORE` (evita erros de duplicação)
   - ✅ Criar base de dados
     - ✅ `CREATE DATABASE / USE`
   - ✅ Desabilitar verificações de chaves estrangeiras
5. Clique em **"Executar"**

### 4️⃣ Salvar o Arquivo
- Salve o arquivo baixado em: **`f:\luna_cosmeticos\backup_servidor\luna_cosmeticos.sql`**

---

## 🔍 Verificar o que Foi Exportado

Depois de baixar, rode este comando para ver estatísticas:

\`\`\`bash
cd "f:\\luna_cosmeticos"
node analisar_backup.js
\`\`\`

---

## 📊 Comparar com o Workspace

Após baixar o backup, eu vou criar um script que:
1. Lê o arquivo `.sql`
2. Extrai todas as tabelas e sua estrutura
3. Compara com o que você já tem na pasta `DADOS/tables/`
4. Gera um relatório mostrando:
   - ✅ Tabelas que você já tem
   - ❌ Tabelas que estão faltando
   - 📊 Estatísticas de cada tabela

---

## 💡 Alternativa: Exportação via Linha de Comando

Se você tiver acesso SSH ao servidor, pode usar este comando:

\`\`\`bash
# Conectar via SSH
ssh seu_usuario@ns1.hawktecnologia.com

# Exportar o database completo
mysqldump -u [SEU_USUARIO] -p luna_cosmeticos > luna_cosmeticos_backup.sql

# Baixar para seu computador (no seu PC Windows)
scp seu_usuario@ns1.hawktecnologia.com:~/luna_cosmeticos_backup.sql "f:\\luna_cosmeticos\\backup_servidor\\"
\`\`\`

---

## ❓ Qual usuário usar no phpMyAdmin?

Na imagem você está usando um usuário que **TEM** acesso ao `luna_cosmeticos`. Use esse mesmo usuário para fazer a exportação!

O usuário `hawktec_alpha_log` não tem permissão - deve ser um usuário só para logs.

---

## 📞 Próximos Passos

1. ✅ Exporte o database via phpMyAdmin
2. ✅ Salve em `f:\luna_cosmeticos\backup_servidor\luna_cosmeticos.sql`
3. ✅ Me avise que baixou
4. ✅ Eu crio o script de análise e comparação
5. ✅ Verificamos o que está faltando no workspace

---

## 🎉 Benefícios

Com o backup local você poderá:
- 🔍 Analisar a estrutura sem depender do servidor
- 📊 Comparar versões
- 🔄 Restaurar em ambientes de desenvolvimento
- 📝 Documentar o sistema
- 🚀 Trabalhar offline

---

**🚀 Baixe o backup agora e me avise quando terminar!**
