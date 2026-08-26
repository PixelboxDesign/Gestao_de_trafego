const mysql = require('mysql2/promise');

async function verificar() {
  console.log('🚀 Conectando ao database luna_cosmeticos...\n');
  
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '1728f1br',
    database: 'luna_cosmeticos',
    connectTimeout: 10000
  });

  console.log('✅ Conectado com sucesso!\n');

  // Listar todas as tabelas
  console.log('📊 TABELAS NO DATABASE luna_cosmeticos:');
  console.log('='.repeat(80));
  
  const [tables] = await connection.execute('SHOW TABLES');
  const tableNames = tables.map(row => Object.values(row)[0]);
  
  console.log(`Total de tabelas: ${tableNames.length}\n`);

  const resultado = {
    database: 'luna_cosmeticos',
    totalTabelas: tableNames.length,
    tabelas: []
  };

  // Para cada tabela, pegar detalhes
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
        chave: col.Key,
        default: col.Default
      }));

      // Pegar tamanho
      const [sizeResult] = await connection.execute(`
        SELECT 
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'size_mb'
        FROM information_schema.TABLES 
        WHERE table_schema = 'luna_cosmeticos' AND table_name = ?
      `, [table]);

      const sizeMB = sizeResult[0]?.size_mb || 0;

      // Mostrar progresso
      const percent = Math.round(((i + 1) / tableNames.length) * 100);
      const progressBar = '█'.repeat(Math.floor(percent / 2));
      process.stdout.write(`\r[${progressBar.padEnd(50, '░')}] ${percent}% - ${table.padEnd(40).substring(0, 40)}`);

      resultado.tabelas.push({
        nome: table,
        registros: total,
        totalColunas: colunas.length,
        colunas: colunas,
        tamanhoMB: sizeMB
      });

    } catch (err) {
      console.log(`\n❌ Erro em ${table}: ${err.message}`);
      resultado.tabelas.push({
        nome: table,
        erro: err.message
      });
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📋 RESUMO DAS TABELAS:');
  console.log('='.repeat(80));
  console.log('');

  // Ordenar por tamanho
  const sorted = [...resultado.tabelas]
    .filter(t => !t.erro)
    .sort((a, b) => b.tamanhoMB - a.tamanhoMB);

  let totalRegistros = 0;
  let totalSize = 0;

  // Cabeçalho
  console.log('┌─────┬──────────────────────────────────────────┬──────────────┬─────────┬──────────┐');
  console.log('│  #  │ Tabela                                   │  Registros   │ Colunas │ Tamanho  │');
  console.log('├─────┼──────────────────────────────────────────┼──────────────┼─────────┼──────────┤');

  sorted.forEach((t, i) => {
    totalRegistros += t.registros;
    const tamanho = parseFloat(t.tamanhoMB) || 0;
    totalSize += tamanho;
    
    const num = (i + 1).toString().padStart(3);
    const nome = t.nome.padEnd(40).substring(0, 40);
    const regs = t.registros.toLocaleString('pt-BR').padStart(12);
    const cols = t.totalColunas.toString().padStart(7);
    const size = (tamanho.toFixed(2) + ' MB').padStart(8);
    
    console.log(`│ ${num} │ ${nome} │ ${regs} │ ${cols} │ ${size} │`);
  });

  console.log('└─────┴──────────────────────────────────────────┴──────────────┴─────────┴──────────┘');
  console.log(`\n📊 TOTAIS:`);
  console.log(`   - Tabelas: ${resultado.totalTabelas}`);
  console.log(`   - Registros: ${totalRegistros.toLocaleString('pt-BR')}`);
  console.log(`   - Tamanho Total: ${totalSize.toFixed(2)} MB`);

  // Salvar JSON completo
  const fs = require('fs').promises;
  const path = require('path');
  
  const jsonPath = path.join(__dirname, 'luna_cosmeticos_estrutura.json');
  await fs.writeFile(jsonPath, JSON.stringify(resultado, null, 2), 'utf8');
  
  // Criar markdown detalhado
  let markdown = `# 📊 Estrutura do Database: luna_cosmeticos\n\n`;
  markdown += `**Data:** ${new Date().toLocaleString('pt-BR')}\n`;
  markdown += `**Servidor:** ns1.hawktecnologia.com\n\n`;
  markdown += `---\n\n`;
  markdown += `## 📈 Resumo\n\n`;
  markdown += `- **Total de Tabelas:** ${resultado.totalTabelas}\n`;
  markdown += `- **Total de Registros:** ${totalRegistros.toLocaleString('pt-BR')}\n`;
  markdown += `- **Tamanho Total:** ${totalSize.toFixed(2)} MB\n\n`;
  markdown += `---\n\n`;
  
  markdown += `## 📋 Lista de Tabelas\n\n`;
  markdown += `| # | Tabela | Registros | Colunas | Tamanho (MB) |\n`;
  markdown += `|---|--------|-----------|---------|-------------|\n`;
  
  sorted.forEach((t, i) => {
    const tamanhoMB = parseFloat(t.tamanhoMB) || 0;
    markdown += `| ${i + 1} | \`${t.nome}\` | ${t.registros.toLocaleString('pt-BR')} | ${t.totalColunas} | ${tamanhoMB.toFixed(2)} |\n`;
  });

  markdown += `\n---\n\n`;
  markdown += `## 🔍 Detalhes das Tabelas\n\n`;

  for (const tabela of sorted) {
    const tamanhoMB = parseFloat(tabela.tamanhoMB) || 0;
    markdown += `### 📄 \`${tabela.nome}\`\n\n`;
    markdown += `- **Registros:** ${tabela.registros.toLocaleString('pt-BR')}\n`;
    markdown += `- **Tamanho:** ${tamanhoMB.toFixed(2)} MB\n\n`;
    markdown += `#### Estrutura (${tabela.totalColunas} colunas):\n\n`;
    markdown += `| Coluna | Tipo | Nulo | Chave | Default |\n`;
    markdown += `|--------|------|------|-------|----------|\n`;
    
    tabela.colunas.forEach(col => {
      const defaultVal = col.default === null ? '-' : col.default;
      markdown += `| \`${col.nome}\` | ${col.tipo} | ${col.nulo} | ${col.chave || '-'} | ${defaultVal} |\n`;
    });
    
    markdown += `\n---\n\n`;
  }

  const mdPath = path.join(__dirname, 'luna_cosmeticos_estrutura.md');
  await fs.writeFile(mdPath, markdown, 'utf8');

  console.log(`\n\n📄 Arquivos gerados:`);
  console.log(`   - JSON: ${jsonPath}`);
  console.log(`   - Markdown: ${mdPath}`);

  await connection.end();
  console.log(`\n✅ Concluído!\n`);
}

verificar().catch(err => {
  console.error('\n❌ ERRO:', err.message);
  console.error(err);
  process.exit(1);
});
