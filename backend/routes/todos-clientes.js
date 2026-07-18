import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// ── Limpeza de nome feita no Node.js (não no MySQL) ───────────────────────────
// Mais segura: sem problemas de escape de regex no MySQL
function limparNomeJS(nome) {
  if (!nome) return '';
  let n = String(nome).trim();

  // 1. Remover entidades HTML matemáticas: &#XXXXX ou &#XXXXX;
  n = n.replace(/&#[0-9]+;?/g, '');

  // 2. Remover CPF/CNPJ prefixado:
  //    "51.544.506 Lucas" → "Lucas"
  //    "54903522Maria"    → "Maria"
  //    "49.051.268/0001-41 Empresa" → "Empresa"
  n = n.replace(/^[\d][\d. \-/]*/, '').trim();

  // 3. Remover sufixo de login Tray: "Nome (loginXXX)" → "Nome"
  n = n.replace(/\s*\([^)]*\)\s*$/, '').trim();

  return n;
}

function nomeValido(nome) {
  if (!nome || nome.length < 3) return false;
  // Descartar se só tem dígitos, pontos, traços, barras, espaços
  if (/^[\d .\/\-]+$/.test(nome)) return false;
  // Descartar entidades HTML restantes
  if (nome.startsWith('&#')) return false;
  return true;
}

// ── UNION de todos os clientes (nomes brutos do banco) ───────────────────────
const CLIENTES_RAW_SQL = `
  SELECT TRIM(contato_nome) AS nome, 'Bling E-commerce' AS fonte,
         NULL AS email, NULL AS cidade, NULL AS estado
  FROM bling_pedidos_venda_ecommerce
  WHERE contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION ALL
  SELECT TRIM(contato_nome), 'Bling Distribuição', NULL, NULL, NULL
  FROM bling_pedidos_venda_distribuicao
  WHERE contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION ALL
  SELECT TRIM(name), 'Tray E-commerce', email, city, state
  FROM clientes_tray_ecommerce
  WHERE name IS NOT NULL AND LENGTH(TRIM(name)) > 2
  UNION ALL
  SELECT TRIM(name), 'Tray Distribuição', email, city, state
  FROM clientes_tray_distribuicao
  WHERE name IS NOT NULL AND LENGTH(TRIM(name)) > 2
`;

// ── Telefones (nomes brutos, resolução no Node) ───────────────────────────────
const FONES_RAW_SQL = `
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

// ── Deduplicar e limpar lista de clientes no Node ────────────────────────────
// Recebe rows do banco, aplica limpeza de nome, deduplica por nome limpo,
// agrega melhor fonte e dados disponíveis.
function deduplicarClientes(rows) {
  const mapa = new Map(); // nome_limpo → {fonte, email, cidade, estado}

  for (const r of rows) {
    const nomeLimpo = limparNomeJS(r.nome);
    if (!nomeValido(nomeLimpo)) continue;

    if (!mapa.has(nomeLimpo)) {
      mapa.set(nomeLimpo, {
        nome:   nomeLimpo,
        fonte:  r.fonte,
        email:  r.email  || null,
        cidade: r.cidade || null,
        estado: r.estado || null,
      });
    } else {
      // Enriquecer com dados de outras fontes
      const ex = mapa.get(nomeLimpo);
      if (!ex.email  && r.email)  ex.email  = r.email;
      if (!ex.cidade && r.cidade) ex.cidade = r.cidade;
      if (!ex.estado && r.estado) ex.estado = r.estado;
    }
  }

  // Ordenar por nome e converter para array
  return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// ── Mapa de telefones: nome_bruto → telefone ─────────────────────────────────
// Aplica limpeza no Node para fazer o match correto
function construirMapaTelefones(fonesRows) {
  const mapa = new Map(); // nome_limpo → telefone
  for (const r of fonesRows) {
    const nomeLimpo = limparNomeJS(r.nome);
    if (nomeValido(nomeLimpo) && r.telefone && !mapa.has(nomeLimpo)) {
      mapa.set(nomeLimpo, r.telefone);
    }
  }
  return mapa;
}

// Cache de dados dedupados (evita reprocessar em cada requisição de página)
// TTL de 5 minutos
let _cache = null;
let _cacheTTL = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getClientesDedup() {
  const agora = Date.now();
  if (_cache && agora < _cacheTTL) return _cache;

  console.log('🔄 Reconstruindo cache de clientes...');
  const [rawRows, fonesRows] = await Promise.all([
    query(CLIENTES_RAW_SQL),
    query(FONES_RAW_SQL),
  ]);

  const clientes  = deduplicarClientes(rawRows);
  const fonesMapa = construirMapaTelefones(fonesRows);

  // Enriquecer com telefone
  for (const c of clientes) {
    c.telefone = fonesMapa.get(c.nome) || null;
  }

  _cache = clientes;
  _cacheTTL = agora + CACHE_TTL_MS;

  const comTel = clientes.filter(c => c.telefone).length;
  console.log(`✅ Cache: ${clientes.length} clientes únicos, ${comTel} com telefone`);
  return clientes;
}

// GET /api/todos-clientes
router.get('/', async (req, res) => {
  try {
    const page            = Math.max(1, parseInt(req.query.page)  || 1);
    const limit           = Math.min(500, Math.max(1, parseInt(req.query.limit) || 200));
    const offset          = (page - 1) * limit;
    const search          = (req.query.search || '').trim().toLowerCase();
    const somenteTelefone = req.query.somente_com_telefone === 'true';

    console.log(`🔍 /todos-clientes page=${page} limit=${limit} search="${search}" somenteTel=${somenteTelefone}`);

    // Carregar todos os clientes (do cache ou banco)
    const todos = await getClientesDedup();

    // Filtrar
    let filtrados = todos;
    if (somenteTelefone) filtrados = filtrados.filter(c => c.telefone);
    if (search)          filtrados = filtrados.filter(c => c.nome.toLowerCase().includes(search));

    const total      = filtrados.length;
    const totalPages = Math.ceil(total / limit);
    const pagina     = filtrados.slice(offset, offset + limit);

    const porFonte = {};
    for (const c of pagina) porFonte[c.fonte] = (porFonte[c.fonte] || 0) + 1;

    console.log(`✅ ${pagina.length} de ${total} (filtrados: somenteTel=${somenteTelefone}, search="${search}")`);

    res.json({
      total,
      clientes: pagina,
      resumo: { totalClientes: total, porFonte, fontes: Object.keys(porFonte).length },
      pagination: { page, limit, total, totalPages },
    });

  } catch (err) {
    console.error('/api/todos-clientes erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar clientes', message: err.message });
  }
});

export default router;
