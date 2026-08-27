/**
 * Script de Migração - Nova Estrutura de Catálogos
 * 
 * O QUE FAZ:
 * 1. Exclui todas as pastas antigas de kits
 * 2. Cria novas pastas baseadas no banco de dados
 * 3. Estrutura: [TIPO]_[ID]/thumb.png
 * 4. Produtos individuais: só thumb
 * 5. Kits: thumb do kit (carrossel = thumbs dos componentes via backend)
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const CATALOGO_BASE = 'f:\\luna_cosmeticos\\catalogos\\Alphahall';

async function migrarEstrutura() {
  let connection;
  
  try {
    console.log('🔄 MIGRAÇÃO DE ESTRUTURA - CATÁLOGOS LUNA');
    console.log('═══════════════════════════════════════════════════════\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 1. CONECTAR AO BANCO
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('🔌 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'luna_cosmeticos'
    });

    console.log('✅ Conectado!\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 2. EXCLUIR PASTAS ANTIGAS
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('🗑️  Excluindo pastas antigas...');
    
    try {
      const pastasAntigas = await fs.readdir(CATALOGO_BASE);
      console.log(`   Encontradas ${pastasAntigas.length} pastas antigas`);
      
      for (const pasta of pastasAntigas) {
        const pastaPath = path.join(CATALOGO_BASE, pasta);
        const stat = await fs.stat(pastaPath);
        
        if (stat.isDirectory()) {
          await fs.rm(pastaPath, { recursive: true, force: true });
          console.log(`   ❌ Removida: ${pasta}`);
        }
      }
      
      console.log('✅ Pastas antigas excluídas\n');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('   ℹ️  Pasta base não existe, será criada\n');
      } else {
        throw error;
      }
    }

    // Criar pasta base se não existir
    await fs.mkdir(CATALOGO_BASE, { recursive: true });

    // ═══════════════════════════════════════════════════════════════════════
    // 3. BUSCAR PRODUTOS DO BANCO
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('📦 Buscando produtos do banco...');
    
    const [produtos] = await connection.query(`
      SELECT 
        id,
        produto_id,
        codigo_sku,
        nome,
        tipo,
        preco,
        eh_kit
      FROM relacao_produtos_kits_disparo_luna
      WHERE nome IS NOT NULL
      ORDER BY tipo DESC, nome ASC
    `);
    
    console.log(`✅ ${produtos.length} produtos encontrados\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. CRIAR NOVAS PASTAS
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('📁 Criando nova estrutura de pastas...\n');
    
    let criados = 0;
    let kits = 0;
    let individuais = 0;
    
    for (const produto of produtos) {
      // Limpar nome para uso em pasta (remover caracteres especiais)
      const nomeSeguro = produto.nome
        .replace(/[<>:"/\\|?*]/g, '')  // Remove caracteres inválidos
        .replace(/\s+/g, ' ')           // Remove espaços múltiplos
        .trim()
        .substring(0, 100);             // Limita tamanho
      
      // Formato: [TIPO]_[SKU]_[NOME]
      const prefixo = produto.tipo === 'kit_composto' ? 'KIT' : 'PROD';
      const sku = produto.codigo_sku || 'SEM_SKU';
      const nomePasta = `${prefixo}_${sku}_${nomeSeguro}`;
      
      const pastaProduto = path.join(CATALOGO_BASE, nomePasta);
      
      // Criar pasta
      await fs.mkdir(pastaProduto, { recursive: true });
      
      criados++;
      if (produto.tipo === 'kit_composto') kits++;
      else individuais++;
      
      // Log a cada 50 produtos
      if (criados % 50 === 0) {
        console.log(`   📝 ${criados}/${produtos.length} pastas criadas...`);
      }
    }

    console.log('\n✅ Estrutura criada com sucesso!\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 5. ESTATÍSTICAS FINAIS
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 ESTATÍSTICAS DA MIGRAÇÃO');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total de pastas criadas: ${criados}`);
    console.log(`  → Produtos individuais: ${individuais}`);
    console.log(`  → Kits compostos: ${kits}`);
    console.log('═══════════════════════════════════════════════════════\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 6. EXEMPLOS DE PASTAS CRIADAS
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('📋 EXEMPLOS DE PASTAS CRIADAS:\n');
    
    const pastasFinais = await fs.readdir(CATALOGO_BASE);
    const exemplosKits = pastasFinais.filter(p => p.startsWith('KIT_')).slice(0, 5);
    const exemplosProd = pastasFinais.filter(p => p.startsWith('PROD_')).slice(0, 5);
    
    console.log('🔹 KITS:');
    exemplosKits.forEach(p => console.log(`   ${p}`));
    
    console.log('\n🔹 PRODUTOS:');
    exemplosProd.forEach(p => console.log(`   ${p}`));
    
    console.log('\n✅ Migração concluída com sucesso!\n');
    
    console.log('📝 PRÓXIMOS PASSOS:');
    console.log('   1. Backend atualizado para buscar do banco');
    console.log('   2. Frontend atualizado para nova estrutura');
    console.log('   3. Upload de thumbs (manual ou via interface)');
    console.log('   4. Carrossel de kits = thumbs dos componentes\n');

  } catch (error) {
    console.error('❌ Erro durante migração:', error.message);
    console.error(error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada.');
    }
  }
}

// Executar
migrarEstrutura()
  .then(() => {
    console.log('\n🎉 Script finalizado!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Falha na migração:', err);
    process.exit(1);
  });
