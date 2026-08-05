const mysql = require('mysql2/promise');

async function test() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'root',
    password: '1728f1br', database: 'histórico_alphahall'
  });

  // Testa cada regex separadamente para encontrar o problema
  const casos = [
    '364548980001-15 Lindiane Vera da Silva',
    '49.543.198 JOSIAS FERREIRA DA ROCHA',
    '55860862 Miguel Augusto Pimentel',
    'Gabriel de Freitas oliveira 114.688.616-03',
    'Jose Alves da Paixao ( Industria dos Cachos)',
  ];

  for (const nome of casos) {
    // Passo 1: remove número+separador no inicio
    const [r1] = await conn.execute(
      `SELECT REGEXP_REPLACE(?, '^[0-9][0-9. /-]*[0-9] +', '') as p1`, [nome]);
    // Passo 2: remove número no fim
    const [r2] = await conn.execute(
      `SELECT REGEXP_REPLACE(REGEXP_REPLACE(?, '^[0-9][0-9. /-]*[0-9] +', ''), ' [0-9][0-9. -]*[0-9]$', '') as p2`, [nome]);
    // Passo 3: remove parênteses
    const [r3] = await conn.execute(
      `SELECT TRIM(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(?, '^[0-9][0-9. /-]*[0-9] +', ''), ' [0-9][0-9. -]*[0-9]$', ''), '[(][^)]*[)]\\.?', '')) as p3`, [nome]);

    console.log(`ORIGINAL: ${nome}`);
    console.log(`  p1 (rm inicio): ${r1[0].p1}`);
    console.log(`  p2 (rm fim):    ${r2[0].p2}`);
    console.log(`  p3 (rm paren):  ${r3[0].p3}`);
    console.log('---');
  }

  await conn.end();
}

test().catch(console.error);
