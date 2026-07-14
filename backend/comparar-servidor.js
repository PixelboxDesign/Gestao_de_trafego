// Script simplificado para verificar dados no servidor VPS
import mysql from 'mysql2/promise';

const VPS = {
  host: '162.240.228.36',
  port: 3306,
  user: 'hawktec_alpha_log',
  password: 'Alpha@3030',
  database: 'hawktec_alpha-ecommerce',
  connectTimeout: 15000,
};

async function verificarServidor() {
  console.log('🔍 Conectando ao servidor VPS...\n');
  
  let conn;
  try {
    conn = await mysql.createConnection(VPS);
    console.log('✅ Conectado ao VPS MySQL\n');
  } catch (e) {
    console.error('❌ Erro ao conectar:', e.message);
    process.exit(1);
  }

  try {
    // Listar todas as tabelas
    const [tables] = await conn.query('SHOW TABLES');
    console.log(`📊 Total de tabelas no servidor: ${tables.length}\n`);

    // Para cada tabela, contar registros
    console.log('Tabela'.padEnd(65) + 'Registros');
    console.log('='.repeat(80));
    
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      try {
        const [countResult] = await conn.query(`SELECT COUNT(*) as c FROM \`${tableName}\``);
        const count = countResult[0].c;
        console.log(tableName.padEnd(65) + String(count).padStart(10));
      } catch (e) {
        console.log(tableName.padEnd(65) + 'ERRO');
      }
    }

    await conn.end();
    console.log('\n✅ Verificação concluída!');
  } catch (e) {
    console.error('❌ Erro:', e.message);
    if (conn) await conn.end();
    process.exit(1);
  }
}

verificarServidor();
