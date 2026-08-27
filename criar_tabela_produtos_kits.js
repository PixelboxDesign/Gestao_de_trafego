/**
 * Script para criar tabela consolidada de produtos e kits
 * Tabela: relacao_produtos_kits_disparo_luna
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: './backend/.env' });

async function criarTabelaConsolidada() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao banco de dados...');
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'luna_cosmeticos'
    });

    console.log('✅ Conectado ao MySQL!\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 1. CRIAR TABELA
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('📊 Criando tabela relacao_produtos_kits_disparo_luna...');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS relacao_produtos_kits_disparo_luna (
        id INT AUTO_INCREMENT PRIMARY KEY,
        
        -- Informações do Produto/Kit
        produto_id VARCHAR(255),
        codigo_sku VARCHAR(255),
        nome VARCHAR(500),
        tipo ENUM('produto_individual', 'kit_composto') DEFAULT 'produto_individual',
        preco DECIMAL(10, 2),
        preco_custo DECIMAL(10, 2),
        descricao TEXT,
        imagem_url TEXT,
        estoque_virtual DECIMAL(10, 2),
        situacao VARCHAR(50),
        formato VARCHAR(100),
        
        -- Informações de Kit (se for kit_composto)
        eh_kit BOOLEAN DEFAULT FALSE,
        estrutura_lancamento_estoque VARCHAR(100),
        estrutura_tipo_estoque VARCHAR(100),
        
        -- Componentes (se for kit, array JSON dos componentes)
        componentes JSON,
        
        -- Metadata
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        -- Índices
        INDEX idx_produto_id (produto_id),
        INDEX idx_codigo_sku (codigo_sku),
        INDEX idx_tipo (tipo),
        INDEX idx_eh_kit (eh_kit),
        INDEX idx_nome (nome(255))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✅ Tabela criada com sucesso!\n');

    // ═══════════════════════════════════════════════════════════════════════
    // 2. BUSCAR TODOS OS PRODUTOS DO BLING
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('📦 Buscando produtos do Bling...');
    
    const [produtos] = await connection.query(`
      SELECT 
        id,
        codigo,
        nome,
        preco,
        precocusto,
        descricaocurta,
        imagemurl,
        estoque_saldovirtualtotal,
        situacao,
        tipo,
        formato
      FROM bling_produtos_ecommerce
      ORDER BY nome
    `);
    
    console.log(`✅ Encontrados ${produtos.length} produtos\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // 3. BUSCAR ESTRUTURAS DE KITS
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('🧩 Buscando estruturas de kits...');
    
    const [estruturas] = await connection.query(`
      SELECT 
        produto_pai_id,
        estrutura_lancamentoestoque,
        estrutura_tipoestoque
      FROM bling_produtos_estruturas_ecommerce
    `);
    
    // Mapa de IDs de kits
    const kitsIds = new Set(estruturas.map(e => e.produto_pai_id));
    
    console.log(`✅ Encontrados ${estruturas.length} kits com estrutura\n`);

    // ═══════════════════════════════════════════════════════════════════════
    // 4. BUSCAR COMPONENTES DE CADA KIT
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('🔗 Buscando componentes dos kits...');
    
    const [componentes] = await connection.query(`
      SELECT 
        produto_pai_id,
        componentes_produto_id,
        componentes_quantidade
      FROM bling_produtos_estruturas_componentes_ecommerce
      ORDER BY produto_pai_id
    `);
    
    console.log(`✅ Encontrados ${componentes.length} componentes\n`);

    // Agrupar componentes por kit
    const componentesPorKit = {};
    for (const comp of componentes) {
      if (!componentesPorKit[comp.produto_pai_id]) {
        componentesPorKit[comp.produto_pai_id] = [];
      }
      componentesPorKit[comp.produto_pai_id].push({
        produto_id: comp.componentes_produto_id,
        quantidade: comp.componentes_quantidade
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 5. INSERIR PRODUTOS NA NOVA TABELA
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('💾 Inserindo produtos na tabela consolidada...');
    
    let totalInseridos = 0;
    let totalKits = 0;
    let totalIndividuais = 0;
    
    for (const produto of produtos) {
      const ehKit = kitsIds.has(produto.id);
      const estruturaKit = estruturas.find(e => e.produto_pai_id === produto.id);
      const componentesKit = componentesPorKit[produto.id] || null;
      
      // Buscar nomes dos componentes
      let componentesDetalhados = null;
      if (componentesKit && componentesKit.length > 0) {
        componentesDetalhados = [];
        for (const comp of componentesKit) {
          const [produtosComp] = await connection.query(
            'SELECT nome, codigo FROM bling_produtos_ecommerce WHERE id = ?',
            [comp.produto_id]
          );
          
          if (produtosComp.length > 0) {
            componentesDetalhados.push({
              produto_id: comp.produto_id,
              sku: produtosComp[0].codigo || null,
              nome: produtosComp[0].nome || null,
              quantidade: parseFloat(comp.quantidade) || 1
            });
          }
        }
      }
      
      // Converter para string JSON
      const componentesJSON = componentesDetalhados && componentesDetalhados.length > 0
        ? JSON.stringify(componentesDetalhados)
        : null;
      
      await connection.query(`
        INSERT INTO relacao_produtos_kits_disparo_luna (
          produto_id,
          codigo_sku,
          nome,
          tipo,
          preco,
          preco_custo,
          descricao,
          imagem_url,
          estoque_virtual,
          situacao,
          formato,
          eh_kit,
          estrutura_lancamento_estoque,
          estrutura_tipo_estoque,
          componentes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        produto.id,
        produto.codigo || null,
        produto.nome || null,
        ehKit ? 'kit_composto' : 'produto_individual',
        produto.preco || null,
        produto.precocusto || null,
        produto.descricaocurta || null,
        produto.imagemurl || null,
        produto.estoque_saldovirtualtotal || null,
        produto.situacao || null,
        produto.formato || null,
        ehKit,
        estruturaKit?.estrutura_lancamentoestoque || null,
        estruturaKit?.estrutura_tipoestoque || null,
        componentesJSON
      ]);
      
      totalInseridos++;
      if (ehKit) totalKits++;
      else totalIndividuais++;
      
      // Log a cada 50 produtos
      if (totalInseridos % 50 === 0) {
        console.log(`   📝 ${totalInseridos}/${produtos.length} produtos processados...`);
      }
    }

    console.log('\n✅ Inserção concluída!\n');
    
    // ═══════════════════════════════════════════════════════════════════════
    // 6. ESTATÍSTICAS FINAIS
    // ═══════════════════════════════════════════════════════════════════════
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 ESTATÍSTICAS FINAIS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Total de produtos inseridos: ${totalInseridos}`);
    console.log(`  → Produtos individuais: ${totalIndividuais}`);
    console.log(`  → Kits compostos: ${totalKits}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Exemplos de produtos inseridos
    console.log('📋 EXEMPLOS DE PRODUTOS INSERIDOS:\n');
    
    const [exemplosIndividuais] = await connection.query(`
      SELECT 
        codigo_sku,
        nome,
        preco,
        tipo
      FROM relacao_produtos_kits_disparo_luna
      WHERE tipo = 'produto_individual' AND preco IS NOT NULL
      LIMIT 5
    `);
    
    console.log('🔹 PRODUTOS INDIVIDUAIS:');
    exemplosIndividuais.forEach(p => {
      console.log(`   ${p.codigo_sku || 'SEM SKU'} - ${p.nome} - R$ ${p.preco || 'SEM PREÇO'}`);
    });
    
    const [exemplosKits] = await connection.query(`
      SELECT 
        codigo_sku,
        nome,
        preco,
        tipo,
        componentes
      FROM relacao_produtos_kits_disparo_luna
      WHERE tipo = 'kit_composto' AND componentes IS NOT NULL
      LIMIT 3
    `);
    
    console.log('\n🔹 KITS COMPOSTOS:');
    exemplosKits.forEach(k => {
      console.log(`   ${k.codigo_sku || 'SEM SKU'} - ${k.nome} - R$ ${k.preco || 'SEM PREÇO'}`);
      const comps = JSON.parse(k.componentes);
      comps.forEach(c => {
        console.log(`      → ${c.quantidade}x ${c.nome} (${c.sku || 'sem SKU'})`);
      });
    });
    
    console.log('\n✅ Script concluído com sucesso!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexão fechada.');
    }
  }
}

// Executar
criarTabelaConsolidada()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
