const mysql = require('mysql2/promise');

async function verificar() {
  const connection = await mysql.createConnection({
    host: 'ns1.hawktecnologia.com',
    port: 3306,
    user: 'hawktec_alpha_log',
    password: 'Alpha@3030',
    connectTimeout: 10000
  });

  console.log('✅ Conectado!\n');

  // Tentar listar TODOS os databases (mesmo sem permissão completa)
  console.log('📦 Tentando SHOW DATABASES:');
  console.log('='.repeat(70));
  const [dbs] = await connection.execute('SHOW DATABASES');
  dbs.forEach((row, i) => {
    console.log(`${i + 1}. ${row.Database}`);
  });

  console.log('\n📊 Verificando permissões do usuário:');
  console.log('='.repeat(70));
  
  try {
    const [grants] = await connection.execute('SHOW GRANTS');
    grants.forEach((row, i) => {
      console.log(`${i + 1}. ${Object.values(row)[0]}`);
    });
  } catch (err) {
    console.log('❌ Não foi possível ver as permissões:', err.message);
  }

  console.log('\n🔍 Tentando acessar databases com prefixo hawktec:');
  console.log('='.repeat(70));
  
  const possibleDbs = [
    'hawktec_alpha',
    'hawktec_alpha_log',
    'hawktec_alphahall',
    'alphahall',
    'alpha',
    'luna_cosmeticos',
    'luna'
  ];

  for (const dbName of possibleDbs) {
    try {
      await connection.execute(`USE \`${dbName}\``);
      const [tables] = await connection.execute('SHOW TABLES');
      console.log(`✅ ${dbName} - ${tables.length} tabelas`);
    } catch (err) {
      console.log(`❌ ${dbName} - ${err.code === 'ER_DBACCESS_DENIED_ERROR' ? 'Acesso negado' : 'Não existe'}`);
    }
  }

  await connection.end();
}

verificar().catch(console.error);
