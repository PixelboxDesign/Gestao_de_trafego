const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const CONFIG = {
  host: '162.240.228.36',
  port: 3306,
  user: 'hawktec_alpha_log',
  password: 'Alpha@3030',
  connectTimeout: 30000
};

async function verificarServidor() {
  console.log('🔍 Conectando ao servidor MySQL...\n');
  console.log(`Host: ${CONFIG.host}`);
  console.log(`Porta: ${CONFIG.port}`);
  console.log(`Usuário: ${CONFIG.user}\n`);

  let connection;
  
  try {
    connection = await mysql.createConnection(CONFIG);
    console.log('✅ Conectado com sucesso!\n');

    // Listar todos os databases
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('📦 DATABASES DISPONÍVEIS:');
    console.log('='.repeat(60));
    
    const dbs = databases.map(row => row.Database);
    dbs.forEach((db, i) => {
      console.log(`${i + 1}. ${db}`);
    });
    console.log('\n');

    // Para cada database, listar tabelas
    const resultado = {
      timestamp: new Date().toISOString(),
      servidor: CONFIG.host,
      databases: []
    };

    for (const db of dbs) {
      // Pular databases do sistema
      if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(db)) {
        continue;
      }

      try {
        await connection.execute(`USE \`${db}\``);
        const [tables] = await connection.execute('SHOW TABLES');
        
        const tableNames = tables.map(row => Object.values(row)[0]);
        
        console.log(`\n📊 DATABASE: ${db}`);
        console.log('─'.repeat(60));
        console.log(`Total de tabelas: ${tableNames.length}\n`);

        const dbInfo = {
          nome: db,
          totalTabelas: tableNames.length,
          tabelas: []
        };

        // Para cada tabela, pegar informações
        for (const table of tableNames) {
          try {
            const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM \`${table}\``);
            const total = countResult[0].total;
            
            const [columns] = await connection.execute(`SHOW COLUMNS FROM \`${table}\``);
            const colunas = columns.map(col => ({
              nome: col.Field,
              tipo: col.Type,
              nulo: col.Null,
              chave: col.Key,
              default: col.Default
            }));

            console.log(`  ├─ ${table}`);
            console.log(`  │  ├─ Registros: ${total.toLocaleString()}`);
            console.log(`  │  └─ Colunas: ${colunas.length}`);

            dbInfo.tabelas.push({
              nome: table,
              registros: total,
              colunas: colunas
            });

          } catch (err) {
            console.log(`  ├─ ${table} [ERRO: ${err.message}]`);
            dbInfo.tabelas.push({
              nome: table,
              erro: err.message
            });
          }
        }

        resultado.databases.push(dbInfo);

      } catch (err) {
        console.log(`  ❌ Erro ao acessar database ${db}: ${err.message}`);
      }
    }

    // Salvar relatório em JSON
    const reportPath = path.join(__dirname, 'relatorio_servidor_mysql.json');
    await fs.writeFile(reportPath, JSON.stringify(resultado, null, 2), 'utf8');
    console.log(`\n\n📄 Relatório salvo em: ${reportPath}`);

    // Criar relatório em Markdown
    let markdown = `# Relatório do Servidor MySQL\n\n`;
    markdown += `**Data/Hora:** ${resultado.timestamp}\n`;
    markdown += `**Servidor:** ${resultado.servidor}\n\n`;
    markdown += `## Resumo\n\n`;
    
    let totalTabelas = 0;
    let totalRegistros = 0;
    
    for (const db of resultado.databases) {
      totalTabelas += db.totalTabelas;
      for (const tabela of db.tabelas) {
        if (tabela.registros) {
          totalRegistros += tabela.registros;
        }
      }
    }

    markdown += `- **Total de Databases:** ${resultado.databases.length}\n`;
    markdown += `- **Total de Tabelas:** ${totalTabelas}\n`;
    markdown += `- **Total de Registros:** ${totalRegistros.toLocaleString()}\n\n`;

    for (const db of resultado.databases) {
      markdown += `## Database: \`${db.nome}\`\n\n`;
      markdown += `**Total de Tabelas:** ${db.totalTabelas}\n\n`;
      
      if (db.tabelas.length > 0) {
        markdown += `| Tabela | Registros | Colunas |\n`;
        markdown += `|--------|-----------|----------|\n`;
        
        for (const tabela of db.tabelas) {
          const registros = tabela.registros ? tabela.registros.toLocaleString() : 'ERRO';
          const colunas = tabela.colunas ? tabela.colunas.length : '-';
          markdown += `| ${tabela.nome} | ${registros} | ${colunas} |\n`;
        }
        markdown += `\n`;
      }
    }

    const mdPath = path.join(__dirname, 'relatorio_servidor_mysql.md');
    await fs.writeFile(mdPath, markdown, 'utf8');
    console.log(`📄 Relatório Markdown salvo em: ${mdPath}`);

    console.log('\n✅ Verificação concluída!');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.error('\nDetalhes completos:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada.');
    }
  }
}

verificarServidor();
