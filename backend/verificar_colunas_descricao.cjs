require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function verificarColunas() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('🔍 Verificando estrutura da tabela relacao_produtos_kits_disparo_luna...\n');

  const [columns] = await conn.query(`
    SHOW COLUMNS FROM relacao_produtos_kits_disparo_luna
  `);

  console.log('Colunas existentes:');
  columns.forEach(col => {
    console.log(`  - ${col.Field} (${col.Type})`);
  });

  // Verifica se as colunas de descrição estruturada existem
  const colNames = columns.map(c => c.Field);
  const needsCols = [
    'descricao_peso',
    'descricao_tamanho', 
    'descricao_composicao'
  ];

  console.log('\n📋 Colunas necessárias:');
  needsCols.forEach(col => {
    const exists = colNames.includes(col);
    console.log(`  ${exists ? '✅' : '❌'} ${col}`);
  });

  const missing = needsCols.filter(col => !colNames.includes(col));
  
  if (missing.length > 0) {
    console.log('\n⚠️  Colunas faltando:', missing.join(', '));
    console.log('\n💡 SQL para adicionar as colunas:');
    console.log('ALTER TABLE relacao_produtos_kits_disparo_luna');
    missing.forEach((col, idx) => {
      const comma = idx < missing.length - 1 ? ',' : ';';
      console.log(`  ADD COLUMN ${col} TEXT${comma}`);
    });
  } else {
    console.log('\n✅ Todas as colunas necessárias estão presentes!');
  }

  await conn.end();
}

verificarColunas().catch(console.error);
