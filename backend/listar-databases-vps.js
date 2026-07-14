// Listar todos os databases disponíveis no VPS
import mysql from 'mysql2/promise';

const VPS = {
  host: '162.240.228.36',
  port: 3306,
  user: 'hawktec_alpha_log',
  password: 'Alpha@3030',
  connectTimeout: 10000,
};

async function listarDatabases() {
  console.log('🔍 Conectando ao VPS MySQL...\n');
  console.log(`Host: ${VPS.host}`);
  console.log(`User: ${VPS.user}\n`);

  let conn;
  try {
    console.log('Conectando...');
    conn = await mysql.createConnection(VPS);
    console.log('✅ Conectado com sucesso!\n');

    // Listar todos os databases
    const [dbs] = await conn.query('SHOW DATABASES');
    console.log('📊 Databases disponíveis no VPS:\n');
    console.log('=' .repeat(50));
    dbs.forEach((db, index) => {
      const dbName = Object.values(db)[0];
      console.log(`${(index + 1).toString().padStart(2)}. ${dbName}`);
    });
    console.log('=' .repeat(50));

    await conn.end();

    console.log('\n✅ Encontrou os databases acima!');
    console.log('\n📝 Escolha o database correto e atualize:');
    console.log('   1. No Render Environment: DB_NAME=<nome_correto>');
    console.log('   2. No arquivo .env.render');

  } catch (error) {
    console.error('❌ Erro ao conectar:', error.message);
    console.error('\n🔧 Possíveis causas:');
    console.error('1. Firewall bloqueando porta 3306');
    console.error('2. Credenciais incorretas');
    console.error('3. MySQL não aceita conexões externas');
    process.exit(1);
  }
}

listarDatabases();
