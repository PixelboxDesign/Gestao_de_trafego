import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/pedidos
 * Lista pedidos com filtros
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const origem = req.query.origem; // 'ecommerce' ou 'distribuicao'

    let sql = '';
    let countSql = '';

    if (origem === 'ecommerce') {
      countSql = `SELECT COUNT(*) as total FROM bling_pedidos_venda_ecommerce`;
      sql = `
        SELECT 
          id,
          contato_nome as cliente,
          data,
          total,
          situacao_valor as status,
          'E-commerce' as origem
        FROM bling_pedidos_venda_ecommerce
        ORDER BY data DESC
        LIMIT ? OFFSET ?
      `;
    } else if (origem === 'distribuicao') {
      countSql = `SELECT COUNT(*) as total FROM bling_pedidos_venda_distribuicao`;
      sql = `
        SELECT 
          id,
          contato_nome as cliente,
          data,
          total,
          situacao_valor as status,
          'Distribuição' as origem
        FROM bling_pedidos_venda_distribuicao
        ORDER BY data DESC
        LIMIT ? OFFSET ?
      `;
    } else {
      countSql = `
        SELECT 
          (SELECT COUNT(*) FROM bling_pedidos_venda_ecommerce) +
          (SELECT COUNT(*) FROM bling_pedidos_venda_distribuicao) as total
      `;
      sql = `
        SELECT 
          id,
          contato_nome as cliente,
          data,
          total,
          situacao_valor as status,
          'E-commerce' as origem
        FROM bling_pedidos_venda_ecommerce
        
        UNION ALL
        
        SELECT 
          id,
          contato_nome as cliente,
          data,
          total,
          situacao_valor as status,
          'Distribuição' as origem
        FROM bling_pedidos_venda_distribuicao
        
        ORDER BY data DESC
        LIMIT ? OFFSET ?
      `;
    }

    const totalResult = await query(countSql);
    const total = totalResult[0]?.total || 0;

    const pedidos = await query(sql, [limit, offset]);

    res.json({
      data: pedidos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

/**
 * GET /api/pedidos/stats
 * Estatísticas de pedidos
 */
router.get('/stats', async (req, res) => {
  try {
    const statsSql = `
      SELECT 
        COUNT(*) as total_pedidos,
        SUM(total) as valor_total,
        AVG(total) as ticket_medio,
        'E-commerce' as origem
      FROM bling_pedidos_venda_ecommerce
      
      UNION ALL
      
      SELECT 
        COUNT(*) as total_pedidos,
        SUM(total) as valor_total,
        AVG(total) as ticket_medio,
        'Distribuição' as origem
      FROM bling_pedidos_venda_distribuicao
    `;

    const stats = await query(statsSql);

    res.json({ stats });
  } catch (error) {
    console.error('Erro ao buscar stats de pedidos:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

export default router;
