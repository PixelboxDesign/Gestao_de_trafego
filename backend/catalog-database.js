import mysql from 'mysql2/promise';
import fs from 'fs';

const config = {
  host: '162.240.228.36',
  port: 3306,
  user: 'hawktec_alpha_log',
  password: 'Alpha@3030',
  database: 'hawktec_alpha-ecommerce',
  connectTimeout: 30000
};

async function catalogDatabase() {
  let connection;
  try {
    console.log('🔌 Conectando ao banco...');
    connection = await mysql.createConnection(config);
    console.log('✅ Conectado!\n');

    // 1. Listar TODAS as tabelas
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(row => Object.values(row)[0]);
    console.log(`📊 Total de tabelas: ${tableNames.length}\n`);

    const catalog = {
      database: config.database,
      totalTables: tableNames.length,
      catalogedAt: new Date().toISOString(),
      tables: {}
    };

    // 2. Para cada tabela, pegar APENAS a estrutura (DESCRIBE)
    let processed = 0;
    for (const tableName of tableNames) {
      processed++;
      process.stdout.write(`\rCatalogando: ${processed}/${tableNames.length}`);
      
      try {
        // DESCRIBE = estrutura completa da tabela (colunas, tipos, keys)
        const [columns] = await connection.query(`DESCRIBE \`${tableName}\``);
        
        catalog.tables[tableName] = {
          columns: columns.map(col => ({
            name: col.Field,
            type: col.Type,
            null: col.Null,
            key: col.Key,
            default: col.Default,
            extra: col.Extra
          })),
          primaryKeys: columns.filter(c => c.Key === 'PRI').map(c => c.Field),
          foreignKeys: columns.filter(c => c.Key === 'MUL' || c.Key === 'UNI').map(c => c.Field)
        };
      } catch (err) {
        catalog.tables[tableName] = { error: err.message };
      }
    }
    console.log();

    // 3. Salvar catálogo em JSON
    const outputPath = './DATABASE-CATALOG.json';
    fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2), 'utf8');
    console.log(`\n✅ Catálogo completo salvo em: ${outputPath}`);

    // 4. Gerar resumo de correlações (detectar possíveis FKs por nome)
    console.log('\n🔗 Analisando correlações...');
    const correlations = [];
    
    Object.keys(catalog.tables).forEach(table => {
      const cols = catalog.tables[table].columns || [];
      cols.forEach(col => {
        // Detectar padrões de FK: id_*, *_id, id
        if (col.name.match(/^id_|_id$|^id$/i)) {
          const possibleRelations = Object.keys(catalog.tables).filter(t => 
            t !== table && (
              col.name.toLowerCase().includes(t.toLowerCase()) ||
              t.toLowerCase().includes(col.name.toLowerCase().replace('_id', ''))
            )
          );
          if (possibleRelations.length > 0) {
            correlations.push({
              table,
              column: col.name,
              type: col.type,
              possibleRelations
            });
          }
        }
      });
    });

    fs.writeFileSync(
      './DATABASE-CORRELATIONS.json',
      JSON.stringify({ correlations, total: correlations.length }, null, 2),
      'utf8'
    );
    console.log(`✅ ${correlations.length} possíveis correlações detectadas`);

    console.log('\n📊 Resumo por tipo de tabela:');
    const tablesByType = {};
    Object.keys(catalog.tables).forEach(name => {
      const prefix = name.split('_')[0];
      tablesByType[prefix] = (tablesByType[prefix] || 0) + 1;
    });
    console.table(tablesByType);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

catalogDatabase();
