const fs = require('fs').promises;
const path = require('path');

async function analisarBackupSQL() {
  console.log('🔍 ANALISADOR DE BACKUP SQL');
  console.log('='.repeat(80));
  console.log('');

  // Verificar se o arquivo existe
  const backupPath = path.join(__dirname, 'backup_servidor', 'luna_cosmeticos.sql');
  
  try {
    await fs.access(backupPath);
  } catch (err) {
    console.log('❌ Arquivo não encontrado:', backupPath);
    console.log('');
    console.log('📝 Siga estas etapas:');
    console.log('  1. Abra o phpMyAdmin');
    console.log('  2. Selecione o database "luna_cosmeticos"');
    console.log('  3. Clique em "Exportar"');
    console.log('  4. Escolha formato SQL');
    console.log('  5. Clique em "Executar"');
    console.log('  6. Salve o arquivo em: f:\\luna_cosmeticos\\backup_servidor\\luna_cosmeticos.sql');
    console.log('');
    
    // Criar pasta se não existir
    const backupDir = path.join(__dirname, 'backup_servidor');
    try {
      await fs.mkdir(backupDir, { recursive: true });
      console.log('✅ Pasta criada: backup_servidor/');
    } catch {}
    
    process.exit(1);
  }

  console.log('✅ Backup encontrado!');
  console.log('📂 Arquivo:', backupPath);
  
  // Ler o arquivo
  const stats = await fs.stat(backupPath);
  console.log('📊 Tamanho:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
  console.log('📅 Data:', stats.mtime.toLocaleString('pt-BR'));
  console.log('');

  console.log('📖 Lendo conteúdo do arquivo...');
  const content = await fs.readFile(backupPath, 'utf8');
  
  const lines = content.split('\n');
  console.log('📄 Total de linhas:', lines.length.toLocaleString('pt-BR'));
  console.log('');

  // Extrair tabelas
  console.log('🔍 Extraindo informações das tabelas...\n');
  
  const tabelas = [];
  const createTableRegex = /CREATE TABLE [`'"]?(\w+)[`'"]?/gi;
  const insertRegex = /INSERT INTO [`'"]?(\w+)[`'"]?/gi;
  
  let match;
  const tabelasSet = new Set();
  
  // Encontrar todas as CREATE TABLE
  while ((match = createTableRegex.exec(content)) !== null) {
    tabelasSet.add(match[1]);
  }

  console.log('📊 TABELAS ENCONTRADAS NO BACKUP:');
  console.log('='.repeat(80));
  console.log(`Total: ${tabelasSet.size}\n`);

  // Para cada tabela, extrair informações
  for (const nomeTabela of Array.from(tabelasSet).sort()) {
    // Encontrar a definição da tabela
    const createTablePattern = new RegExp(
      `CREATE TABLE [\`'"]?${nomeTabela}[\`'"]?\\s*\\((.*?)\\)\\s*ENGINE`,
      'is'
    );
    
    const createMatch = createTablePattern.exec(content);
    
    let colunas = [];
    if (createMatch) {
      const definition = createMatch[1];
      const columnLines = definition.split(',').map(line => line.trim()).filter(line => {
        return line && !line.startsWith('PRIMARY KEY') && !line.startsWith('KEY') && 
               !line.startsWith('UNIQUE KEY') && !line.startsWith('CONSTRAINT');
      });
      
      colunas = columnLines.map(line => {
        const colMatch = line.match(/^[`'"]?(\w+)[`'"]?\s+(\w+)/);
        if (colMatch) {
          return { nome: colMatch[1], tipo: colMatch[2] };
        }
        return null;
      }).filter(Boolean);
    }

    // Contar INSERTs (estimativa de registros)
    const insertPattern = new RegExp(`INSERT INTO [\`'"]?${nomeTabela}[\`'"]?`, 'gi');
    const insertMatches = content.match(insertPattern);
    const numInserts = insertMatches ? insertMatches.length : 0;

    // Estimar número de registros (cada INSERT pode ter múltiplos registros)
    let estimativaRegistros = 0;
    if (numInserts > 0) {
      const insertValuePattern = new RegExp(
        `INSERT INTO [\`'"]?${nomeTabela}[\`'"]?.*?VALUES\\s*\\((.*?)\\);`,
        'is'
      );
      const insertValueMatch = insertValuePattern.exec(content);
      if (insertValueMatch) {
        // Contar quantos registros em cada INSERT (separados por ),(
        const valuesSection = insertValueMatch[1];
        const recordCount = (valuesSection.match(/\),\s*\(/g) || []).length + 1;
        estimativaRegistros = numInserts * recordCount;
      }
    }

    tabelas.push({
      nome: nomeTabela,
      colunas: colunas.length,
      colunasDetalhes: colunas,
      numInserts: numInserts,
      estimativaRegistros: estimativaRegistros
    });

    console.log(`  ✓ ${nomeTabela.padEnd(45)} ${colunas.length.toString().padStart(3)} colunas | ~${estimativaRegistros.toLocaleString('pt-BR').padStart(10)} registros`);
  }

  console.log('');
  console.log('='.repeat(80));

  // Comparar com o workspace
  console.log('\n📁 COMPARANDO COM O WORKSPACE...\n');
  
  const dadosPath = path.join(__dirname, 'DADOS', 'tables');
  let arquivosLocais = [];
  
  try {
    await fs.access(dadosPath);
    arquivosLocais = await fs.readdir(dadosPath);
    arquivosLocais = arquivosLocais.filter(f => f.endsWith('.sql')).map(f => f.replace('.sql', ''));
  } catch (err) {
    console.log('⚠️  Pasta DADOS/tables não encontrada');
    arquivosLocais = [];
  }

  const tabelasBackup = Array.from(tabelasSet);
  const tabelasLocal = new Set(arquivosLocais);

  const faltando = tabelasBackup.filter(t => !tabelasLocal.has(t));
  const existentes = tabelasBackup.filter(t => tabelasLocal.has(t));
  const extras = arquivosLocais.filter(t => !tabelasSet.has(t));

  console.log('✅ Tabelas que VOCÊ JÁ TEM:', existentes.length);
  if (existentes.length > 0 && existentes.length <= 20) {
    existentes.forEach(t => console.log(`     ✓ ${t}`));
  }
  
  console.log('');
  console.log('❌ Tabelas que ESTÃO FALTANDO:', faltando.length);
  if (faltando.length > 0) {
    faltando.forEach(t => console.log(`     ✗ ${t}`));
  }
  
  console.log('');
  console.log('📦 Tabelas locais que NÃO estão no backup:', extras.length);
  if (extras.length > 0 && extras.length <= 20) {
    extras.forEach(t => console.log(`     ? ${t}`));
  }

  // Salvar relatório
  const relatorio = {
    backup: {
      arquivo: backupPath,
      tamanhoMB: (stats.size / 1024 / 1024).toFixed(2),
      data: stats.mtime.toISOString(),
      totalLinhas: lines.length,
      totalTabelas: tabelasSet.size
    },
    tabelas: tabelas,
    comparacao: {
      existentes: existentes.length,
      faltando: faltando.length,
      extras: extras.length,
      listaFaltando: faltando,
      listaExtras: extras
    }
  };

  const relatorioPath = path.join(__dirname, 'relatorio_backup.json');
  await fs.writeFile(relatorioPath, JSON.stringify(relatorio, null, 2), 'utf8');

  // Criar markdown
  let md = `# 📊 Relatório: Análise do Backup SQL\n\n`;
  md += `**Data da Análise:** ${new Date().toLocaleString('pt-BR')}\n\n`;
  md += `---\n\n`;
  md += `## 📦 Informações do Backup\n\n`;
  md += `- **Arquivo:** \`${path.basename(backupPath)}\`\n`;
  md += `- **Tamanho:** ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`;
  md += `- **Data do Backup:** ${stats.mtime.toLocaleString('pt-BR')}\n`;
  md += `- **Total de Linhas:** ${lines.length.toLocaleString('pt-BR')}\n`;
  md += `- **Total de Tabelas:** ${tabelasSet.size}\n\n`;
  md += `---\n\n`;
  md += `## 📋 Tabelas no Backup\n\n`;
  md += `| # | Tabela | Colunas | Registros (estimativa) |\n`;
  md += `|---|--------|---------|------------------------|\n`;
  
  tabelas.sort((a, b) => b.estimativaRegistros - a.estimativaRegistros).forEach((t, i) => {
    md += `| ${i + 1} | \`${t.nome}\` | ${t.colunas} | ${t.estimativaRegistros.toLocaleString('pt-BR')} |\n`;
  });

  md += `\n---\n\n`;
  md += `## 📊 Comparação com Workspace\n\n`;
  md += `### ✅ Já Baixadas (${existentes.length})\n\n`;
  if (existentes.length > 0) {
    existentes.forEach(t => md += `- \`${t}\`\n`);
  } else {
    md += `*Nenhuma tabela baixada ainda*\n`;
  }
  
  md += `\n### ❌ Faltando Baixar (${faltando.length})\n\n`;
  if (faltando.length > 0) {
    faltando.forEach(t => md += `- \`${t}\`\n`);
  } else {
    md += `*Todas as tabelas já foram baixadas! ✅*\n`;
  }

  md += `\n### 📦 Extras Locais (${extras.length})\n\n`;
  if (extras.length > 0) {
    md += `*Estas tabelas estão na sua pasta local mas não no backup:*\n\n`;
    extras.forEach(t => md += `- \`${t}\`\n`);
  } else {
    md += `*Nenhuma tabela extra*\n`;
  }

  const mdPath = path.join(__dirname, 'relatorio_backup.md');
  await fs.writeFile(mdPath, md, 'utf8');

  console.log('\n\n📄 Relatórios salvos:');
  console.log(`   - JSON: ${relatorioPath}`);
  console.log(`   - Markdown: ${mdPath}`);

  console.log('\n\n' + '='.repeat(80));
  console.log('✅ ANÁLISE CONCLUÍDA!');
  console.log('='.repeat(80));
  console.log('');
  
  if (faltando.length > 0) {
    console.log(`⚠️  AÇÃO NECESSÁRIA: ${faltando.length} tabelas ainda precisam ser baixadas!`);
  } else {
    console.log('🎉 PERFEITO! Todas as tabelas do servidor já estão no seu workspace!');
  }
  console.log('');
}

analisarBackupSQL().catch(err => {
  console.error('❌ ERRO:', err.message);
  console.error(err);
  process.exit(1);
});
