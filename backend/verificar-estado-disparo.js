/**
 * Script para verificar o estado atual do sistema de disparo config
 * Executa: node verificar-estado-disparo.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const http = require('http');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'ns1.hawktecnologia.com',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'hawktec_alpha_log',
  password: process.env.DB_PASSWORD || 'Alpha@3030',
  database: process.env.DB_NAME || 'hawktec_alpha_log',
  charset: 'utf8mb4'
};

const STATUS = {
  OK: '✅',
  ERRO: '❌',
  AVISO: '⚠️',
  INFO: 'ℹ️'
};

async function verificar() {
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('  🔍 VERIFICAÇÃO DO SISTEMA - DISPARO CONFIG');
  console.log('════════════════════════════════════════════════════════════════\n');

  const resultados = {
    arquivos: { ok: true, detalhes: [] },
    database: { ok: true, detalhes: [] },
    servidor: { ok: true, detalhes: [] }
  };

  // ═══ 1. VERIFICAR ARQUIVOS ═══
  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ 1. VERIFICAÇÃO DE ARQUIVOS                                     │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  const arquivosEsperados = [
    { path: 'src-tauri/src/api/disparos.rs', nome: 'disparos.rs' },
    { path: 'src-tauri/src/api/mod.rs', nome: 'mod.rs' },
    { path: 'sql/create_app_disparo_config.sql', nome: 'SQL da tabela' },
    { path: 'src-tauri/target/release/luna-server.exe', nome: 'luna-server.exe' }
  ];

  for (const arq of arquivosEsperados) {
    const fullPath = path.join(__dirname, arq.path);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      const dataModificacao = stats.mtime.toLocaleString('pt-BR');
      
      // Verifica se é de hoje
      const hoje = new Date().toDateString();
      const dataArquivo = stats.mtime.toDateString();
      const isHoje = hoje === dataArquivo;
      
      console.log(`${STATUS.OK} ${arq.nome}`);
      console.log(`   Modificado: ${dataModificacao} ${isHoje ? '(HOJE)' : '(antigo)'}`);
      
      if (arq.nome === 'luna-server.exe' && !isHoje) {
        console.log(`   ${STATUS.AVISO} AVISO: Executável não foi recompilado hoje!`);
        resultados.arquivos.ok = false;
        resultados.arquivos.detalhes.push('Luna Server precisa ser recompilado');
      }
    } else {
      console.log(`${STATUS.ERRO} ${arq.nome} - NÃO ENCONTRADO`);
      resultados.arquivos.ok = false;
      resultados.arquivos.detalhes.push(`${arq.nome} não existe`);
    }
  }

  // Verifica conteúdo do mod.rs
  const modRsPath = path.join(__dirname, 'src-tauri/src/api/mod.rs');
  if (fs.existsSync(modRsPath)) {
    const conteudo = fs.readFileSync(modRsPath, 'utf8');
    const temRotaConfig = conteudo.includes('disparos::obter_config') && 
                          conteudo.includes('disparos::salvar_config');
    
    if (temRotaConfig) {
      console.log(`${STATUS.OK} Rotas de config registradas em mod.rs`);
    } else {
      console.log(`${STATUS.ERRO} Rotas de config NÃO encontradas em mod.rs`);
      resultados.arquivos.ok = false;
      resultados.arquivos.detalhes.push('Rotas não registradas');
    }
  }

  console.log('');

  // ═══ 2. VERIFICAR DATABASE ═══
  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ 2. VERIFICAÇÃO DO BANCO DE DADOS                               │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  let connection;
  try {
    console.log(`${STATUS.INFO} Conectando ao MySQL...`);
    console.log(`   Host: ${DB_CONFIG.host}:${DB_CONFIG.port}`);
    console.log(`   Database: ${DB_CONFIG.database}\n`);

    connection = await mysql.createConnection(DB_CONFIG);
    console.log(`${STATUS.OK} Conexão estabelecida\n`);

    // Verifica se a tabela existe
    const [tables] = await connection.query(`
      SELECT COUNT(*) as total 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'app_disparo_config'
    `, [DB_CONFIG.database]);

    if (tables[0].total > 0) {
      console.log(`${STATUS.OK} Tabela app_disparo_config existe\n`);
      
      // Mostra estrutura
      const [columns] = await connection.query(`DESCRIBE app_disparo_config`);
      console.log('   Colunas:');
      columns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
      console.log('');
      
      // Verifica se tem dados
      const [count] = await connection.query(`SELECT COUNT(*) as total FROM app_disparo_config`);
      console.log(`${STATUS.INFO} Registros na tabela: ${count[0].total}\n`);
      
      if (count[0].total > 0) {
        const [dados] = await connection.query(`SELECT * FROM app_disparo_config ORDER BY id DESC LIMIT 1`);
        console.log('   Última configuração salva:');
        console.log(`   - Item: ${dados[0].item_nome || 'N/A'}`);
        console.log(`   - Mensagem: ${dados[0].mensagem.substring(0, 50)}...`);
        console.log(`   - Quantidade: ${dados[0].quantidade}`);
        console.log(`   - Atualizado em: ${dados[0].atualizado_em}\n`);
      }
      
    } else {
      console.log(`${STATUS.ERRO} Tabela app_disparo_config NÃO EXISTE\n`);
      resultados.database.ok = false;
      resultados.database.detalhes.push('Tabela não foi criada');
    }

  } catch (error) {
    console.log(`${STATUS.ERRO} Erro ao conectar ao MySQL:\n`);
    console.log(`   ${error.message}\n`);
    resultados.database.ok = false;
    resultados.database.detalhes.push(`Erro MySQL: ${error.code}`);
  } finally {
    if (connection) await connection.end();
  }

  // ═══ 3. VERIFICAR SERVIDOR ═══
  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ 3. VERIFICAÇÃO DO SERVIDOR                                     │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  // Health check
  await new Promise((resolve) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`${STATUS.OK} Luna Server está rodando (porta 3001)`);
          console.log(`   Status: ${res.statusCode}\n`);
        } else {
          console.log(`${STATUS.ERRO} Luna Server retornou status ${res.statusCode}\n`);
          resultados.servidor.ok = false;
          resultados.servidor.detalhes.push(`Status code: ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`${STATUS.ERRO} Luna Server NÃO está rodando\n`);
      console.log(`   Erro: ${err.message}\n`);
      resultados.servidor.ok = false;
      resultados.servidor.detalhes.push('Servidor offline');
      resolve();
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.log(`${STATUS.ERRO} Timeout ao conectar ao servidor\n`);
      resultados.servidor.ok = false;
      resultados.servidor.detalhes.push('Timeout');
      resolve();
    });
  });

  // Testa rota de config
  await new Promise((resolve) => {
    const req = http.get('http://localhost:3001/api/disparos/config', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`${STATUS.OK} Rota /api/disparos/config está funcionando`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Resposta: ${data.substring(0, 100)}...\n`);
        } else if (res.statusCode === 404) {
          console.log(`${STATUS.ERRO} Rota /api/disparos/config NÃO ENCONTRADA (404)\n`);
          console.log(`   ${STATUS.AVISO} Luna Server precisa ser RECOMPILADO!\n`);
          resultados.servidor.ok = false;
          resultados.servidor.detalhes.push('Rota 404 - recompilar necessário');
        } else {
          console.log(`${STATUS.ERRO} Rota retornou status ${res.statusCode}\n`);
          resultados.servidor.ok = false;
          resultados.servidor.detalhes.push(`Status: ${res.statusCode}`);
        }
        resolve();
      });
    });

    req.on('error', () => {
      resultados.servidor.ok = false;
      resolve();
    });

    req.setTimeout(3000, () => {
      req.destroy();
      resolve();
    });
  });

  // ═══ RESUMO ═══
  console.log('════════════════════════════════════════════════════════════════');
  console.log('  📊 RESUMO DA VERIFICAÇÃO');
  console.log('════════════════════════════════════════════════════════════════\n');

  const todosOk = resultados.arquivos.ok && resultados.database.ok && resultados.servidor.ok;

  console.log(`Arquivos:       ${resultados.arquivos.ok ? STATUS.OK : STATUS.ERRO}`);
  if (resultados.arquivos.detalhes.length > 0) {
    resultados.arquivos.detalhes.forEach(d => console.log(`                - ${d}`));
  }

  console.log(`\nBanco de Dados: ${resultados.database.ok ? STATUS.OK : STATUS.ERRO}`);
  if (resultados.database.detalhes.length > 0) {
    resultados.database.detalhes.forEach(d => console.log(`                - ${d}`));
  }

  console.log(`\nServidor:       ${resultados.servidor.ok ? STATUS.OK : STATUS.ERRO}`);
  if (resultados.servidor.detalhes.length > 0) {
    resultados.servidor.detalhes.forEach(d => console.log(`                - ${d}`));
  }

  console.log('\n════════════════════════════════════════════════════════════════\n');

  if (todosOk) {
    console.log(`${STATUS.OK} TUDO OK! Sistema funcionando corretamente.\n`);
    console.log('🎯 Próximos passos:');
    console.log('   1. Acesse http://localhost:3001');
    console.log('   2. Configure o disparo');
    console.log('   3. Clique em "💾 Salvar Configuração"');
    console.log('   4. Recarregue (F5) e verifique se restaurou\n');
  } else {
    console.log(`${STATUS.ERRO} PROBLEMAS ENCONTRADOS!\n`);
    console.log('🔧 Soluções:\n');
    
    if (!resultados.arquivos.ok) {
      console.log('   Arquivos: Execute REBUILD-LUNA-SERVER.bat\n');
    }
    
    if (!resultados.database.ok) {
      console.log('   Database: Execute node criar-tabela-disparo-config.js\n');
    }
    
    if (!resultados.servidor.ok) {
      if (resultados.servidor.detalhes.includes('Servidor offline')) {
        console.log('   Servidor: Inicie o Luna Server\n');
      } else if (resultados.servidor.detalhes.some(d => d.includes('404'))) {
        console.log('   Servidor: Execute REBUILD-LUNA-SERVER.bat\n');
      }
    }
    
    console.log('   OU execute: DEPLOY-DISPARO-CONFIG-COMPLETO.bat\n');
  }

  console.log('════════════════════════════════════════════════════════════════\n');
}

verificar().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
