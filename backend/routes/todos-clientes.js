import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/todos-clientes — paginado, com telefone via 4 fontes em cascata
router.get('/', async (req, res) => {
  try {
    const page        = Math.max(1, parseInt(req.query.page)  || 1);
    const limit       = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200));
    const offset      = (page - 1) * limit;
    const search      = (req.query.search || '').trim();
    const whereCond   = search ? 'AND nome LIKE ?' : '';
    const searchParam = search ? [`%${search}%`] : [];

    console.log(`🔍 /api/todos-clientes page=${page} limit=${limit} search="${search}"`);

    // ── Contagem ─────────────────────────────────────────────────────────────
    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT DISTINCT nome FROM (
          SELECT DISTINCT TRIM(contato_nome) AS nome FROM bling_pedidos_venda_ecommerce      WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(contato_nome)          FROM bling_nfe_saida_detalhes_ecommerce    WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(contato_nome)          FROM bling_pedidos_venda_distribuicao      WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(contato_nome)          FROM bling_nfe_saida_detalhes_distribuicao WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(name)                  FROM clientes_tray_ecommerce              WHERE name IS NOT NULL AND TRIM(name) != ''
          UNION
          SELECT DISTINCT TRIM(name)                  FROM clientes_tray_distribuicao            WHERE name IS NOT NULL AND TRIM(name) != ''
        ) base WHERE LENGTH(nome) > 2 ${whereCond}
      ) counted
    `;

    // ── Lista paginada com telefone em cascata (4 fontes) ────────────────────
    //
    // Prioridade de busca de telefone:
    //   1. NFe ecommerce pelo contato_id do pedido (mais preciso — mesmo ID)
    //   2. NFe distribuição pelo contato_id do pedido
    //   3. NFe ecommerce pelo nome (match direto)
    //   4. NFe distribuição pelo nome
    //   5. NFe ecommerce pelo email (para clientes Tray)
    //   6. NFe distribuição pelo email
    //
    const listSql = `
      SELECT
        t.nome,
        t.fonte,
        t.email,
        t.cidade,
        t.estado,
        COALESCE(
          -- Fonte 1: contato_id do pedido ecommerce → NFe ecommerce
          NULLIF(TRIM((
            SELECT n.contato_telefone
            FROM bling_pedidos_venda_ecommerce p
            JOIN bling_nfe_saida_detalhes_ecommerce n ON n.contato_id = p.contato_id
            WHERE TRIM(p.contato_nome) = t.nome
              AND p.contato_id IS NOT NULL AND p.contato_id != '0'
              AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
            LIMIT 1
          )), ''),
          -- Fonte 2: contato_id do pedido distribuição → NFe distribuição
          NULLIF(TRIM((
            SELECT n.contato_telefone
            FROM bling_pedidos_venda_distribuicao p
            JOIN bling_nfe_saida_detalhes_distribuicao n ON n.contato_id = p.contato_id
            WHERE TRIM(p.contato_nome) = t.nome
              AND p.contato_id IS NOT NULL AND p.contato_id != '0'
              AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
            LIMIT 1
          )), ''),
          -- Fonte 3: nome direto → NFe ecommerce
          NULLIF(TRIM((
            SELECT contato_telefone
            FROM bling_nfe_saida_detalhes_ecommerce
            WHERE TRIM(contato_nome) = t.nome
              AND contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
            LIMIT 1
          )), ''),
          -- Fonte 4: nome direto → NFe distribuição
          NULLIF(TRIM((
            SELECT contato_telefone
            FROM bling_nfe_saida_detalhes_distribuicao
            WHERE TRIM(contato_nome) = t.nome
              AND contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
            LIMIT 1
          )), ''),
          -- Fonte 5: email → NFe ecommerce (cobre clientes Tray)
          NULLIF(TRIM((
            SELECT n.contato_telefone
            FROM bling_nfe_saida_detalhes_ecommerce n
            WHERE TRIM(n.contato_email) = TRIM(t.email)
              AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
              AND t.email IS NOT NULL AND TRIM(t.email) != ''
            LIMIT 1
          )), ''),
          -- Fonte 6: email → NFe distribuição
          NULLIF(TRIM((
            SELECT n.contato_telefone
            FROM bling_nfe_saida_detalhes_distribuicao n
            WHERE TRIM(n.contato_email) = TRIM(t.email)
              AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
              AND t.email IS NOT NULL AND TRIM(t.email) != ''
            LIMIT 1
          )), '')
        ) AS telefone
      FROM (
        SELECT DISTINCT nome, fonte, email, cidade, estado
        FROM (
          SELECT DISTINCT TRIM(contato_nome) AS nome, 'Bling E-commerce - Pedidos'  AS fonte, NULL  AS email, NULL AS cidade, NULL AS estado FROM bling_pedidos_venda_ecommerce      WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(contato_nome), 'Bling E-commerce - NFe',                 NULL, NULL, NULL  FROM bling_nfe_saida_detalhes_ecommerce    WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - Pedidos',           NULL, NULL, NULL  FROM bling_pedidos_venda_distribuicao      WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - NFe',               NULL, NULL, NULL  FROM bling_nfe_saida_detalhes_distribuicao WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
          UNION
          SELECT DISTINCT TRIM(name),         'Tray E-commerce',  email, city, state   FROM clientes_tray_ecommerce              WHERE name IS NOT NULL AND TRIM(name) != ''
          UNION
          SELECT DISTINCT TRIM(name),         'Tray Distribuição', email, city, state  FROM clientes_tray_distribuicao            WHERE name IS NOT NULL AND TRIM(name) != ''
        ) todos
        WHERE LENGTH(nome) > 2 ${whereCond}
      ) t
      ORDER BY t.nome ASC
      LIMIT ? OFFSET ?
    `;

    const [countResult, clientes] = await Promise.all([
      query(countSql, searchParam),
      query(listSql,  [...searchParam, limit, offset]),
    ]);

    const total       = Number(countResult[0]?.total || 0);
    const comTelefone = clientes.filter(c => c.telefone).length;

    const porFonte = {};
    for (const c of clientes) {
      porFonte[c.fonte] = (porFonte[c.fonte] || 0) + 1;
    }

    console.log(`✅ /api/todos-clientes: ${clientes.length} retornados (${comTelefone} com telefone) de ${total} total`);

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
