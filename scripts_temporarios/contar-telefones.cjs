/**
 * Conta telefones reais em todas as tabelas do banco.
 * Foca apenas em colunas que realmente armazenam telefone.
 */
const mysql = require('mysql2/promise');

function limparTelefone(v) {
  if (!v) return null;
  const s = String(v).replace(/[\s\-().+]/g, '');
  // Deve ter entre 8 e 13 dígitos, maioria dígitos
  if (!/^\d{8,13}$/.test(s)) return null;
  // Não pode ser CPF/CNPJ disfarçado (todos iguais)
  if (/^(\d)\1+$/.test(s)) return null;
  return s;
}

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306,
    user: 'root', password: '1728f1br',
    database: 'histórico_alphahall',
    connectTimeout: 15000,
  });
  console.log('✅ Conectado\n');

  // Colunas REAIS de telefone — excluir email, bairro, cep, endereço, etc.
  const [colunas] = await conn.query(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'histórico_alphahall'
    AND DATA_TYPE IN ('varchar','mediumtext','text','char','bigint','double')
    AND (
      LOWER(COLUMN_NAME) LIKE '%fone%'     OR
      LOWER(COLUMN_NAME) LIKE '%phone%'    OR
      LOWER(COLUMN_NAME) LIKE '%celular%'  OR
      LOWER(COLUMN_NAME) LIKE '%whatsapp%' OR
      LOWER(COLUMN_NAME) = 'telefone'      OR
      LOWER(COLUMN_NAME) = 'tel'           OR
      LOWER(COLUMN_NAME) = 'contato'
    )
    AND LOWER(COLUMN_NAME) NOT LIKE '%email%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%bairro%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%endereco%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%cep%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%municipio%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%uf%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%id%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%nome%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%documento%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%rg%'
    AND LOWER(COLUMN_NAME) NOT LIKE '%ie%'
    ORDER BY TABLE_NAME, COLUMN_NAME
  `);

  console.log(`Colunas de telefone encontradas: ${colunas.length}\n`);

  const todosTelefones = new Set();
  const resultado = [];

  for (const { TABLE_NAME, COLUMN_NAME } of colunas) {
    try {
      const [rows] = await conn.query(
        `SELECT DISTINCT \`${COLUMN_NAME}\` AS v FROM \`${TABLE_NAME}\`
         WHERE \`${COLUMN_NAME}\` IS NOT NULL AND TRIM(\`${COLUMN_NAME}\`) != ''`
      );

      let validos = 0;
      for (const r of rows) {
        const limpo = limparTelefone(r.v);
        if (limpo) { todosTelefones.add(limpo); validos++; }
      }

      if (validos > 0) {
        resultado.push({ tabela: TABLE_NAME, coluna: COLUMN_NAME, unicos: validos });
        console.log(`  ✅ ${TABLE_NAME}.${COLUMN_NAME}: ${validos} telefones válidos`);
      }
    } catch(e) {
      // ignorar colunas com erro
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESULTADO FINAL');
  console.log('='.repeat(60));
  resultado.forEach(r => console.log(`  ${r.tabela}.${r.coluna}: ${r.unicos}`));
  console.log('='.repeat(60));
  console.log(`\nTOTAL DE TELEFONES ÚNICOS (todas as fontes): ${todosTelefones.size}`);

  await conn.end();
}

main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
