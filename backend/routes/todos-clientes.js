import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/todos-clientes — paginado para não explodir com 190k registros
router.get('/', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const whereCond  = search ? 'AND nome LIKE ?' : '';
    const searchParam = search ? [`%${search}%`] : [];

    console.log(`🔍 /api/todos-clientes page=${page} limit=${limit}`);

    // Contagem total (COUNT no banco)
    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT DISTINCT nome FROM (
          SELECT DISTINCT TRIM(contato_nome) AS nome FROM bling_pedidos_venda_ecommerce    WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(contato_nome)          FROM bling_nfe_saida_detalhes_ecommerce  WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(contato_nome)          FROM bling_pedidos_venda_distribuicao    WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(contato_nome)          FROM bling_nfe_saida_detalhes_distribuicao WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(name)                  FROM clientes_tray_ecommerce              WHERE name IS NOT NULL AND TRIM(name) != ''
          UNION
          SELECT DISTINCT TRIM(name)                  FROM clientes_tray_distribuicao            WHERE name IS NOT NULL AND TRIM(name) != ''
        ) base WHERE LENGTH(nome) > 2 ${whereCond}
      ) counted
    `;

    const listSql = `
      SELECT DISTINCT nome, fonte, email, cidade, estado
      FROM (
        SELECT DISTINCT TRIM(contato_nome) AS nome, 'Bling E-commerce - Pedidos'     AS fonte, NULL AS email, NULL AS cidade, NULL AS estado FROM bling_pedidos_venda_ecommerce      WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION
        SELECT DISTINCT TRIM(contato_nome), 'Bling E-commerce - NFe',                  NULL, NULL, NULL FROM bling_nfe_saida_detalhes_ecommerce  WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION
        SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - Pedidos',             NULL, NULL, NULL FROM bling_pedidos_venda_distribuicao    WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION
        SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - NFe',                 NULL, NULL, NULL FROM bling_nfe_saida_detalhes_distribuicao WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION
        SELECT DISTINCT TRIM(name), 'Tray E-commerce', email, city, state FROM clientes_tray_ecommerce   WHERE name IS NOT NULL AND TRIM(name) != ''
        UNION
        SELECT DISTINCT TRIM(name), 'Tray Distribuição', email, city, state FROM clientes_tray_distribuicao WHERE name IS NOT NULL AND TRIM(name) != ''
      ) todos
      WHERE LENGTH(nome) > 2 ${whereCond}
      ORDER BY nome ASC
      LIMIT ? OFFSET ?
    `;

    const [countResult, clientes] = await Promise.all([
      query(countSql, searchParam),
      query(listSql,  [...searchParam, limit, offset]),
    ]);

    const total = Number(countResult[0]?.total || 0);

    // Resumo por fonte para a página atual
    const porFonte = {};
    for (const c of clientes) {
      porFonte[c.fonte] = (porFonte[c.fonte] || 0) + 1;
    }

    console.log(`✅ /api/todos-clientes: ${clientes.length} de ${total}`);

    res.json({
      total,
      clientes,
      resumo: {
        totalClientes: total,
        porFonte,
        fontes: Object.keys(porFonte).length,
      },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('/api/todos-clientes erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar clientes', message: err.message });
  }
});

export default router;
