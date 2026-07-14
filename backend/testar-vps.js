// Testar conexão direta com VPS MySQL
import mysql from 'mysql2/promise';

const VPS = {
  host: '162.240.228.36',
  port: 3306,
  user: 'hawktec_alpha_log',
  password: 'Alpha@3030',
  database: 'historico_alphahall',
  connectTimeout: 10000,
};

async function testarConexao() {
  console.log('🔍 Testando conexão direta com VPS MySQL...\n');
  console.log(`Host: ${VPS.host}`);
  console.log(`Port: ${VPS.port}`);
  console.log(`User: ${VPS.user}`);
  console.log(`Database: ${VPS.database}\n`);

  let conn;
  try {
    console.log('Conectando...');
    conn = await mysql.createConnection(VPS);
    console.log('✅ Conectado com sucesso!\n');

    // Testar query
    const [rows] = await conn.query('SELECT 1 as teste');
    console.log('✅ Query funcionou:', rows[0]);

    // Listar databases
    const [dbs] = await conn.query('SHOW DATABASES');
    console.log('\n📊 Databases disponíveis:');
    dbs.forEach(db => console.log(`  - ${Object.values(db)[0]}`));

    // Verificar tabelas
    const [tables] = await conn.query('SHOW TABLES FROM historico_alphahall');
    console.log(`\n✅ Database "historico_alphahall" tem ${tables.length} tabelas\n`);

    await conn.end();
    console.log('✅ VPS está acessível! Render vai conseguir conectar!\n');
    console.log('➡️  Use no Render Environment:\n');
    console.log('   DB_HOST=162.240.228.36');
    console.log('   DB_PORT=3306');
    console.log('   DB_USER=hawktec_alpha_log');
    console.log('   DB_PASSWORD=Alpha@3030');
    console.log('   DB_NAME=historico_alphahall');

  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.error('\n🔧 Possíveis causas:');
    console.error('1. Firewall do VPS bloqueando porta 3306');
    console.error('2. MySQL não configurado para aceitar conexões externas');
    console.error('3. bind-address no my.cnf = 127.0.0.1 (precisa ser 0.0.0.0)');
    console.error('4. Usuário não tem permissão para acesso remoto');
    console.error('\n📖 Veja ERRO-MYSQL.md para instruções detalhadas');
    process.exit(1);
  }
}

testarConexao();
