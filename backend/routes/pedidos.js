import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/pedidos — lista paginada
router.get('/', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const origem = req.query.origem || 'todos'; // 'ecommerce' | 'distribuicao' | 'todos'

    let table = '';
    let label = '';

    if (origem === 'ecommerce') {
      table = 'bling_pedidos_venda_ecommerce';
      label = 'E-commerce';
    } else if (origem === 'distribuicao') {
      table = 'bling_pedidos_venda_distribuicao';
      label = 'Distribuição';
    }

    if (table) {
      const [[{ total }]] = await Promise.all([query(`SELECT COUNT(*) AS total FROM ${table}`)]);
      const rows = await query(
        `SELECT id, contato_nome AS cliente, data, total, situacao_valor AS status, ? AS origem
           FROM ${table} ORDER BY data DESC LIMIT ? OFFSET ?`,
        [label, limit, offset]
      );
      return res.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
    }

    // Ambos combinados
    const countSql = `
      SELECT
        (SELECT COUNT(*) FROM bling_pedidos_venda_ecommerce) +
        (SELECT COUNT(*) FROM bling_pedidos_venda_distribuicao) AS total
    `;
    const listSql = `
      SELECT id, contato_nome AS cliente, data, total, situacao_valor AS status, 'E-commerce' AS origem
        FROM bling_pedidos_venda_ecommerce
      UNION ALL
      SELECT id, contato_nome, data, total, situacao_valor, 'Distribuição'
        FROM bling_pedidos_venda_distribuicao
      ORDER BY data DESC
      LIMIT ? OFFSET ?
    `;

    const [[{ total }], rows] = await Promise.all([
      query(countSql),
      query(listSql, [limit, offset]),
    ]);

    res.json({ data: rows, pagination: { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit) } });
  } catch (err) {
    console.error('GET /api/pedidos erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar pedidos', message: err.message });
  }
});

// GET /api/pedidos/stats
router.get('/stats', async (req, res) => {
  try {
    const sql = `
      SELECT origem, total_pedidos, valor_total, ticket_medio FROM (
        SELECT 'E-commerce' AS origem,
          COUNT(*)   AS total_pedidos,
          SUM(total) AS valor_total,
          AVG(total) AS ticket_medio
        FROM bling_pedidos_venda_ecommerce
        UNION ALL
        SELECT 'Distribuição',
          COUNT(*),
          SUM(total),
          AVG(total)
        FROM bling_pedidos_venda_distribuicao
      ) t
    `;
    const stats = await query(sql);
    res.json({ stats });
  } catch (err) {
    console.error('GET /api/pedidos/stats erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar stats de pedidos', message: err.message });
  }
});

export default router;
