const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root',
    password: '1728f1br', database: 'histórico_alphahall'
  });

  // Pegar amostra de nomes sujos de cada fonte
  const [rows] = await conn.execute(`
    SELECT nome, fonte FROM (
      SELECT TRIM(dest_nome) as nome, 'XML Interno' as fonte
      FROM nfe_xml_importado WHERE dest_nome IS NOT NULL
      UNION ALL
      SELECT TRIM(nome), 'Contatos'
      FROM contatos_xlsx WHERE nome IS NOT NULL
      UNION ALL
      SELECT TRIM(contato_nome), 'Bling'
      FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
      UNION ALL
      SELECT TRIM(name), 'Tray'
      FROM clientes_tray_ecommerce WHERE name IS NOT NULL
    ) t
    WHERE
      -- tem número no começo
      nome REGEXP '^[0-9]'
      OR nome REGEXP '^[^a-zA-ZÀ-ÿ]'
      OR nome LIKE '%/%'
      OR nome LIKE '%.%.%'
    LIMIT 50
  `);

  console.log('=== NOMES SUJOS (amostra) ===');
  rows.forEach(r => console.log(`[${r.fonte}] ${r.nome}`));

  // Contar quantos nomes começam com número
  const [r2] = await conn.execute(`
    SELECT COUNT(*) as total FROM (
      SELECT TRIM(dest_nome) as nome FROM nfe_xml_importado WHERE dest_nome IS NOT NULL
      UNION ALL SELECT TRIM(nome) FROM contatos_xlsx WHERE nome IS NOT NULL
      UNION ALL SELECT TRIM(contato_nome) FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
      UNION ALL SELECT TRIM(name) FROM clientes_tray_ecommerce WHERE name IS NOT NULL
    ) t WHERE nome REGEXP '^[0-9]'
  `);
  console.log('\n=== TOTAL com número no início:', r2[0].total);

  await conn.end();
}

test().catch(console.error);
