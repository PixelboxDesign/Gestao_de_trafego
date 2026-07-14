import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/clientes
 * Lista todos os clientes com paginação
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Query para contar total
    const countSql = `
      SELECT COUNT(DISTINCT nome) as total
      FROM (
        SELECT DISTINCT contato_nome as nome
        FROM bling_pedidos_venda_ecommerce
        WHERE contato_nome IS NOT NULL AND contato_nome != ''
        
        UNION
        
        SELECT DISTINCT contato_nome as nome
        FROM bling_pedidos_venda_distribuicao
        WHERE contato_nome IS NOT NULL AND contato_nome != ''
        
        UNION
        
        SELECT DISTINCT name as nome
        FROM clientes_tray_distribuicao
        WHERE name IS NOT NULL AND name != ''
      ) clientes_unicos
      ${search ? 'WHERE nome LIKE ?' : ''}
    `;

    const totalResult = await query(countSql, search ? [`%${search}%`] : []);
    const total = totalResult[0]?.total || 0;

    // Query para buscar clientes
    const clientesSql = `
      SELECT DISTINCT nome, fonte
      FROM (
        SELECT DISTINCT 
          contato_nome as nome,
          'Bling E-commerce' as fonte,
          MAX(data) as ultima_compra
        FROM bling_pedidos_venda_ecommerce
        WHERE contato_nome IS NOT NULL AND contato_nome != ''
        GROUP BY contato_nome
        
        UNION
        
        SELECT DISTINCT 
          contato_nome as nome,
          'Bling Distribuição' as fonte,
          MAX(data) as ultima_compra
        FROM bling_pedidos_venda_distribuicao
        WHERE contato_nome IS NOT NULL AND contato_nome != ''
        GROUP BY contato_nome
        
        UNION
        
        SELECT DISTINCT 
          name as nome,
          'Tray Distribuição' as fonte,
          created as ultima_compra
        FROM clientes_tray_distribuicao
        WHERE name IS NOT NULL AND name != ''
      ) clientes_unicos
      ${search ? 'WHERE nome LIKE ?' : ''}
      ORDER BY nome
      LIMIT ? OFFSET ?
    `;

    const params = search ? [`%${search}%`, limit, offset] : [limit, offset];
    const clientes = await query(clientesSql, params);

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
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

/**
 * GET /api/clientes/stats
 * Estatísticas gerais de clientes
 */
router.get('/stats', async (req, res) => {
  try {
    // Total de clientes únicos
    const totalSql = `
      SELECT COUNT(DISTINCT nome) as total
      FROM (
        SELECT DISTINCT contato_nome as nome FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
        UNION
        SELECT DISTINCT contato_nome as nome FROM bling_pedidos_venda_distribuicao WHERE contato_nome IS NOT NULL
        UNION
        SELECT DISTINCT name as nome FROM clientes_tray_distribuicao WHERE name IS NOT NULL
      ) clientes
    `;
    const totalResult = await query(totalSql);
    const totalClientes = totalResult[0]?.total || 0;

    // Clientes por origem
    const origemSql = `
      SELECT fonte, COUNT(*) as total
      FROM (
        SELECT 'E-commerce' as fonte FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
        UNION ALL
        SELECT 'Distribuição' as fonte FROM bling_pedidos_venda_distribuicao WHERE contato_nome IS NOT NULL
        UNION ALL
        SELECT 'Tray' as fonte FROM clientes_tray_distribuicao WHERE name IS NOT NULL
      ) origens
      GROUP BY fonte
    `;
    const origemResult = await query(origemSql);

    res.json({
      totalClientes,
      porOrigem: origemResult
    });
  } catch (error) {
    console.error('Erro ao buscar stats de clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
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
