/**
 * Script para criar a tabela app_disparo_config no MySQL
 * Executa: node criar-tabela-disparo-config.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'ns1.hawktecnologia.com',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'hawktec_alpha_log',
  password: process.env.DB_PASSWORD || 'Alpha@3030',
  database: process.env.DB_NAME || 'hawktec_alpha_log',
  charset: 'utf8mb4'
};

async function criarTabela() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  🗄️  CRIAR TABELA app_disparo_config');
  console.log('════════════════════════════════════════════════════════════════\n');

  let connection;

  try {
    console.log('📡 Conectando ao banco de dados...');
    console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.log(`   Database: ${DB_CONFIG.database}\n`);

    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Conectado com sucesso!\n');

    // Lê o SQL do arquivo
    const sqlPath = path.join(__dirname, 'sql', 'create_app_disparo_config.sql');
    console.log(`📄 Lendo SQL de: ${sqlPath}\n`);
    
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Executa o SQL
    console.log('⚙️  Executando SQL...\n');
    await connection.query(sql);
    console.log('✅ Tabela app_disparo_config criada/verificada com sucesso!\n');

    // Verifica se a tabela existe
    const [rows] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'app_disparo_config'
    `, [DB_CONFIG.database]);

    if (rows[0].total > 0) {
      console.log('✅ Verificação: Tabela existe no banco de dados\n');
      
      // Mostra estrutura da tabela
      const [columns] = await connection.query(`
        DESCRIBE app_disparo_config
      `);
      
      console.log('📋 Estrutura da tabela:');
      console.log('─────────────────────────────────────────────────────────────');
      columns.forEach(col => {
        console.log(`   ${col.Field.padEnd(20)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      console.log('─────────────────────────────────────────────────────────────\n');
    } else {
      console.log('❌ ERRO: Tabela não foi criada!\n');
      process.exit(1);
    }

    console.log('════════════════════════════════════════════════════════════════');
    console.log('  ✅ TABELA CRIADA COM SUCESSO!');
    console.log('════════════════════════════════════════════════════════════════\n');

    console.log('📝 Próximos passos:');
    console.log('   1. Execute: REBUILD-LUNA-SERVER.bat');
    console.log('   2. Teste a rota: GET http://localhost:3001/api/disparos/config');
    console.log('   3. Recarregue o site e clique em "💾 Salvar Configuração"\n');

  } catch (error) {
    console.error('\n❌ ERRO ao criar tabela:\n');
    console.error(error.message);
    console.error('\n');
    
    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  Não foi possível conectar ao banco de dados.');
      console.error('   Verifique se o host/porta estão corretos.\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('⚠️  Acesso negado.');
      console.error('   Verifique usuário e senha no arquivo .env\n');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada.\n');
    }
  }
}

criarTabela();
