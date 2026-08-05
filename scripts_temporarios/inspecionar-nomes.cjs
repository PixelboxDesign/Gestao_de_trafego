const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root',
    password: '1728f1br', database: 'histórico_alphahall'
  });

  console.log('\n=== BLING - amostras problemáticas ===');
  const [b1] = await conn.execute(`
    SELECT contato_nome FROM bling_pedidos_venda_ecommerce 
    WHERE contato_nome REGEXP '^[0-9]' OR contato_nome LIKE '%&amp;%' OR contato_nome LIKE '%&#%'
    LIMIT 10`);
  b1.forEach(r => console.log(JSON.stringify(r.contato_nome)));

  console.log('\n=== BLING - nomes normais (amostra) ===');
  const [b2] = await conn.execute(`
    SELECT DISTINCT contato_nome FROM bling_pedidos_venda_ecommerce 
    WHERE contato_nome NOT REGEXP '^[0-9]' AND contato_nome NOT LIKE '%&#%'
    AND LENGTH(contato_nome) > 5
    LIMIT 10`);
  b2.forEach(r => console.log(r.contato_nome));

  console.log('\n=== TRAY - amostras problemáticas ===');
  const [t1] = await conn.execute(`
    SELECT name FROM clientes_tray_ecommerce 
    WHERE name LIKE '%&#%' OR name LIKE '%&amp;%' OR name REGEXP '^[^a-zA-ZÀ-ÿ ]'
    LIMIT 10`);
  t1.forEach(r => console.log(JSON.stringify(r.name)));

  console.log('\n=== TRAY - nomes normais (amostra) ===');
  const [t2] = await conn.execute(`
    SELECT DISTINCT name FROM clientes_tray_ecommerce 
    WHERE name NOT LIKE '%&#%' AND LENGTH(name) > 5
    ORDER BY name LIMIT 10`);
  t2.forEach(r => console.log(r.name));

  console.log('\n=== XML - amostras com / ===');
  const [x1] = await conn.execute(`
    SELECT dest_nome FROM nfe_xml_importado 
    WHERE dest_nome LIKE '%/%'
    LIMIT 10`);
  x1.forEach(r => console.log(JSON.stringify(r.dest_nome)));

  // Quantos registros de cada tipo são problemáticos
  console.log('\n=== CONTAGEM PROBLEMÁTICOS ===');
  const [c1] = await conn.execute(`SELECT COUNT(*) as n FROM bling_pedidos_venda_ecommerce WHERE contato_nome REGEXP '^[0-9]'`);
  console.log('Bling começa com número:', c1[0].n);
  
  const [c2] = await conn.execute(`SELECT COUNT(*) as n FROM bling_pedidos_venda_ecommerce WHERE contato_nome LIKE '%&#%'`);
  console.log('Bling com HTML entities:', c2[0].n);

  const [c3] = await conn.execute(`SELECT COUNT(*) as n FROM clientes_tray_ecommerce WHERE name LIKE '%&#%'`);
  console.log('Tray com HTML entities:', c3[0].n);

  const [c4] = await conn.execute(`SELECT COUNT(*) as n FROM nfe_xml_importado WHERE dest_nome LIKE '%/%'`);
  console.log('XML com barra:', c4[0].n);

  await conn.end();
}

test().catch(console.error);
