const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1728f1br',
    database: 'histórico_alphahall'
  });

  const base = `
    SELECT TRIM(contato_nome) as nome, CAST(NULL AS CHAR) as telefone
    FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
    UNION ALL
    SELECT TRIM(name), CAST(NULL AS CHAR)
    FROM clientes_tray_ecommerce WHERE name IS NOT NULL
    UNION ALL
    SELECT TRIM(dest_nome), dest_telefone
    FROM nfe_xml_importado WHERE dest_nome IS NOT NULL
    UNION ALL
    SELECT TRIM(nome), telefone
    FROM contatos_xlsx WHERE nome IS NOT NULL
  `;

  // Teste 1: sem filtro
  const [r1] = await conn.execute(
    `SELECT COUNT(*) as total FROM (${base}) t WHERE LENGTH(TRIM(nome)) > 2`
  );
  console.log('1. COUNT sem filtro:', r1[0].total);

  // Teste 2: com filtro telefone
  const [r2] = await conn.execute(
    `SELECT COUNT(*) as total FROM (${base}) t WHERE LENGTH(TRIM(nome)) > 2 AND telefone IS NOT NULL AND TRIM(telefone) != ''`
  );
  console.log('2. COUNT com telefone IS NOT NULL:', r2[0].total);

  // Teste 3: verificar quantos registros têm telefone na subquery
  const [r3] = await conn.execute(
    `SELECT COUNT(*) as total FROM (${base}) t WHERE telefone IS NOT NULL`
  );
  console.log('3. COUNT telefone IS NOT NULL (sem length):', r3[0].total);

  // Teste 4: verificar diretamente nas tabelas
  const [r4] = await conn.execute('SELECT COUNT(*) as total FROM nfe_xml_importado WHERE dest_telefone IS NOT NULL AND TRIM(dest_telefone) != ""');
  console.log('4. nfe_xml_importado com telefone:', r4[0].total);

  const [r5] = await conn.execute('SELECT COUNT(*) as total FROM contatos_xlsx WHERE telefone IS NOT NULL AND TRIM(telefone) != ""');
  console.log('5. contatos_xlsx com telefone:', r5[0].total);

  // Teste 5: checar se NULL as CHAR causa problema
  const [r6] = await conn.execute(
    `SELECT telefone FROM (${base}) t WHERE telefone IS NOT NULL LIMIT 5`
  );
  console.log('6. Amostra de telefones encontrados:', r6);

  await conn.end();
}

test().catch(console.error);
