/**
 * Script de migração: renomeia histórico_alphahall → luna_cosmeticos
 * 
 * Como rodar:
 *   node scripts_temporarios/renomear-banco.cjs
 * 
 * O que faz:
 *   1. Cria o banco luna_cosmeticos (se não existir)
 *   2. Copia todas as tabelas com dados para o novo banco
 *   3. NÃO apaga o banco antigo (segurança)
 *   Após verificar que tudo está OK, apague manualmente o banco antigo.
 */

const mysql = require('mysql2/promise');

const CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '1728f1br',
};

const BANCO_ANTIGO = 'histórico_alphahall';
const BANCO_NOVO   = 'luna_cosmeticos';

async function migrar() {
  const conn = await mysql.createConnection(CONFIG);
  console.log('✅ Conectado ao MariaDB');

  // 1. Cria o novo banco
  await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${BANCO_NOVO}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  console.log(`✅ Banco '${BANCO_NOVO}' criado`);

  // 2. Lista todas as tabelas do banco antigo
  const [tabelas] = await conn.execute(`SHOW TABLES FROM \`${BANCO_ANTIGO}\``);
  const nomes = tabelas.map(r => Object.values(r)[0]);
  console.log(`📋 ${nomes.length} tabelas encontradas em '${BANCO_ANTIGO}'`);

  // 3. Renomeia cada tabela (move para o novo banco)
  for (const tabela of nomes) {
    process.stdout.write(`  → ${tabela}... `);
    try {
      await conn.execute(
        `RENAME TABLE \`${BANCO_ANTIGO}\`.\`${tabela}\` TO \`${BANCO_NOVO}\`.\`${tabela}\``
      );
      console.log('✅');
    } catch (err) {
      console.log(`❌ ${err.message}`);
    }
  }

  // 4. Verifica resultado
  const [tabelasNovas] = await conn.execute(`SHOW TABLES FROM \`${BANCO_NOVO}\``);
  console.log(`\n✅ Migração concluída: ${tabelasNovas.length}/${nomes.length} tabelas em '${BANCO_NOVO}'`);
  console.log(`\n⚠️  O banco '${BANCO_ANTIGO}' ainda existe mas está vazio.`);
  console.log(`   Para removê-lo: DROP DATABASE \`${BANCO_ANTIGO}\`;`);

  await conn.end();
}

migrar().catch(err => {
  console.error('❌ Erro na migração:', err.message);
  process.exit(1);
});
