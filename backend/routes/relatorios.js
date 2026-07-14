import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

/**
 * GET /api/relatorios/vendas
 * Relatório de vendas por período
 */
router.get('/vendas', async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    const sql = `
      SELECT 
        DATE(data) as dia,
        COUNT(*) as total_pedidos,
        SUM(total) as valor_total,
        AVG(total) as ticket_medio,
        'E-commerce' as origem
      FROM bling_pedidos_venda_ecommerce
      ${inicio && fim ? 'WHERE data BETWEEN ? AND ?' : ''}
      GROUP BY DATE(data), origem
      
      UNION ALL
      
      SELECT 
        DATE(data) as dia,
        COUNT(*) as total_pedidos,
        SUM(total) as valor_total,
        AVG(total) as ticket_medio,
        'Distribuição' as origem
      FROM bling_pedidos_venda_distribuicao
      ${inicio && fim ? 'WHERE data BETWEEN ? AND ?' : ''}
      GROUP BY DATE(data), origem
      
      ORDER BY dia DESC
      LIMIT 365
    `;

    const params = inicio && fim ? [inicio, fim, inicio, fim] : [];
    const vendas = await query(sql, params);

    res.json({ data: vendas });
  } catch (error) {
    console.error('Erro ao gerar relatório de vendas:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

/**
 * GET /api/relatorios/roi
 * Relatório de ROI de campanhas
 */
router.get('/roi', async (req, res) => {
  try {
    // Calcular ROI baseado em gastos com ads vs vendas
    const sql = `
      SELECT 
        DATE(date_start) as dia,
        SUM(spend) as gasto_total,
        SUM(conversions) as conversoes
      FROM facebook_ad_details
      GROUP BY DATE(date_start)
      ORDER BY dia DESC
      LIMIT 90
    `;

    const dados = await query(sql);

    res.json({ data: dados });
  } catch (error) {
    console.error('Erro ao gerar relatório de ROI:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório de ROI' });
  }
});

/**
 * GET /api/relatorios/top-clientes
 * Top clientes por valor de compra
 */
router.get('/top-clientes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const sql = `
      SELECT 
        contato_nome as cliente,
        COUNT(*) as total_pedidos,
        SUM(total) as valor_total,
        AVG(total) as ticket_medio
      FROM (
        SELECT contato_nome, total FROM bling_pedidos_venda_ecommerce
        UNION ALL
        SELECT contato_nome, total FROM bling_pedidos_venda_distribuicao
      ) pedidos
      WHERE contato_nome IS NOT NULL AND contato_nome != ''
      GROUP BY contato_nome
      ORDER BY valor_total DESC
      LIMIT ?
    `;

    const topClientes = await query(sql, [limit]);

    res.json({ data: topClientes });
  } catch (error) {
    console.error('Erro ao buscar top clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar top clientes' });
  }
});

export default router;
