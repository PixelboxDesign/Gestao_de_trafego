/**
 * CORREÇÃO: Remove SKU dos nomes das pastas
 * Formato CORRETO: apenas o nome do produto/kit
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const CATALOGO_BASE = 'f:\\luna_cosmeticos\\catalogos\\Alphahall';

async function corrigirNomesPastas() {
  let connection;
  
  try {
    console.log('🔧 CORREÇÃO DE NOMES DE PASTAS');
    console.log('═══════════════════════════════════════════════════════\n');

    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'luna_cosmeticos'
    });

    console.log('✅ Conectado ao banco\n');

    // Excluir TODAS as pastas antigas
    console.log('🗑️  Excluindo pastas antigas...');
    const pastasAntigas = await fs.readdir(CATALOGO_BASE);
    for (const pasta of pastasAntigas) {
      const pastaPath = path.join(CATALOGO_BASE, pasta);
      const stat = await fs.stat(pastaPath);
      if (stat.isDirectory()) {
        await fs.rm(pastaPath, { recursive: true, force: true });
      }
    }
    console.log(`✅ ${pastasAntigas.length} pastas excluídas\n`);

    // Buscar produtos do banco
    console.log('📦 Buscando produtos do banco...');
    const [produtos] = await connection.query(`
      SELECT id, nome, tipo, eh_kit
      FROM relacao_produtos_kits_disparo_luna
      WHERE nome IS NOT NULL
      ORDER BY tipo DESC, nome ASC
    `);
    console.log(`✅ ${produtos.length} produtos encontrados\n`);

    // Criar pastas com APENAS O NOME (sem SKU, sem prefixo)
    console.log('📁 Criando pastas com nomes corretos...\n');
    
    let criados = 0;
    const nomesUsados = new Set();

    for (const produto of produtos) {
      // Nome limpo (sem caracteres especiais)
      let nomeSeguro = produto.nome
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Se o nome já existe, adiciona sufixo numérico
      let nomeFinal = nomeSeguro;
      let contador = 1;
      while (nomesUsados.has(nomeFinal.toLowerCase())) {
        nomeFinal = `${nomeSeguro} (${contador})`;
        contador++;
      }
      nomesUsados.add(nomeFinal.toLowerCase());
      
      // Limitar tamanho (Windows tem limite de 260 caracteres no path)
      if (nomeFinal.length > 150) {
        nomeFinal = nomeFinal.substring(0, 150).trim();
      }
      
      const pastaProduto = path.join(CATALOGO_BASE, nomeFinal);
      await fs.mkdir(pastaProduto, { recursive: true });
      
      criados++;
      if (criados % 50 === 0) {
        console.log(`   📝 ${criados}/${produtos.length} pastas criadas...`);
      }
    }

    console.log('\n✅ Pastas criadas com nomes corretos!\n');

    // Estatísticas
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 ESTATÍSTICAS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total de pastas: ${criados}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // Exemplos
    const pastasFinais = await fs.readdir(CATALOGO_BASE);
    console.log('📋 EXEMPLOS DE PASTAS (primeiras 10):\n');
    pastasFinais.slice(0, 10).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p}`);
    });

    console.log('\n✅ Correção concluída!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

corrigirNomesPastas()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
