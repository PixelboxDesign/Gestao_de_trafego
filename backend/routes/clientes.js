import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// Subquery reutilizável — apenas tabelas com existência confirmada no banco
const CLIENTES_UNION = `
  SELECT DISTINCT TRIM(contato_nome) AS nome, NULL AS email, NULL AS cidade, NULL AS estado
    FROM bling_pedidos_venda_ecommerce
   WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
  UNION
  SELECT DISTINCT TRIM(contato_nome), NULL, NULL, NULL
    FROM bling_nfe_saida_detalhes_ecommerce
   WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
  UNION
  SELECT DISTINCT TRIM(contato_nome), NULL, NULL, NULL
    FROM bling_pedidos_venda_distribuicao
   WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
  UNION
  SELECT DISTINCT TRIM(contato_nome), NULL, NULL, NULL
    FROM bling_nfe_saida_detalhes_distribuicao
   WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
  UNION
  SELECT DISTINCT TRIM(name), email, city, state
    FROM clientes_tray_ecommerce
   WHERE name IS NOT NULL AND TRIM(name) != ''
  UNION
  SELECT DISTINCT TRIM(name), email, city, state
    FROM clientes_tray_distribuicao
   WHERE name IS NOT NULL AND TRIM(name) != ''
`;

// GET /api/clientes — lista paginada
router.get('/', async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(500, Math.max(1, parseInt(req.query.limit) || 100));
    const offset = (page - 1) * limit;
    const search = (req.query.search || '').trim();

    // Parâmetros montados explicitamente — sem interpolação condicional inline
    const searchParams = search ? [`%${search}%`] : [];
    const whereCond    = search ? 'AND nome LIKE ?' : '';

    const countSql = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT DISTINCT nome
        FROM (${CLIENTES_UNION}) base
        WHERE LENGTH(nome) > 2 ${whereCond}
      ) counted
    `;

    const listSql = `
      SELECT DISTINCT nome, email, cidade, estado
      FROM (${CLIENTES_UNION}) base
      WHERE LENGTH(nome) > 2 ${whereCond}
      ORDER BY nome ASC
      LIMIT ? OFFSET ?
    `;

    const [countResult, clientes] = await Promise.all([
      query(countSql, searchParams),
      query(listSql,  [...searchParams, limit, offset]),
    ]);

    const total = Number(countResult[0]?.total || 0);

    res.json({
      data: clientes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('GET /api/clientes erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar clientes', message: err.message });
  }
});

// GET /api/clientes/stats — totais por fonte (COUNT no banco, não em memória)
router.get('/stats', async (req, res) => {
  try {
    const countsSql = `
      SELECT
        (SELECT COUNT(DISTINCT TRIM(contato_nome)) FROM bling_pedidos_venda_ecommerce
          WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != '') AS bling_ecommerce,
        (SELECT COUNT(DISTINCT TRIM(contato_nome)) FROM bling_pedidos_venda_distribuicao
          WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != '') AS bling_distribuicao,
        (SELECT COUNT(DISTINCT TRIM(name))         FROM clientes_tray_ecommerce
          WHERE name IS NOT NULL AND TRIM(name) != '')                 AS tray_ecommerce,
        (SELECT COUNT(DISTINCT TRIM(name))         FROM clientes_tray_distribuicao
          WHERE name IS NOT NULL AND TRIM(name) != '')                 AS tray_distribuicao
    `;

    const uniqueSql = `
      SELECT COUNT(*) AS total
      FROM (
        SELECT DISTINCT nome FROM (${CLIENTES_UNION}) base
        WHERE LENGTH(nome) > 2
      ) uniq
    `;

    const [counts, unique] = await Promise.all([
      query(countsSql),
      query(uniqueSql),
    ]);

    const c = counts[0] || {};

    res.json({
      totalClientes:  Number(unique[0]?.total || 0),
      porOrigem: {
        'Bling E-commerce':   Number(c.bling_ecommerce   || 0),
        'Bling Distribuição': Number(c.bling_distribuicao || 0),
        'Tray E-commerce':    Number(c.tray_ecommerce     || 0),
        'Tray Distribuição':  Number(c.tray_distribuicao  || 0),
      },
      ultimaAtualizacao: new Date().toISOString(),
    });
  } catch (err) {
    console.error('GET /api/clientes/stats erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar stats', message: err.message });
  }
});

// GET /api/clientes/:nome — resumo de pedidos (sem produtos)
router.get('/:nome', async (req, res) => {
  try {
    const nome = req.params.nome;

    const sql = `
      SELECT id, data, total, situacao_valor AS status, 'E-commerce' AS origem
        FROM bling_pedidos_venda_ecommerce
       WHERE contato_nome = ?
      UNION ALL
      SELECT id, data, total, situacao_valor, 'Distribuição'
        FROM bling_pedidos_venda_distribuicao
       WHERE contato_nome = ?
      ORDER BY data DESC
      LIMIT 200
    `;

    const pedidos = await query(sql, [nome, nome]);

    if (pedidos.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    const totalGasto  = pedidos.reduce((s, p) => s + (Number(p.total) || 0), 0);
    const ticketMedio = totalGasto / pedidos.length;

    res.json({ nome, pedidos, stats: { totalGasto, totalPedidos: pedidos.length, ticketMedio } });
  } catch (err) {
    console.error('GET /api/clientes/:nome erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar cliente', message: err.message });
  }
});

// GET /api/clientes/:nome/pedidos — pedidos com produtos detalhados
router.get('/:nome/pedidos', async (req, res) => {
  try {
    const nome = decodeURIComponent(req.params.nome);
    console.log(`📦 /api/clientes/${nome}/pedidos`);

    // ── 1. Pedidos do Bling E-commerce com itens ──────────────────────────
    const ecommerceSql = `
      SELECT
        p.id            AS pedido_id,
        p.data          AS pedido_data,
        p.total         AS pedido_total,
        p.situacao_valor AS pedido_status,
        'E-commerce'    AS origem,
        COALESCE(prod.nome, it.itens_codigo, 'Produto desconhecido') AS produto_nome,
        it.itens_codigo   AS produto_codigo,
        it.itens_quantidade AS quantidade,
        it.itens_valor    AS valor_unitario,
        it.situacao_nome  AS item_status
      FROM bling_pedidos_venda_ecommerce p
      JOIN bling_pedidos_venda_detalhes_itens_ecommerce it
        ON it.pedido_venda_id = p.id
      LEFT JOIN bling_produtos_ecommerce prod
        ON prod.id = it.itens_produto_id
      WHERE p.contato_nome = ?
      ORDER BY p.data DESC, p.id
      LIMIT 1000
    `;

    // ── 2. Pedidos do Bling Distribuição com itens ────────────────────────
    const distribuicaoSql = `
      SELECT
        p.id            AS pedido_id,
        p.data          AS pedido_data,
        p.total         AS pedido_total,
        p.situacao_valor AS pedido_status,
        'Distribuição'  AS origem,
        COALESCE(it.itens_descricao, it.itens_codigo, 'Produto desconhecido') AS produto_nome,
        it.itens_codigo   AS produto_codigo,
        it.itens_quantidade AS quantidade,
        it.itens_valor    AS valor_unitario,
        it.situacao_nome  AS item_status
      FROM bling_pedidos_venda_distribuicao p
      JOIN bling_pedidos_venda_detalhes_itens_distribuicao it
        ON it.pedido_venda_id = p.id
      WHERE p.contato_nome = ?
      ORDER BY p.data DESC, p.id
      LIMIT 1000
    `;

    const [itensEcommerce, itensDistribuicao] = await Promise.all([
      query(ecommerceSql, [nome]),
      query(distribuicaoSql, [nome]),
    ]);

    const todosItens = [...itensEcommerce, ...itensDistribuicao];

    if (todosItens.length === 0) {
      return res.json({ nome, pedidos: [], totalPedidos: 0, totalGasto: 0 });
    }

    // ── Agrupar itens por pedido ──────────────────────────────────────────
    const pedidosMap = new Map();
    for (const item of todosItens) {
      const key = `${item.origem}-${item.pedido_id}`;
      if (!pedidosMap.has(key)) {
        pedidosMap.set(key, {
          pedido_id:     item.pedido_id,
          pedido_data:   item.pedido_data,
          pedido_total:  Number(item.pedido_total || 0),
          pedido_status: item.pedido_status,
          origem:        item.origem,
          produtos:      [],
        });
      }
      pedidosMap.get(key).produtos.push({
        nome:           item.produto_nome,
        codigo:         item.produto_codigo,
        quantidade:     Number(item.quantidade || 0),
        valor_unitario: Number(item.valor_unitario || 0),
        subtotal:       Number(item.quantidade || 0) * Number(item.valor_unitario || 0),
        status:         item.item_status,
      });
    }

    // Ordenar pedidos por data desc
    const pedidos = Array.from(pedidosMap.values())
      .sort((a, b) => new Date(b.pedido_data) - new Date(a.pedido_data));

    const totalGasto = pedidos.reduce((s, p) => s + p.pedido_total, 0);

    console.log(`✅ ${nome}: ${pedidos.length} pedidos, ${todosItens.length} itens`);

    res.json({
      nome,
      pedidos,
      totalPedidos: pedidos.length,
      totalGasto,
      ticketMedio: pedidos.length > 0 ? totalGasto / pedidos.length : 0,
    });
  } catch (err) {
    console.error('GET /api/clientes/:nome/pedidos erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar pedidos do cliente', message: err.message });
  }
});

export default router;
