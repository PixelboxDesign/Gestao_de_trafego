import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// ── Subquery que resolve telefone em cascata (8 fontes) ───────────────────────
// Usada quando NÃO há filtro de telefone (listagem geral)
const TELEFONE_COALESCE = `
  COALESCE(
    NULLIF(TRIM((
      SELECT n.contato_telefone FROM bling_pedidos_venda_ecommerce p
      JOIN bling_nfe_saida_detalhes_ecommerce n ON n.contato_id = p.contato_id
      WHERE TRIM(p.contato_nome) = t.nome AND p.contato_id IS NOT NULL AND p.contato_id != '0'
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != '' LIMIT 1
    )), ''),
    NULLIF(TRIM((
      SELECT n.contato_telefone FROM bling_pedidos_venda_distribuicao p
      JOIN bling_nfe_saida_detalhes_distribuicao n ON n.contato_id = p.contato_id
      WHERE TRIM(p.contato_nome) = t.nome AND p.contato_id IS NOT NULL AND p.contato_id != '0'
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != '' LIMIT 1
    )), ''),
    NULLIF(TRIM((
      SELECT contato_telefone FROM bling_nfe_saida_detalhes_ecommerce
      WHERE TRIM(contato_nome) = t.nome AND contato_telefone IS NOT NULL AND TRIM(contato_telefone) != '' LIMIT 1
    )), ''),
    NULLIF(TRIM((
      SELECT contato_telefone FROM bling_nfe_saida_detalhes_distribuicao
      WHERE TRIM(contato_nome) = t.nome AND contato_telefone IS NOT NULL AND TRIM(contato_telefone) != '' LIMIT 1
    )), ''),
    NULLIF(TRIM((
      SELECT n.contato_telefone FROM bling_nfe_saida_detalhes_ecommerce n
      WHERE TRIM(n.contato_email) = TRIM(t.email)
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND t.email IS NOT NULL AND TRIM(t.email) != '' LIMIT 1
    )), ''),
    NULLIF(TRIM((
      SELECT n.contato_telefone FROM bling_nfe_saida_detalhes_distribuicao n
      WHERE TRIM(n.contato_email) = TRIM(t.email)
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND t.email IS NOT NULL AND TRIM(t.email) != '' LIMIT 1
    )), ''),
    NULLIF(TRIM((
      SELECT nd.contato_telefone FROM bling_pedidos_venda_ecommerce pe
      JOIN bling_nfe_saida_detalhes_distribuicao nd
        ON REPLACE(REPLACE(REPLACE(nd.contato_numerodocumento,'.',''),'-',''),'/','')
         = REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')
      WHERE TRIM(pe.contato_nome) = t.nome
        AND nd.contato_telefone IS NOT NULL AND TRIM(nd.contato_telefone) != ''
        AND pe.contato_numerodocumento IS NOT NULL
        AND LENGTH(REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')) >= 11 LIMIT 1
    )), ''),
    NULLIF(TRIM((
      SELECT ne.contato_telefone FROM bling_pedidos_venda_distribuicao pd
      JOIN bling_nfe_saida_detalhes_ecommerce ne
        ON REPLACE(REPLACE(REPLACE(ne.contato_numerodocumento,'.',''),'-',''),'/','')
         = REPLACE(REPLACE(REPLACE(pd.contato_numerodocumento,'.',''),'-',''),'/','')
      WHERE TRIM(pd.contato_nome) = t.nome
        AND ne.contato_telefone IS NOT NULL AND TRIM(ne.contato_telefone) != ''
        AND pd.contato_numerodocumento IS NOT NULL
        AND LENGTH(REPLACE(REPLACE(REPLACE(pd.contato_numerodocumento,'.',''),'-',''),'/','')) >= 11 LIMIT 1
    )), '')
  )
`;

// ── Query eficiente para "somente com telefone" ───────────────────────────────
// Usa UNION de JOINs diretos — só clientes que já têm telefone confirmado.
// Muito mais rápida: não calcula subquery por linha.
function buildComTelSql(search) {
  const searchCond = search ? `AND TRIM(nome) LIKE '%${search.replace(/'/g, "''")}%'` : '';
  return `
    SELECT DISTINCT TRIM(nome) AS nome, fonte, email, cidade, estado, telefone
    FROM (
      -- Bling ecommerce via contato_id
      SELECT DISTINCT TRIM(p.contato_nome) AS nome, 'Bling E-commerce - Pedidos' AS fonte,
             NULL AS email, NULL AS cidade, NULL AS estado, TRIM(n.contato_telefone) AS telefone
      FROM bling_pedidos_venda_ecommerce p
      JOIN bling_nfe_saida_detalhes_ecommerce n ON n.contato_id = p.contato_id
      WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND LENGTH(TRIM(p.contato_nome)) > 2
      UNION
      -- Bling distribuição via contato_id
      SELECT DISTINCT TRIM(p.contato_nome), 'Bling Distribuição - Pedidos',
             NULL, NULL, NULL, TRIM(n.contato_telefone)
      FROM bling_pedidos_venda_distribuicao p
      JOIN bling_nfe_saida_detalhes_distribuicao n ON n.contato_id = p.contato_id
      WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND LENGTH(TRIM(p.contato_nome)) > 2
      UNION
      -- NFe ecommerce direto por nome
      SELECT DISTINCT TRIM(contato_nome), 'Bling E-commerce - NFe',
             NULL, NULL, NULL, TRIM(contato_telefone)
      FROM bling_nfe_saida_detalhes_ecommerce
      WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
        AND LENGTH(TRIM(contato_nome)) > 2
      UNION
      -- NFe distribuição direto por nome
      SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - NFe',
             NULL, NULL, NULL, TRIM(contato_telefone)
      FROM bling_nfe_saida_detalhes_distribuicao
      WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
        AND LENGTH(TRIM(contato_nome)) > 2
      UNION
      -- Tray ecommerce via email → NFe ecommerce
      SELECT DISTINCT TRIM(c.name), 'Tray E-commerce',
             c.email, c.city, c.state, TRIM(n.contato_telefone)
      FROM clientes_tray_ecommerce c
      JOIN bling_nfe_saida_detalhes_ecommerce n ON TRIM(n.contato_email) = TRIM(c.email)
      WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND c.email IS NOT NULL AND TRIM(c.email) != ''
        AND LENGTH(TRIM(c.name)) > 2
      UNION
      -- Tray ecommerce via email → NFe distribuição
      SELECT DISTINCT TRIM(c.name), 'Tray E-commerce',
             c.email, c.city, c.state, TRIM(n.contato_telefone)
      FROM clientes_tray_ecommerce c
      JOIN bling_nfe_saida_detalhes_distribuicao n ON TRIM(n.contato_email) = TRIM(c.email)
      WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND c.email IS NOT NULL AND TRIM(c.email) != ''
        AND LENGTH(TRIM(c.name)) > 2
      UNION
      -- CPF cross: ecommerce → NFe distribuição
      SELECT DISTINCT TRIM(pe.contato_nome), 'Bling E-commerce - Pedidos',
             NULL, NULL, NULL, TRIM(nd.contato_telefone)
      FROM bling_pedidos_venda_ecommerce pe
      JOIN bling_nfe_saida_detalhes_distribuicao nd
        ON REPLACE(REPLACE(REPLACE(nd.contato_numerodocumento,'.',''),'-',''),'/','')
         = REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')
      WHERE nd.contato_telefone IS NOT NULL AND TRIM(nd.contato_telefone) != ''
        AND pe.contato_numerodocumento IS NOT NULL
        AND LENGTH(REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')) >= 11
        AND LENGTH(TRIM(pe.contato_nome)) > 2
    ) todos
    WHERE LENGTH(TRIM(nome)) > 2 ${searchCond}
  `;
}

// GET /api/todos-clientes
router.get('/', async (req, res) => {
  try {
    const page            = Math.max(1, parseInt(req.query.page)  || 1);
    const limit           = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200));
    const offset          = (page - 1) * limit;
    const search          = (req.query.search || '').trim();
    const somenteTelefone = req.query.somente_com_telefone === 'true';

    console.log(`🔍 /api/todos-clientes page=${page} limit=${limit} search="${search}" somenteTel=${somenteTelefone}`);

    let countSql, listSql, countParams, listParams;

    if (somenteTelefone) {
      // ── MODO RÁPIDO: só clientes com telefone, usando JOINs diretos ──────
      const baseSql = buildComTelSql(search);
      countSql   = `SELECT COUNT(*) AS total FROM (${baseSql}) _count`;
      listSql    = `SELECT * FROM (${baseSql}) _list ORDER BY nome ASC LIMIT ? OFFSET ?`;
      countParams = [];
      listParams  = [limit, offset];

    } else {
      // ── MODO GERAL: todos os clientes, telefone por subquery correlacionada ─
      const searchCond  = search ? 'AND nome LIKE ?' : '';
      const searchParam = search ? [`%${search}%`] : [];

      countSql = `
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
          ) base WHERE LENGTH(nome) > 2 ${searchCond}
        ) counted
      `;

      listSql = `
        SELECT t.nome, t.fonte, t.email, t.cidade, t.estado,
               ${TELEFONE_COALESCE} AS telefone
        FROM (
          SELECT DISTINCT nome, fonte, email, cidade, estado
          FROM (
            SELECT DISTINCT TRIM(contato_nome) AS nome, 'Bling E-commerce - Pedidos'  AS fonte, NULL AS email, NULL AS cidade, NULL AS estado FROM bling_pedidos_venda_ecommerce      WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
            UNION
            SELECT DISTINCT TRIM(contato_nome), 'Bling E-commerce - NFe',          NULL, NULL, NULL FROM bling_nfe_saida_detalhes_ecommerce    WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
            UNION
            SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - Pedidos',    NULL, NULL, NULL FROM bling_pedidos_venda_distribuicao      WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
            UNION
            SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - NFe',        NULL, NULL, NULL FROM bling_nfe_saida_detalhes_distribuicao WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
            UNION
            SELECT DISTINCT TRIM(name), 'Tray E-commerce',  email, city, state FROM clientes_tray_ecommerce  WHERE name IS NOT NULL AND TRIM(name) != ''
            UNION
            SELECT DISTINCT TRIM(name), 'Tray Distribuição', email, city, state FROM clientes_tray_distribuicao WHERE name IS NOT NULL AND TRIM(name) != ''
          ) todos
          WHERE LENGTH(nome) > 2 ${searchCond}
        ) t
        ORDER BY t.nome ASC
        LIMIT ? OFFSET ?
      `;

      countParams = searchParam;
      listParams  = [...searchParam, limit, offset];
    }

    const [countResult, clientes] = await Promise.all([
      query(countSql, countParams),
      query(listSql,  listParams),
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
      resumo: { totalClientes: total, porFonte, fontes: Object.keys(porFonte).length },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('/api/todos-clientes erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar clientes', message: err.message });
  }
});

export default router;
