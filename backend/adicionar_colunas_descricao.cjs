require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

async function adicionarColunas() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('🔧 Adicionando colunas de descrição estruturada...\n');

  try {
    await conn.query(`
      ALTER TABLE relacao_produtos_kits_disparo_luna
        ADD COLUMN descricao_peso TEXT,
        ADD COLUMN descricao_tamanho TEXT,
        ADD COLUMN descricao_composicao TEXT
    `);
    
    console.log('✅ Colunas adicionadas com sucesso!');
    console.log('   - descricao_peso');
    console.log('   - descricao_tamanho');
    console.log('   - descricao_composicao');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Colunas já existem no banco de dados');
    } else {
      console.error('❌ Erro ao adicionar colunas:', err.message);
      throw err;
    }
  }

  await conn.end();
}

adicionarColunas().catch(console.error);
