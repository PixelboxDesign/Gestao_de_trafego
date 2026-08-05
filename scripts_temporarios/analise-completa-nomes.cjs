const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root',
    password: '1728f1br', database: 'histórico_alphahall'
  });

  // Pega amostra de cada padrão problemático do Bling
  console.log('=== BLING: número colado sem espaço ===');
  const [r1] = await conn.execute(`
    SELECT DISTINCT contato_nome FROM bling_pedidos_venda_ecommerce 
    WHERE contato_nome REGEXP '^[0-9]+[a-zA-Z]'
    LIMIT 10`);
  r1.forEach(r => console.log(r.contato_nome));

  console.log('\n=== BLING: número com ponto colado ===');
  const [r2] = await conn.execute(`
    SELECT DISTINCT contato_nome FROM bling_pedidos_venda_ecommerce 
    WHERE contato_nome REGEXP '^[0-9]+[.][0-9]'
    LIMIT 10`);
  r2.forEach(r => console.log(r.contato_nome));

  console.log('\n=== BLING: só números ===');
  const [r3] = await conn.execute(`
    SELECT DISTINCT contato_nome FROM bling_pedidos_venda_ecommerce 
    WHERE contato_nome REGEXP '^[0-9]+$'
    LIMIT 10`);
  r3.forEach(r => console.log(r.contato_nome));

  console.log('\n=== BLING: A*****e (censurado) ===');
  const [r4] = await conn.execute(`
    SELECT DISTINCT contato_nome FROM bling_pedidos_venda_ecommerce 
    WHERE contato_nome LIKE '%*%'
    LIMIT 5`);
  r4.forEach(r => console.log(r.contato_nome));

  console.log('\n=== BLING: endereço (Travessa, Rua) ===');
  const [r5] = await conn.execute(`
    SELECT DISTINCT contato_nome FROM bling_pedidos_venda_ecommerce 
    WHERE contato_nome LIKE '1 Travessa%' OR contato_nome LIKE 'Rua %' OR contato_nome LIKE '%Ltda%'
    LIMIT 10`);
  r5.forEach(r => console.log(r.contato_nome));

  // Conta padrões
  console.log('\n=== CONTAGENS ===');
  const [c1] = await conn.execute(`SELECT COUNT(DISTINCT contato_nome) as n FROM bling_pedidos_venda_ecommerce WHERE contato_nome REGEXP '^[0-9]'`);
  console.log('Bling começa com número:', c1[0].n);
  const [c2] = await conn.execute(`SELECT COUNT(DISTINCT contato_nome) as n FROM bling_pedidos_venda_ecommerce WHERE contato_nome LIKE '%*%'`);
  console.log('Bling censurado (*):', c2[0].n);
  const [c3] = await conn.execute(`SELECT COUNT(DISTINCT contato_nome) as n FROM bling_pedidos_venda_ecommerce`);
  console.log('Bling total distintos:', c3[0].n);
  const [c4] = await conn.execute(`SELECT COUNT(DISTINCT name) as n FROM clientes_tray_ecommerce`);
  console.log('Tray total distintos:', c4[0].n);

  await conn.end();
}
test().catch(console.error);
