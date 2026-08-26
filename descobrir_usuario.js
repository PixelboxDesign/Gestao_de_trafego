const mysql = require('mysql2/promise');

const HOSTS = [
  'ns1.hawktecnologia.com',
  'vps.hawktecnologia.com',
  '162.240.228.36'
];

const USUARIOS = [
  'hawktec_alpha_log',
  'hawktecnologia',
  'hawktec',
  'root',
  'luna',
  'luna_cosmeticos',
  'admin',
  'alphahall'
];

// Você precisa fornecer a senha correta
// Se for a mesma para todos, mantenha assim
// Se forem diferentes, adicione um objeto { user: 'x', password: 'y' }
const SENHA_PADRAO = 'Alpha@3030';

async function testarCombinacao(host, user, password) {
  try {
    const connection = await mysql.createConnection({
      host: host,
      port: 3306,
      user: user,
      password: password,
      database: 'luna_cosmeticos',
      connectTimeout: 5000
    });

    console.log(`✅ SUCESSO! Host: ${host} | User: ${user}`);
    
    // Verificar acesso
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`   📊 Tabelas acessíveis: ${tables.length}`);
    
    await connection.end();
    return { host, user, password, tables: tables.length };
    
  } catch (err) {
    if (err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
      // Timeout ou host não encontrado - não mostrar
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log(`❌ Acesso negado: ${host} | ${user}`);
    } else if (err.code === 'ER_DBACCESS_DENIED_ERROR') {
      console.log(`⚠️  Login OK mas sem acesso ao DB: ${host} | ${user}`);
    } else {
      console.log(`❌ Erro: ${host} | ${user} - ${err.code}`);
    }
    return null;
  }
}

async function descobrir() {
  console.log('🔍 DESCOBRINDO CREDENCIAIS VÁLIDAS');
  console.log('='.repeat(70));
  console.log('');

  const resultados = [];

  for (const host of HOSTS) {
    console.log(`\n🌐 Testando host: ${host}`);
    console.log('─'.repeat(70));
    
    for (const user of USUARIOS) {
      const resultado = await testarCombinacao(host, user, SENHA_PADRAO);
      if (resultado) {
        resultados.push(resultado);
      }
    }
  }

  console.log('\n\n' + '='.repeat(70));
  console.log('📋 RESUMO DOS RESULTADOS');
  console.log('='.repeat(70));

  if (resultados.length === 0) {
    console.log('\n❌ Nenhuma combinação válida encontrada!');
    console.log('\n💡 Possíveis soluções:');
    console.log('   1. Verifique se a senha está correta');
    console.log('   2. Verifique o nome de usuário no phpMyAdmin');
    console.log('   3. Peça ao administrador as credenciais corretas');
    console.log('   4. Use a exportação via phpMyAdmin (guia já criado)');
  } else {
    console.log('\n✅ Credenciais válidas encontradas:\n');
    resultados.forEach((r, i) => {
      console.log(`${i + 1}. Host: ${r.host}`);
      console.log(`   User: ${r.user}`);
      console.log(`   Database: luna_cosmeticos`);
      console.log(`   Tabelas: ${r.tables}`);
      console.log('');
    });

    // Salvar para uso posterior
    const fs = require('fs').promises;
    const path = require('path');
    const configPath = path.join(__dirname, 'credenciais_validas.json');
    await fs.writeFile(configPath, JSON.stringify(resultados[0], null, 2), 'utf8');
    console.log(`💾 Credenciais salvas em: ${configPath}`);
    console.log('\n✅ Agora você pode rodar: node verificar_luna_cosmeticos.js');
  }
}

descobrir().catch(console.error);
