const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root',
    password: '1728f1br', database: 'histórico_alphahall'
  });

  const base = `
    SELECT
      TRIM(contato_nome)     as nome,
      CAST(NULL AS CHAR)     as telefone
    FROM bling_pedidos_venda_ecommerce
    WHERE contato_nome IS NOT NULL

    UNION ALL

    SELECT TRIM(name), CAST(NULL AS CHAR)
    FROM clientes_tray_ecommerce
    WHERE name IS NOT NULL

    UNION ALL

    SELECT TRIM(dest_nome), dest_telefone
    FROM nfe_xml_importado
    WHERE dest_nome IS NOT NULL

    UNION ALL

    SELECT TRIM(nome), telefone
    FROM contatos_xlsx
    WHERE nome IS NOT NULL
  `;

  // 1. Todos os clientes (com nome válido, sem filtro de telefone)
  console.log('Calculando 1/3: todos os clientes...');
  const [r1] = await conn.execute(`
    SELECT COUNT(*) as total FROM (${base}) t
    WHERE LENGTH(TRIM(nome)) > 2
  `);
  console.log('1. TODOS OS CLIENTES (sem filtro):', r1[0].total.toLocaleString('pt-BR'));

  // 2. Clientes com telefone (com duplicatas)
  console.log('Calculando 2/3: com telefone...');
  const [r2] = await conn.execute(`
    SELECT COUNT(*) as total FROM (${base}) t
    WHERE LENGTH(TRIM(nome)) > 2
    AND telefone IS NOT NULL AND TRIM(telefone) != ''
  `);
  console.log('2. COM TELEFONE (com duplicatas):', r2[0].total.toLocaleString('pt-BR'));

  // 3. Clientes com telefone SEM duplicatas (GROUP BY telefone)
  console.log('Calculando 3/3: com telefone sem duplicatas...');
  const [r3] = await conn.execute(`
    SELECT COUNT(*) as total FROM (
      SELECT telefone FROM (${base}) t
      WHERE LENGTH(TRIM(nome)) > 2
      AND telefone IS NOT NULL AND TRIM(telefone) != ''
      GROUP BY telefone
    ) dedup
  `);
  console.log('3. COM TELEFONE SEM DUPLICATAS:', r3[0].total.toLocaleString('pt-BR'));

  await conn.end();
}

test().catch(console.error);
