import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// ── Macro de limpeza de nome aplicada em cada coluna ─────────────────────────
// MySQL 8.0 — REGEXP_REPLACE(str, pattern, replacement) sem flags extras
// Ordem:
//   1. Remover entidades HTML: &#XXXXX ou &#XXXXX;
//   2. Remover CPF/CNPJ prefixado: dígitos, pontos, traços antes do nome
//   3. Remover sufixo de login: " (loginXXX)" no final
//   4. Trim
function limparNome(col) {
  return `TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRIM(${col}),
          '&#[0-9]+;?', ''
        ),
        '^[0-9][0-9 .\\-/]*', ''
      ),
      ' *\\([^)]*\\)\\s*$', ''
    )
  )`;
}

// Nome limpo para cada tabela
const N_PED_EC   = limparNome('p_ec.contato_nome');
const N_PED_DIST = limparNome('p_dist.contato_nome');
const N_NFE_EC   = limparNome('n_ec.contato_nome');
const N_NFE_DIST = limparNome('n_dist.contato_nome');
const N_TRAY_EC  = limparNome('c_ec.name');
const N_TRAY_DIST= limparNome('c_dist.name');

// ── Filtro de nome válido ────────────────────────────────────────────────────
// Exclui: só números, muito curto, entidades HTML restantes
const NOME_VALIDO = (col) =>
  `LENGTH(${col}) > 2 AND NOT ${col} REGEXP '^[0-9 .\\-/]+$' AND NOT ${col} REGEXP '^&#'`;

// ── UNION de todos os clientes com nome já limpo e deduplicado ───────────────
// Agrupa por nome_limpo escolhendo a melhor fonte e dados disponíveis.
// Isso elimina duplicatas de "mesmo nome em fontes diferentes".
const CLIENTES_DEDUP = `
  SELECT
    nome_limpo                                AS nome,
    MIN(fonte)                                AS fonte,
    MAX(CASE WHEN email  IS NOT NULL AND TRIM(email)  != '' THEN email  END) AS email,
    MAX(CASE WHEN cidade IS NOT NULL AND TRIM(cidade) != '' THEN cidade END) AS cidade,
    MAX(CASE WHEN estado IS NOT NULL AND TRIM(estado) != '' THEN estado END) AS estado
  FROM (
    SELECT ${limparNome('contato_nome')} AS nome_limpo,
           'Bling E-commerce'  AS fonte, NULL AS email, NULL AS cidade, NULL AS estado
    FROM bling_pedidos_venda_ecommerce
    WHERE contato_nome IS NOT NULL
    UNION ALL
    SELECT ${limparNome('contato_nome')}, 'Bling Distribuição', NULL, NULL, NULL
    FROM bling_pedidos_venda_distribuicao
    WHERE contato_nome IS NOT NULL
    UNION ALL
    SELECT ${limparNome('name')}, 'Tray E-commerce', email, city, state
    FROM clientes_tray_ecommerce
    WHERE name IS NOT NULL
    UNION ALL
    SELECT ${limparNome('name')}, 'Tray Distribuição', email, city, state
    FROM clientes_tray_distribuicao
    WHERE name IS NOT NULL
  ) raw
  WHERE LENGTH(TRIM(nome_limpo)) > 2
    AND NOT TRIM(nome_limpo) REGEXP '^[0-9 .\\-/]+$'
    AND NOT TRIM(nome_limpo) REGEXP '^&#'
  GROUP BY nome_limpo
`;

// ── Telefones com nome já limpo ──────────────────────────────────────────────
const FONES_UNION = `
  SELECT ${limparNome('p.contato_nome')} AS nome, TRIM(n.contato_telefone) AS telefone
  FROM bling_pedidos_venda_ecommerce p
  JOIN bling_nfe_saida_detalhes_ecommerce n ON n.contato_id = p.contato_id
  WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
    AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND p.contato_nome IS NOT NULL
  UNION
  SELECT ${limparNome('p.contato_nome')}, TRIM(n.contato_telefone)
  FROM bling_pedidos_venda_distribuicao p
  JOIN bling_nfe_saida_detalhes_distribuicao n ON n.contato_id = p.contato_id
  WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
    AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND p.contato_nome IS NOT NULL
  UNION
  SELECT ${limparNome('contato_nome')}, TRIM(contato_telefone)
  FROM bling_nfe_saida_detalhes_ecommerce
  WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
    AND contato_nome IS NOT NULL
  UNION
  SELECT ${limparNome('contato_nome')}, TRIM(contato_telefone)
  FROM bling_nfe_saida_detalhes_distribuicao
  WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
    AND contato_nome IS NOT NULL
  UNION
  SELECT ${limparNome('c.name')}, TRIM(n.contato_telefone)
  FROM clientes_tray_ecommerce c
  JOIN bling_nfe_saida_detalhes_ecommerce n ON TRIM(n.contato_email) = TRIM(c.email)
  WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND c.email IS NOT NULL AND TRIM(c.email) != '' AND c.name IS NOT NULL
  UNION
  SELECT ${limparNome('c.name')}, TRIM(n.contato_telefone)
  FROM clientes_tray_ecommerce c
  JOIN bling_nfe_saida_detalhes_distribuicao n ON TRIM(n.contato_email) = TRIM(c.email)
  WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND c.email IS NOT NULL AND TRIM(c.email) != '' AND c.name IS NOT NULL
  UNION
  SELECT ${limparNome('pe.contato_nome')}, TRIM(nd.contato_telefone)
  FROM bling_pedidos_venda_ecommerce pe
  JOIN bling_nfe_saida_detalhes_distribuicao nd
    ON REPLACE(REPLACE(REPLACE(nd.contato_numerodocumento,'.',''),'-',''),'/','')
     = REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')
  WHERE nd.contato_telefone IS NOT NULL AND TRIM(nd.contato_telefone) != ''
    AND pe.contato_numerodocumento IS NOT NULL
    AND LENGTH(REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')) >= 11
    AND pe.contato_nome IS NOT NULL
`;

// ── Modo "somente com telefone" — deduplicado e com nome limpo ───────────────
function buildComTelSql(search) {
  const sc = search ? `AND nome LIKE '%${search.replace(/'/g, "''")}%'` : '';
  return `
    SELECT nome, MIN(fonte) AS fonte,
           MAX(CASE WHEN email  IS NOT NULL AND TRIM(email)  != '' THEN email  END) AS email,
           MAX(CASE WHEN cidade IS NOT NULL AND TRIM(cidade) != '' THEN cidade END) AS cidade,
           MAX(CASE WHEN estado IS NOT NULL AND TRIM(estado) != '' THEN estado END) AS estado,
           MIN(telefone) AS telefone
    FROM (
      SELECT ${limparNome('p.contato_nome')} AS nome, 'Bling E-commerce' AS fonte,
             NULL AS email, NULL AS cidade, NULL AS estado, TRIM(n.contato_telefone) AS telefone
      FROM bling_pedidos_venda_ecommerce p
      JOIN bling_nfe_saida_detalhes_ecommerce n ON n.contato_id = p.contato_id
      WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND p.contato_nome IS NOT NULL
      UNION ALL
      SELECT ${limparNome('p.contato_nome')}, 'Bling Distribuição',
             NULL, NULL, NULL, TRIM(n.contato_telefone)
      FROM bling_pedidos_venda_distribuicao p
      JOIN bling_nfe_saida_detalhes_distribuicao n ON n.contato_id = p.contato_id
      WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
        AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND p.contato_nome IS NOT NULL
      UNION ALL
      SELECT ${limparNome('contato_nome')}, 'Bling E-commerce',
             NULL, NULL, NULL, TRIM(contato_telefone)
      FROM bling_nfe_saida_detalhes_ecommerce
      WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
        AND contato_nome IS NOT NULL
      UNION ALL
      SELECT ${limparNome('contato_nome')}, 'Bling Distribuição',
             NULL, NULL, NULL, TRIM(contato_telefone)
      FROM bling_nfe_saida_detalhes_distribuicao
      WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
        AND contato_nome IS NOT NULL
      UNION ALL
      SELECT ${limparNome('c.name')}, 'Tray E-commerce',
             c.email, c.city, c.state, TRIM(n.contato_telefone)
      FROM clientes_tray_ecommerce c
      JOIN bling_nfe_saida_detalhes_ecommerce n ON TRIM(n.contato_email) = TRIM(c.email)
      WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND c.email IS NOT NULL AND TRIM(c.email) != '' AND c.name IS NOT NULL
      UNION ALL
      SELECT ${limparNome('c.name')}, 'Tray E-commerce',
             c.email, c.city, c.state, TRIM(n.contato_telefone)
      FROM clientes_tray_ecommerce c
      JOIN bling_nfe_saida_detalhes_distribuicao n ON TRIM(n.contato_email) = TRIM(c.email)
      WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
        AND c.email IS NOT NULL AND TRIM(c.email) != '' AND c.name IS NOT NULL
      UNION ALL
      SELECT ${limparNome('pe.contato_nome')}, 'Bling E-commerce',
             NULL, NULL, NULL, TRIM(nd.contato_telefone)
      FROM bling_pedidos_venda_ecommerce pe
      JOIN bling_nfe_saida_detalhes_distribuicao nd
        ON REPLACE(REPLACE(REPLACE(nd.contato_numerodocumento,'.',''),'-',''),'/','')
         = REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')
      WHERE nd.contato_telefone IS NOT NULL AND TRIM(nd.contato_telefone) != ''
        AND pe.contato_numerodocumento IS NOT NULL
        AND LENGTH(REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')) >= 11
        AND pe.contato_nome IS NOT NULL
    ) raw
    WHERE LENGTH(TRIM(nome)) > 2
      AND NOT TRIM(nome) REGEXP '^[0-9 .\\-/]+$'
      AND NOT TRIM(nome) REGEXP '^&#'
      ${sc}
    GROUP BY nome
    HAVING telefone IS NOT NULL AND TRIM(telefone) != ''
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
      // ── MODO COM TELEFONE ─────────────────────────────────────────────────
      const baseSql  = buildComTelSql(search);
      const countSql = `SELECT COUNT(*) AS total FROM (${baseSql}) _c`;
      const listSql  = `SELECT * FROM (${baseSql}) _l ORDER BY nome ASC LIMIT ? OFFSET ?`;

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
    const searchCond  = search ? 'AND nome LIKE ?' : '';
    const searchParam = search ? [`%${search}%`] : [];

    // Passo 1: paginação rápida com nome limpo e deduplicado
    const countSql = `
      SELECT COUNT(*) AS total FROM (
        SELECT nome FROM (${CLIENTES_DEDUP}) dedup WHERE 1=1 ${searchCond}
      ) _c
    `;
    const pageSql = `
      SELECT nome, fonte, email, cidade, estado
      FROM (${CLIENTES_DEDUP}) dedup
      WHERE 1=1 ${searchCond}
      ORDER BY nome ASC
      LIMIT ? OFFSET ?
    `;

    const [countResult, pagina] = await Promise.all([
      query(countSql, searchParam),
      query(pageSql,  [...searchParam, limit, offset]),
    ]);

    if (pagina.length === 0) {
      const total = Number(countResult[0]?.total || 0);
      return res.json({
        total, clientes: [],
        resumo: { totalClientes: total, porFonte: {}, fontes: 0 },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    }

    // Passo 2: telefone para os nomes da página (IN com lista pequena)
    const nomesParam   = pagina.map(r => r.nome);
    const placeholders = nomesParam.map(() => '?').join(',');
    const fonesSql     = `
      SELECT nome, MIN(telefone) AS telefone
      FROM (${FONES_UNION}) fones
      WHERE nome IN (${placeholders})
      GROUP BY nome
    `;
    const fonesResult = await query(fonesSql, nomesParam);
    const foneMap = {};
    for (const f of fonesResult) foneMap[f.nome] = f.telefone;

    const clientes = pagina.map(c => ({ ...c, telefone: foneMap[c.nome] || null }));
    const total    = Number(countResult[0]?.total || 0);
    const porFonte = {};
    for (const c of clientes) porFonte[c.fonte] = (porFonte[c.fonte] || 0) + 1;

    console.log(`✅ geral: ${clientes.length} de ${total}`);
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
