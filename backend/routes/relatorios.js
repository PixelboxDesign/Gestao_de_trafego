import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/relatorios/vendas
router.get('/vendas', async (req, res) => {
  try {
    const { inicio, fim } = req.query;
    const hasRange = inicio && fim;

    const whereCond = hasRange ? 'WHERE data BETWEEN ? AND ?' : '';
    const params    = hasRange ? [inicio, fim] : [];

    const sql = `
      SELECT DATE(data) AS dia, COUNT(*) AS total_pedidos, SUM(total) AS valor_total,
             AVG(total) AS ticket_medio, 'E-commerce' AS origem
        FROM bling_pedidos_venda_ecommerce ${whereCond}
       GROUP BY DATE(data)
      UNION ALL
      SELECT DATE(data), COUNT(*), SUM(total), AVG(total), 'Distribuição'
        FROM bling_pedidos_venda_distribuicao ${whereCond}
       GROUP BY DATE(data)
      ORDER BY dia DESC
      LIMIT 365
    `;

    const vendas = await query(sql, [...params, ...params]);
    res.json({ data: vendas });
  } catch (err) {
    console.error('GET /api/relatorios/vendas erro:', err.message);
    res.status(500).json({ error: 'Erro ao gerar relatório de vendas', message: err.message });
  }
});

// GET /api/relatorios/roi
router.get('/roi', async (req, res) => {
  try {
    const sql = `
      SELECT DATE(date_start) AS dia, SUM(spend) AS gasto_total, SUM(conversions) AS conversoes
        FROM facebook_ad_details
       GROUP BY DATE(date_start)
       ORDER BY dia DESC
       LIMIT 90
    `;
    const dados = await query(sql);
    res.json({ data: dados });
  } catch (err) {
    console.error('GET /api/relatorios/roi erro:', err.message);
    // Retornar vazio em vez de 500 — tabela pode estar sem dados
    res.json({ data: [] });
  }
});

// GET /api/relatorios/top-clientes
router.get('/top-clientes', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

    const sql = `
      SELECT contato_nome AS cliente,
             COUNT(*)   AS total_pedidos,
             SUM(total) AS valor_total,
             AVG(total) AS ticket_medio
        FROM (
          SELECT contato_nome, total FROM bling_pedidos_venda_ecommerce
           WHERE contato_nome IS NOT NULL AND contato_nome != ''
          UNION ALL
          SELECT contato_nome, total FROM bling_pedidos_venda_distribuicao
           WHERE contato_nome IS NOT NULL AND contato_nome != ''
        ) todos
       GROUP BY contato_nome
       ORDER BY valor_total DESC
       LIMIT ?
    `;

    // Passar limit como Number — pool.query() aceita sem problema
    const topClientes = await query(sql, [limit]);
    res.json({ data: topClientes });
  } catch (err) {
    console.error('GET /api/relatorios/top-clientes erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar top clientes', message: err.message });
  }
});

export default router;
