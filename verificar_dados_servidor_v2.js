const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const HOSTS = [
  { host: '162.240.228.36', descricao: 'IP fixo' },
  { host: 'vps.hawktecnologia.com', descricao: 'Host VPS' },
  { host: 'ns1.hawktecnologia.com', descricao: 'NS1' }
];

const COMMON_CONFIG = {
  port: 3306,
  user: 'hawktec_alpha_log',
  password: 'Alpha@3030',
  connectTimeout: 10000
};

async function testarHost(hostInfo) {
  console.log(`\n🔍 Tentando: ${hostInfo.descricao} (${hostInfo.host})`);
  
  const config = {
    ...COMMON_CONFIG,
    host: hostInfo.host
  };

  let connection;
  
  try {
    connection = await mysql.createConnection(config);
    console.log(`✅ CONECTADO com sucesso em ${hostInfo.host}!\n`);
    return connection;
  } catch (error) {
    console.log(`❌ Falhou: ${error.code || error.message}`);
    return null;
  }
}

async function listarDadosServidor(connection, hostUsado) {
  try {
    // Listar todos os databases
    const [databases] = await connection.execute('SHOW DATABASES');
    console.log('\n📦 DATABASES DISPONÍVEIS:');
    console.log('='.repeat(70));
    
    const dbs = databases.map(row => row.Database);
    dbs.forEach((db, i) => {
      console.log(`${i + 1}. ${db}`);
    });

    // Filtrar databases do sistema
    const userDbs = dbs.filter(db => 
      !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(db)
    );

    console.log(`\n📊 Total de databases de usuário: ${userDbs.length}`);
    console.log('='.repeat(70));

    const resultado = {
      timestamp: new Date().toISOString(),
      servidor: hostUsado,
      totalDatabases: userDbs.length,
      databases: []
    };

    for (const db of userDbs) {
      console.log(`\n\n📁 DATABASE: ${db}`);
      console.log('─'.repeat(70));

      try {
        await connection.execute(`USE \`${db}\``);
        const [tables] = await connection.execute('SHOW TABLES');
        
        const tableNames = tables.map(row => Object.values(row)[0]);
        console.log(`Total de tabelas: ${tableNames.length}\n`);

        const dbInfo = {
          nome: db,
          totalTabelas: tableNames.length,
          tabelas: []
        };

        // Para cada tabela
        for (let i = 0; i < tableNames.length; i++) {
          const table = tableNames[i];
          
          try {
            // Contar registros
            const [countResult] = await connection.execute(`SELECT COUNT(*) as total FROM \`${table}\``);
            const total = countResult[0].total;
            
            // Pegar colunas
            const [columns] = await connection.execute(`SHOW COLUMNS FROM \`${table}\``);
            const colunas = columns.map(col => ({
              nome: col.Field,
              tipo: col.Type,
              nulo: col.Null,
              chave: col.Key
            }));

            // Pegar tamanho da tabela
            const [sizeResult] = await connection.execute(`
              SELECT 
                ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb'
              FROM information_schema.TABLES 
              WHERE table_schema = ? AND table_name = ?
            `, [db, table]);

            const sizeMB = sizeResult[0]?.size_mb || 0;

            const progressBar = '█'.repeat(Math.min(50, Math.floor(((i + 1) / tableNames.length) * 50)));
            const percent = Math.round(((i + 1) / tableNames.length) * 100);
            process.stdout.write(`\r[${progressBar.padEnd(50, '░')}] ${percent}% (${i + 1}/${tableNames.length})`);

            dbInfo.tabelas.push({
              nome: table,
              registros: total,
              colunas: colunas.length,
              tamanhoMB: sizeMB
            });

          } catch (err) {
            console.log(`\n  ❌ Erro em ${table}: ${err.message}`);
            dbInfo.tabelas.push({
              nome: table,
              erro: err.message
            });
          }
        }

        console.log('\n');
        
        // Mostrar top 10 maiores tabelas
        const sorted = [...dbInfo.tabelas]
          .filter(t => t.tamanhoMB)
          .sort((a, b) => b.tamanhoMB - a.tamanhoMB)
          .slice(0, 10);

        if (sorted.length > 0) {
          console.log('\n🏆 Top 10 Maiores Tabelas:');
          console.log('─'.repeat(70));
          sorted.forEach((t, i) => {
            const registros = t.registros ? t.registros.toLocaleString() : 'N/A';
            console.log(`  ${i + 1}. ${t.nome.padEnd(40)} ${registros.padStart(12)} registros | ${t.tamanhoMB} MB`);
          });
        }

        resultado.databases.push(dbInfo);

      } catch (err) {
        console.log(`❌ Erro ao acessar database ${db}: ${err.message}`);
      }
    }

    // Salvar relatórios
    const reportPath = path.join(__dirname, 'relatorio_servidor_mysql.json');
    await fs.writeFile(reportPath, JSON.stringify(resultado, null, 2), 'utf8');
    
    // Criar Markdown detalhado
    let markdown = `# 📊 Relatório do Servidor MySQL\n\n`;
    markdown += `**Data/Hora:** ${new Date(resultado.timestamp).toLocaleString('pt-BR')}\n`;
    markdown += `**Servidor:** ${resultado.servidor}\n\n`;
    markdown += `---\n\n`;
    markdown += `## 📈 Resumo Geral\n\n`;
    
    let totalTabelas = 0;
    let totalRegistros = 0;
    let totalSize = 0;
    
    for (const db of resultado.databases) {
      totalTabelas += db.totalTabelas;
      for (const tabela of db.tabelas) {
        if (tabela.registros) totalRegistros += tabela.registros;
        if (tabela.tamanhoMB) totalSize += tabela.tamanhoMB;
      }
    }

    markdown += `- **Databases:** ${resultado.databases.length}\n`;
    markdown += `- **Tabelas:** ${totalTabelas}\n`;
    markdown += `- **Registros Totais:** ${totalRegistros.toLocaleString('pt-BR')}\n`;
    markdown += `- **Tamanho Total:** ${totalSize.toFixed(2)} MB\n\n`;

    for (const db of resultado.databases) {
      markdown += `\n## 📁 Database: \`${db.nome}\`\n\n`;
      markdown += `**Tabelas:** ${db.totalTabelas}\n\n`;
      
      if (db.tabelas.length > 0) {
        markdown += `| # | Tabela | Registros | Colunas | Tamanho (MB) |\n`;
        markdown += `|---|--------|-----------|---------|-------------|\n`;
        
        db.tabelas
          .sort((a, b) => (b.tamanhoMB || 0) - (a.tamanhoMB || 0))
          .forEach((tabela, i) => {
            const registros = tabela.registros ? tabela.registros.toLocaleString('pt-BR') : 'ERRO';
            const colunas = tabela.colunas || '-';
            const tamanho = tabela.tamanhoMB ? tabela.tamanhoMB.toFixed(2) : '-';
            markdown += `| ${i + 1} | \`${tabela.nome}\` | ${registros} | ${colunas} | ${tamanho} |\n`;
          });
        markdown += `\n`;
      }
    }

    const mdPath = path.join(__dirname, 'relatorio_servidor_mysql.md');
    await fs.writeFile(mdPath, markdown, 'utf8');

    console.log('\n\n' + '='.repeat(70));
    console.log('✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('='.repeat(70));
    console.log(`\n📄 Relatórios salvos:`);
    console.log(`   - JSON: ${reportPath}`);
    console.log(`   - Markdown: ${mdPath}`);
    console.log(`\n📊 Estatísticas:`);
    console.log(`   - Databases: ${resultado.databases.length}`);
    console.log(`   - Tabelas: ${totalTabelas}`);
    console.log(`   - Registros: ${totalRegistros.toLocaleString('pt-BR')}`);
    console.log(`   - Tamanho: ${totalSize.toFixed(2)} MB`);

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 VERIFICADOR DE DADOS DO SERVIDOR MYSQL');
  console.log('='.repeat(70));

  let connection = null;
  let hostUsado = null;

  // Tentar conectar em cada host
  for (const hostInfo of HOSTS) {
    connection = await testarHost(hostInfo);
    if (connection) {
      hostUsado = hostInfo.host;
      break;
    }
  }

  if (!connection) {
    console.log('\n\n❌ NENHUM HOST RESPONDEU!');
    console.log('\nPossíveis causas:');
    console.log('  1. Firewall bloqueando conexões externas na porta 3306');
    console.log('  2. MySQL configurado para aceitar apenas conexões locais');
    console.log('  3. Credenciais incorretas');
    console.log('  4. Servidor offline');
    console.log('\n💡 Sugestão: Acesse via SSH e use mysqldump para exportar os dados');
    process.exit(1);
  }

  try {
    await listarDadosServidor(connection, hostUsado);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexão fechada.\n');
    }
  }
}

main().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
