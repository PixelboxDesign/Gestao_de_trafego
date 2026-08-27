/**
 * Script para verificar a tabela criada
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function verificarTabela() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'luna_cosmeticos'
    });

    console.log('✅ Conectado ao MySQL!\n');

    // Estatísticas gerais
    const [stats] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN tipo = 'produto_individual' THEN 1 ELSE 0 END) as produtos_individuais,
        SUM(CASE WHEN tipo = 'kit_composto' THEN 1 ELSE 0 END) as kits_compostos,
        SUM(CASE WHEN preco IS NOT NULL THEN 1 ELSE 0 END) as com_preco,
        SUM(CASE WHEN preco IS NULL THEN 1 ELSE 0 END) as sem_preco,
        SUM(CASE WHEN codigo_sku IS NOT NULL THEN 1 ELSE 0 END) as com_sku,
        SUM(CASE WHEN codigo_sku IS NULL THEN 1 ELSE 0 END) as sem_sku,
        SUM(CASE WHEN componentes IS NOT NULL THEN 1 ELSE 0 END) as kits_com_componentes
      FROM relacao_produtos_kits_disparo_luna
    `);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 ESTATÍSTICAS DA TABELA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total de registros: ${stats[0].total}`);
    console.log(`  → Produtos individuais: ${stats[0].produtos_individuais}`);
    console.log(`  → Kits compostos: ${stats[0].kits_compostos}`);
    console.log(`\nDados disponíveis:`);
    console.log(`  → Com preço: ${stats[0].com_preco}`);
    console.log(`  → Sem preço: ${stats[0].sem_preco}`);
    console.log(`  → Com SKU: ${stats[0].com_sku}`);
    console.log(`  → Sem SKU: ${stats[0].sem_sku}`);
    console.log(`  → Kits com componentes: ${stats[0].kits_com_componentes}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Exemplos de produtos individuais
    console.log('🔹 EXEMPLOS DE PRODUTOS INDIVIDUAIS:\n');
    const [individuais] = await connection.query(`
      SELECT codigo_sku, nome, preco
      FROM relacao_produtos_kits_disparo_luna
      WHERE tipo = 'produto_individual' AND preco IS NOT NULL
      ORDER BY preco DESC
      LIMIT 10
    `);

    individuais.forEach(p => {
      console.log(`   ${p.codigo_sku || 'SEM SKU'} - ${p.nome}`);
      console.log(`      Preço: R$ ${p.preco}\n`);
    });

    // Exemplos de kits
    console.log('\n🔹 EXEMPLOS DE KITS COMPOSTOS:\n');
    const [kits] = await connection.query(`
      SELECT codigo_sku, nome, preco, componentes
      FROM relacao_produtos_kits_disparo_luna
      WHERE tipo = 'kit_composto' AND componentes IS NOT NULL
      ORDER BY preco DESC
      LIMIT 5
    `);

    kits.forEach(k => {
      console.log(`   ${k.codigo_sku || 'SEM SKU'} - ${k.nome}`);
      console.log(`      Preço do kit: R$ ${k.preco || 'SEM PREÇO'}`);
      
      try {
        const comps = JSON.parse(k.componentes);
        console.log(`      Componentes (${comps.length} itens):`);
        comps.forEach(c => {
          console.log(`         → ${c.quantidade}x ${c.nome} (SKU: ${c.sku || 'sem SKU'})`);
        });
      } catch (e) {
        console.log(`      ⚠️ Erro ao ler componentes`);
      }
      console.log('');
    });

    // Produtos sem preço
    console.log('\n⚠️ PRODUTOS SEM PREÇO (primeiros 10):\n');
    const [semPreco] = await connection.query(`
      SELECT codigo_sku, nome, tipo
      FROM relacao_produtos_kits_disparo_luna
      WHERE preco IS NULL
      LIMIT 10
    `);

    semPreco.forEach(p => {
      console.log(`   ${p.codigo_sku || 'SEM SKU'} - ${p.nome} (${p.tipo})`);
    });

    console.log('\n✅ Verificação concluída!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verificarTabela()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
