const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

(async () => { 
  const conn = await mysql.createConnection({ 
    host: process.env.DB_HOST, 
    port: process.env.DB_PORT, 
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME 
  }); 
  
  const [rows] = await conn.query(`
    SELECT nome, codigo_sku, preco, componentes 
    FROM relacao_produtos_kits_disparo_luna 
    WHERE tipo = 'kit_composto' AND componentes IS NOT NULL 
    LIMIT 3
  `); 
  
  rows.forEach((row, idx) => {
    console.log(`\n═══ KIT ${idx + 1} ═══`);
    console.log(`Nome: ${row.nome}`);
    console.log(`SKU: ${row.codigo_sku}`);
    console.log(`Preço: R$ ${row.preco}`);
    console.log(`Componentes (raw):`, typeof row.componentes, row.componentes);
    
    try {
      const parsed = JSON.parse(row.componentes);
      console.log(`Componentes (parsed):`, parsed);
    } catch (e) {
      console.log(`Erro ao parsear:`, e.message);
    }
  });
  
  await conn.end(); 
})();
