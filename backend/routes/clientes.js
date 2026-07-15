import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/clientes
 * Lista todos os clientes com paginação
 * REDIRECIONA para a query completa que varre TODAS as tabelas
 */
router.get('/', async (req, res) => {
  try {
    console.log('📥 GET /api/clientes - Buscando TODOS os clientes...');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // SQL BASE sem paginação
    const baseSql = `
      SELECT DISTINCT 
        TRIM(nome) as nome,
        fonte,
        email,
        cidade,
        estado
      FROM (
        -- BLING E-COMMERCE
        SELECT DISTINCT
          contato_nome as nome,
          'Bling E-commerce - Pedidos' as fonte,
          NULL as email,
          NULL as cidade,
          NULL as estado
        FROM bling_pedidos_venda_ecommerce
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        UNION
        
        SELECT DISTINCT
          contato_nome as nome,
          'Bling E-commerce - NFe Saída' as fonte,
          NULL as email,
          NULL as cidade,
          NULL as estado
        FROM bling_nfe_saida_detalhes_ecommerce
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        -- BLING DISTRIBUIÇÃO
        UNION
        
        SELECT DISTINCT
          contato_nome as nome,
          'Bling Distribuição - Pedidos' as fonte,
          NULL as email,
          NULL as cidade,
          NULL as estado
        FROM bling_pedidos_venda_distribuicao
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        UNION
        
        SELECT DISTINCT
          contato_nome as nome,
          'Bling Distribuição - NFe Saída' as fonte,
          NULL as email,
          NULL as cidade,
          NULL as estado
        FROM bling_nfe_saida_detalhes_distribuicao
        WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        
        -- TRAY E-COMMERCE
        UNION
        
        SELECT DISTINCT
          name as nome,
          'Tray E-commerce' as fonte,
          email,
          city as cidade,
          state as estado
        FROM clientes_tray_ecommerce
        WHERE name IS NOT NULL AND TRIM(name) != ''
        
        -- TRAY DISTRIBUIÇÃO
        UNION
        
        SELECT DISTINCT
          name as nome,
          'Tray Distribuição' as fonte,
          email,
          city as cidade,
          state as estado
        FROM clientes_tray_distribuicao
        WHERE name IS NOT NULL AND TRIM(name) != ''
        
      ) todos_clientes
      WHERE nome IS NOT NULL 
        AND TRIM(nome) != ''
        AND LENGTH(TRIM(nome)) > 2
    `;

    // Adicionar filtro de busca se necessário
    let whereCond = '';
    let params = [];
    
    if (search) {
      whereCond = ' AND nome LIKE ?';
      params.push(`%${search}%`);
    }

    // Query para contar total
    const countSql = baseSql + whereCond;
    const allClientes = await query(countSql, params);
    const total = allClientes.length;

    // Query com paginação
    const sql = baseSql + whereCond + ' ORDER BY nome ASC LIMIT ? OFFSET ?';
    const paginatedParams = [...params, limit, offset];
    const clientes = await query(sql, paginatedParams);
    
    console.log(`✅ Encontrados ${clientes.length} clientes de ${total} totais`);

    res.json({
      data: clientes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes', message: error.message });
  }
});

/**
 * GET /api/clientes/stats
 * Estatísticas gerais de clientes - TODAS AS TABELAS
 */
router.get('/stats', async (req, res) => {
  try {
    console.log('📊 GET /api/clientes/stats - Calculando estatísticas...');

    // Total de clientes únicos de TODAS as fontes
    const totalSql = `
      SELECT COUNT(DISTINCT TRIM(nome)) as total
      FROM (
        SELECT DISTINCT contato_nome as nome FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
        UNION
        SELECT DISTINCT contato_nome as nome FROM bling_pedidos_venda_distribuicao WHERE contato_nome IS NOT NULL
        UNION
        SELECT DISTINCT contato_nome as nome FROM bling_nfe_saida_detalhes_ecommerce WHERE contato_nome IS NOT NULL
        UNION
        SELECT DISTINCT contato_nome as nome FROM bling_nfe_saida_detalhes_distribuicao WHERE contato_nome IS NOT NULL
        UNION
        SELECT DISTINCT name as nome FROM clientes_tray_ecommerce WHERE name IS NOT NULL
        UNION
        SELECT DISTINCT name as nome FROM clientes_tray_distribuicao WHERE name IS NOT NULL
      ) clientes
      WHERE TRIM(nome) != '' AND LENGTH(TRIM(nome)) > 2
    `;
    const totalResult = await query(totalSql);
    const totalClientes = totalResult[0]?.total || 0;

    // Clientes por origem (detalhado)
    const origemSql = `
      SELECT fonte, COUNT(*) as total
      FROM (
        SELECT 'Bling E-commerce - Pedidos' as fonte FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION ALL
        SELECT 'Bling E-commerce - NFe' as fonte FROM bling_nfe_saida_detalhes_ecommerce WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION ALL
        SELECT 'Bling Distribuição - Pedidos' as fonte FROM bling_pedidos_venda_distribuicao WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION ALL
        SELECT 'Bling Distribuição - NFe' as fonte FROM bling_nfe_saida_detalhes_distribuicao WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION ALL
        SELECT 'Tray E-commerce' as fonte FROM clientes_tray_ecommerce WHERE name IS NOT NULL AND TRIM(name) != ''
        UNION ALL
        SELECT 'Tray Distribuição' as fonte FROM clientes_tray_distribuicao WHERE name IS NOT NULL AND TRIM(name) != ''
      ) origens
      GROUP BY fonte
      ORDER BY total DESC
    `;
    const origemResult = await query(origemSql);

    console.log(`✅ Total: ${totalClientes} clientes únicos`);

    res.json({
      totalClientes,
      porOrigem: origemResult,
      ultimaAtualizacao: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro ao buscar stats de clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas', message: error.message });
  }
});

/**
 * GET /api/clientes/:nome
 * Detalhes de um cliente específico
 */
router.get('/:nome', async (req, res) => {
  try {
    const { nome } = req.params;

    // Buscar pedidos do cliente
    const pedidosSql = `
      SELECT 
        id,
        data,
        total,
        situacao_valor,
        'E-commerce' as origem
      FROM bling_pedidos_venda_ecommerce
      WHERE contato_nome = ?
      
      UNION ALL
      
      SELECT 
        id,
        data,
        total,
        situacao_valor,
        'Distribuição' as origem
      FROM bling_pedidos_venda_distribuicao
      WHERE contato_nome = ?
      
      ORDER BY data DESC
      LIMIT 100
    `;

    const pedidos = await query(pedidosSql, [nome, nome]);

    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    // Calcular estatísticas
    const totalGasto = pedidos.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalPedidos = pedidos.length;
    const ticketMedio = totalGasto / totalPedidos;

    res.json({
      nome,
      pedidos,
      stats: {
        totalGasto,
        totalPedidos,
        ticketMedio
      }
    });
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

export default router;
