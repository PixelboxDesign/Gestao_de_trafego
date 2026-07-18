import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// ── Tabela de telefones: todos os telefones do banco num único UNION ──────────
// Não correlacionada — executa uma vez e retorna um conjunto plano.
const FONES_UNION = `
  SELECT TRIM(p.contato_nome) AS nome, TRIM(n.contato_telefone) AS telefone
  FROM bling_pedidos_venda_ecommerce p
  JOIN bling_nfe_saida_detalhes_ecommerce n ON n.contato_id = p.contato_id
  WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
    AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND p.contato_nome IS NOT NULL AND LENGTH(TRIM(p.contato_nome)) > 2
  UNION
  SELECT TRIM(p.contato_nome), TRIM(n.contato_telefone)
  FROM bling_pedidos_venda_distribuicao p
  JOIN bling_nfe_saida_detalhes_distribuicao n ON n.contato_id = p.contato_id
  WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
    AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND p.contato_nome IS NOT NULL AND LENGTH(TRIM(p.contato_nome)) > 2
  UNION
  SELECT TRIM(contato_nome), TRIM(contato_telefone)
  FROM bling_nfe_saida_detalhes_ecommerce
  WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
    AND contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION
  SELECT TRIM(contato_nome), TRIM(contato_telefone)
  FROM bling_nfe_saida_detalhes_distribuicao
  WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
    AND contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION
  SELECT TRIM(c.name), TRIM(n.contato_telefone)
  FROM clientes_tray_ecommerce c
  JOIN bling_nfe_saida_detalhes_ecommerce n ON TRIM(n.contato_email) = TRIM(c.email)
  WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND c.email IS NOT NULL AND TRIM(c.email) != ''
    AND c.name IS NOT NULL AND LENGTH(TRIM(c.name)) > 2
  UNION
  SELECT TRIM(c.name), TRIM(n.contato_telefone)
  FROM clientes_tray_ecommerce c
  JOIN bling_nfe_saida_detalhes_distribuicao n ON TRIM(n.contato_email) = TRIM(c.email)
  WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND c.email IS NOT NULL AND TRIM(c.email) != ''
    AND c.name IS NOT NULL AND LENGTH(TRIM(c.name)) > 2
  UNION
  SELECT TRIM(pe.contato_nome), TRIM(nd.contato_telefone)
  FROM bling_pedidos_venda_ecommerce pe
  JOIN bling_nfe_saida_detalhes_distribuicao nd
    ON REPLACE(REPLACE(REPLACE(nd.contato_numerodocumento,'.',''),'-',''),'/','')
     = REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')
  WHERE nd.contato_telefone IS NOT NULL AND TRIM(nd.contato_telefone) != ''
    AND pe.contato_numerodocumento IS NOT NULL
    AND LENGTH(REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')) >= 11
    AND pe.contato_nome IS NOT NULL AND LENGTH(TRIM(pe.contato_nome)) > 2
`;

// ── UNION de todos os clientes (sem telefone) ─────────────────────────────────
const CLIENTES_UNION = `
  SELECT TRIM(contato_nome) AS nome, 'Bling E-commerce - Pedidos'  AS fonte, NULL AS email, NULL AS cidade, NULL AS estado FROM bling_pedidos_venda_ecommerce   WHERE contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION
  SELECT TRIM(contato_nome), 'Bling E-commerce - NFe',          NULL, NULL, NULL FROM bling_nfe_saida_detalhes_ecommerce    WHERE contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION
  SELECT TRIM(contato_nome), 'Bling Distribuição - Pedidos',    NULL, NULL, NULL FROM bling_pedidos_venda_distribuicao      WHERE contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION
  SELECT TRIM(contato_nome), 'Bling Distribuição - NFe',        NULL, NULL, NULL FROM bling_nfe_saida_detalhes_distribuicao WHERE contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION
  SELECT TRIM(name), 'Tray E-commerce',  email, city, state FROM clientes_tray_ecommerce   WHERE name IS NOT NULL AND LENGTH(TRIM(name)) > 2
  UNION
  SELECT TRIM(name), 'Tray Distribuição', email, city, state FROM clientes_tray_distribuicao WHERE name IS NOT NULL AND LENGTH(TRIM(name)) > 2
`;

// ── Query para modo "somente com telefone" — JOINs diretos ───────────────────
function buildComTelSql(search) {
  const sc = search ? `AND TRIM(nome) LIKE '%${search.replace(/'/g, "''")}%'` : '';
  return `
    SELECT DISTINCT TRIM(nome) AS nome, fonte, email, cidade, estado, telefone
    FROM (
      SELECT DISTINCT TRIM(p.contato_nome) AS nome, 'Bling E-commerce - Pedidos' AS fonte,
             NULL AS email, NULL AS cidade, NULL AS estado, TRIM(n.contato_telefone) AS telefone
      FROM bling_pedidos_venda_ecommerce p
      JOIN bling_nfe_saida_detalhes_ecommerce n ON n.contato_id = p.contato_id
      WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND LENGTH(TRIM(p.contato_nome)) > 2
      UNION
      SELECT DISTINCT TRIM(p.contato_nome), 'Bling Distribuição - Pedidos',
             NULL, NULL, NULL, TRIM(n.contato_telefone)
      FROM bling_pedidos_venda_distribuicao p
      JOIN bling_nfe_saida_detalhes_distribuicao n ON n.contato_id = p.contato_id
      WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND LENGTH(TRIM(p.contato_nome)) > 2
      UNION
      SELECT DISTINCT TRIM(contato_nome), 'Bling E-commerce - NFe',
             NULL, NULL, NULL, TRIM(contato_telefone)
      FROM bling_nfe_saida_detalhes_ecommerce
      WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
        AND LENGTH(TRIM(contato_nome)) > 2
      UNION
      SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - NFe',
             NULL, NULL, NULL, TRIM(contato_telefone)
      FROM bling_nfe_saida_detalhes_distribuicao
      WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
        AND LENGTH(TRIM(contato_nome)) > 2
      UNION
      SELECT DISTINCT TRIM(c.name), 'Tray E-commerce',
             c.email, c.city, c.state, TRIM(n.contato_telefone)
      FROM clientes_tray_ecommerce c
      JOIN bling_nfe_saida_detalhes_ecommerce n ON TRIM(n.contato_email) = TRIM(c.email)
      WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND c.email IS NOT NULL AND TRIM(c.email) != ''
        AND LENGTH(TRIM(c.name)) > 2
      UNION
      SELECT DISTINCT TRIM(c.name), 'Tray E-commerce',
             c.email, c.city, c.state, TRIM(n.contato_telefone)
      FROM clientes_tray_ecommerce c
      JOIN bling_nfe_saida_detalhes_distribuicao n ON TRIM(n.contato_email) = TRIM(c.email)
      WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND c.email IS NOT NULL AND TRIM(c.email) != ''
        AND LENGTH(TRIM(c.name)) > 2
      UNION
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
    WHERE LENGTH(TRIM(nome)) > 2 ${sc}
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

    if (somenteTelefone) {
      // ── MODO COM TELEFONE: JOINs diretos, rápido ─────────────────────────
      const baseSql   = buildComTelSql(search);
      const countSql  = `SELECT COUNT(*) AS total FROM (${baseSql}) _c`;
      const listSql   = `SELECT * FROM (${baseSql}) _l ORDER BY nome ASC LIMIT ? OFFSET ?`;

      const [countResult, clientes] = await Promise.all([
        query(countSql, []),
        query(listSql,  [limit, offset]),
      ]);

      const total = Number(countResult[0]?.total || 0);
      const porFonte = {};
      for (const c of clientes) porFonte[c.fonte] = (porFonte[c.fonte] || 0) + 1;

      console.log(`✅ somenteTel: ${clientes.length} de ${total}`);
      return res.json({
        total, clientes,
        resumo: { totalClientes: total, porFonte, fontes: Object.keys(porFonte).length },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // ── MODO GERAL: 2 passos ─────────────────────────────────────────────────
    // Passo 1: buscar página de clientes SEM telefone (rápido — só UNION simples)
    // Passo 2: resolver telefone só para os nomes da página via LEFT JOIN
    const searchCond  = search ? 'AND nome LIKE ?' : '';
    const searchParam = search ? [`%${search}%`] : [];

    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT DISTINCT nome FROM (${CLIENTES_UNION}) base
        WHERE 1=1 ${searchCond}
      ) counted
    `;

    // Buscar só nomes/fonte/email da página — SEM calcular telefone ainda
    const pageSql = `
      SELECT DISTINCT nome, fonte, email, cidade, estado
      FROM (${CLIENTES_UNION}) base
      WHERE 1=1 ${searchCond}
      ORDER BY nome ASC
      LIMIT ? OFFSET ?
    `;

    const [countResult, pagina] = await Promise.all([
      query(countSql, searchParam),
      query(pageSql,  [...searchParam, limit, offset]),
    ]);

    if (pagina.length === 0) {
      return res.json({
        total: Number(countResult[0]?.total || 0),
        clientes: [],
        resumo: { totalClientes: 0, porFonte: {}, fontes: 0 },
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    // Passo 2: resolver telefone para os nomes da página via JOIN com FONES_UNION
    // Passamos os nomes como IN (?, ?, ...) para limitar o escopo do JOIN
    const nomesParam = pagina.map(r => r.nome);
    const placeholders = nomesParam.map(() => '?').join(',');

    const fonesSql = `
      SELECT DISTINCT nome, MIN(telefone) AS telefone
      FROM (${FONES_UNION}) fones
      WHERE nome IN (${placeholders})
      GROUP BY nome
    `;

    const fonesResult = await query(fonesSql, nomesParam);

    // Montar mapa nome → telefone
    const foneMap = {};
    for (const f of fonesResult) foneMap[f.nome] = f.telefone;

    // Enriquecer clientes com telefone
    const clientes = pagina.map(c => ({ ...c, telefone: foneMap[c.nome] || null }));

    const total = Number(countResult[0]?.total || 0);
    const porFonte = {};
    for (const c of clientes) porFonte[c.fonte] = (porFonte[c.fonte] || 0) + 1;

    console.log(`✅ geral: ${clientes.length} de ${total}, ${fonesResult.length} com fone`);

    res.json({
      total, clientes,
      resumo: { totalClientes: total, porFonte, fontes: Object.keys(porFonte).length },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });

  } catch (err) {
    console.error('/api/todos-clientes erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar clientes', message: err.message });
  }
});

export default router;
