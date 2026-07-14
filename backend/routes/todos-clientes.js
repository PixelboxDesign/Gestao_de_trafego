import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/todos-clientes
 * BUSCA ABSOLUTAMENTE TODOS OS CLIENTES DE TODAS AS TABELAS
 * Varre TODAS as tabelas do database para não deixar nenhum cliente de fora
 */
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Buscando TODOS os clientes de TODAS as tabelas...');

    // SQL GIGANTE que busca de TODAS as tabelas possíveis
    const sql = `
      SELECT DISTINCT 
        TRIM(nome) as nome,
        fonte,
        email,
        telefone,
        cidade,
        estado
      FROM (
        -- ============================================
        -- BLING E-COMMERCE
        -- ============================================
        SELECT DISTINCT
          contato_nome as nome,
          'Bling E-commerce - Pedidos' as fonte,
          NULL as email,
          NULL as telefone,
          NULL as cidade,
          NULL as estado
        FROM bling_pedidos_venda_ecommerce
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        UNION
        
        SELECT DISTINCT
          contato_nome as nome,
          'Bling E-commerce - Pedidos Detalhes' as fonte,
          NULL as email,
          NULL as telefone,
          NULL as cidade,
          NULL as estado
        FROM bling_pedidos_venda_detalhes_ecommerce
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        UNION
        
        SELECT DISTINCT
          contato_nome as nome,
          'Bling E-commerce - NFe Saída' as fonte,
          NULL as email,
          NULL as telefone,
          NULL as cidade,
          NULL as estado
        FROM bling_nfe_saida_detalhes_ecommerce
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        -- ============================================
        -- BLING DISTRIBUIÇÃO
        -- ============================================
        UNION
        
        SELECT DISTINCT
          contato_nome as nome,
          'Bling Distribuição - Pedidos' as fonte,
          NULL as email,
          NULL as telefone,
          NULL as cidade,
          NULL as estado
        FROM bling_pedidos_venda_distribuicao
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        UNION
        
        SELECT DISTINCT
          contato_nome as nome,
          'Bling Distribuição - Pedidos Detalhes' as fonte,
          NULL as email,
          NULL as telefone,
          NULL as cidade,
          NULL as estado
        FROM bling_pedidos_venda_detalhes_distribuicao
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        UNION
        
        SELECT DISTINCT
          contato_nome as nome,
          'Bling Distribuição - NFe Saída' as fonte,
          NULL as email,
          NULL as telefone,
          NULL as cidade,
          NULL as estado
        FROM bling_nfe_saida_detalhes_distribuicao
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        -- ============================================
        -- TRAY E-COMMERCE
        -- ============================================
        UNION
        
        SELECT DISTINCT
          name as nome,
          'Tray E-commerce' as fonte,
          email,
          NULL as telefone,
          city as cidade,
          state as estado
        FROM clientes_tray_ecommerce
        WHERE name IS NOT NULL AND TRIM(name) != ''
        
        UNION
        
        SELECT DISTINCT
          name as nome,
          'Tray E-commerce Deltas' as fonte,
          email,
          NULL as telefone,
          city as cidade,
          state as estado
        FROM clientes_tray_ecommerce_deltas
        WHERE name IS NOT NULL AND TRIM(name) != ''
        
        UNION
        
        SELECT DISTINCT
          name as nome,
          'Tray E-commerce Deltas Fixed' as fonte,
          email,
          NULL as telefone,
          city as cidade,
          state as estado
        FROM clientes_tray_ecommerce_deltas_fixed
        WHERE name IS NOT NULL AND TRIM(name) != ''
        
        -- ============================================
        -- TRAY DISTRIBUIÇÃO
        -- ============================================
        UNION
        
        SELECT DISTINCT
          name as nome,
          'Tray Distribuição' as fonte,
          email,
          NULL as telefone,
          city as cidade,
          state as estado
        FROM clientes_tray_distribuicao
        WHERE name IS NOT NULL AND TRIM(name) != ''
        
        -- ============================================
        -- PEDIDOS TRAY E-COMMERCE
        -- ============================================
        UNION
        
        SELECT DISTINCT
          customer_name as nome,
          'Tray Pedidos E-commerce' as fonte,
          customer_email as email,
          customer_cellphone as telefone,
          customer_city as cidade,
          customer_state as estado
        FROM pedidos_ecommerce_tray
        WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
        
        UNION
        
        SELECT DISTINCT
          customer_name as nome,
          'Tray Pedidos E-commerce Detalhes' as fonte,
          customer_email as email,
          customer_cellphone as telefone,
          customer_city as cidade,
          customer_state as estado
        FROM tray_ecommerce_pedidos_detalhes
        WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
        
        UNION
        
        SELECT DISTINCT
          customer_name as nome,
          'Tray Pedidos E-commerce Detalhes (Alt)' as fonte,
          customer_email as email,
          customer_cellphone as telefone,
          customer_city as cidade,
          customer_state as estado
        FROM detalhes_pedidos_ecommerce_tray
        WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
        
        -- ============================================
        -- PEDIDOS TRAY DISTRIBUIÇÃO
        -- ============================================
        UNION
        
        SELECT DISTINCT
          customer_name as nome,
          'Tray Pedidos Distribuição' as fonte,
          customer_email as email,
          customer_cellphone as telefone,
          customer_city as cidade,
          customer_state as estado
        FROM pedidos_distribuicao_tray
        WHERE customer_name IS NOT NULL AND TRIM(customer_name) != ''
        
        -- ============================================
        -- TRAY CUSTOMERS
        -- ============================================
        UNION
        
        SELECT DISTINCT
          CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as nome,
          'Tray Customers' as fonte,
          email,
          cellphone as telefone,
          NULL as cidade,
          NULL as estado
        FROM tray_customers_attributesdist
        WHERE first_name IS NOT NULL AND TRIM(first_name) != ''
        
        UNION
        
        SELECT DISTINCT
          CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) as nome,
          'Tray Customers E-commerce' as fonte,
          email,
          cellphone as telefone,
          NULL as cidade,
          NULL as estado
        FROM tray_customers_attributes
        WHERE first_name IS NOT NULL AND TRIM(first_name) != ''
        
      ) todos_clientes
      WHERE nome IS NOT NULL 
        AND TRIM(nome) != ''
        AND LENGTH(TRIM(nome)) > 2
      ORDER BY nome ASC
    `;

    console.log('📊 Executando query gigante...');
    const clientes = await query(sql);
    
    console.log(`✅ Encontrados ${clientes.length} clientes únicos!`);

    // Agrupar por fonte
    const porFonte = clientes.reduce((acc, cliente) => {
      if (!acc[cliente.fonte]) {
        acc[cliente.fonte] = 0;
      }
      acc[cliente.fonte]++;
      return acc;
    }, {});

    res.json({
      total: clientes.length,
      clientes: clientes,
      resumo: {
        totalClientes: clientes.length,
        porFonte: porFonte,
        fontes: Object.keys(porFonte).length
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar todos os clientes:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar clientes',
      message: error.message 
    });
  }
});

/**
 * GET /api/todos-clientes/sem-duplicatas
 * Retorna lista única de nomes (remove duplicatas entre fontes)
 */
router.get('/sem-duplicatas', async (req, res) => {
  try {
    console.log('🔍 Buscando clientes únicos (sem duplicatas)...');

    const sql = `
      SELECT 
        nome,
        COUNT(DISTINCT fonte) as total_fontes,
        GROUP_CONCAT(DISTINCT fonte SEPARATOR ' | ') as fontes,
        MAX(email) as email,
        MAX(telefone) as telefone,
        MAX(cidade) as cidade,
        MAX(estado) as estado
      FROM (
        -- Mesma query gigante aqui (copiar do endpoint acima)
        SELECT DISTINCT
          TRIM(contato_nome) as nome,
          'Bling E-commerce' as fonte,
          NULL as email,
          NULL as telefone,
          NULL as cidade,
          NULL as estado
        FROM bling_pedidos_venda_ecommerce
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        UNION
        
        SELECT DISTINCT
          TRIM(name) as nome,
          'Tray E-commerce' as fonte,
          email,
          NULL as telefone,
          city as cidade,
          state as estado
        FROM clientes_tray_ecommerce
        WHERE name IS NOT NULL AND TRIM(name) != ''
        
        -- ... (adicionar todas as outras sources)
      ) todos
      WHERE nome IS NOT NULL 
        AND TRIM(nome) != ''
        AND LENGTH(TRIM(nome)) > 2
      GROUP BY nome
      ORDER BY nome ASC
    `;

    const clientes = await query(sql);
    
    console.log(`✅ ${clientes.length} clientes únicos (sem duplicatas)!`);

    res.json({
      total: clientes.length,
      clientes: clientes
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar clientes únicos',
      message: error.message 
    });
  }
});

export default router;
