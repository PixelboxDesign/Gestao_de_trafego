import express from 'express';
import { query } from '../config/database.js';
import { queryLocal } from '../config/database-local.js';

const router = express.Router();

// ── Limpeza de nome ───────────────────────────────────────────────────────────
function limparNomeJS(nome) {
  if (!nome) return '';
  let n = String(nome).trim();
  n = n.replace(/&#[0-9]+;?/g, '');           // entidades HTML
  n = n.replace(/^[\d][\d. \-/]*/, '').trim(); // CPF/CNPJ prefixado
  n = n.replace(/\s*\([^)]*\)\s*$/, '').trim();// sufixo login Tray
  return n;
}

function nomeValido(nome) {
  if (!nome || nome.length < 3) return false;
  if (/^[\d .\/\-]+$/.test(nome)) return false;
  if (nome.startsWith('&#')) return false;
  return true;
}

// ── SQL: clientes do banco remoto ─────────────────────────────────────────────
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

// ── SQL: telefones do banco remoto ────────────────────────────────────────────
// Retorna múltiplos pares (nome, telefone, fonte) — um por fonte
const FONES_RAW_SQL = `
  SELECT TRIM(p.contato_nome) AS nome, TRIM(n.contato_telefone) AS telefone,
         'Bling E-commerce' AS fonte
  FROM bling_pedidos_venda_ecommerce p
  JOIN bling_nfe_saida_detalhes_ecommerce n ON n.contato_id = p.contato_id
  WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
    AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND p.contato_nome IS NOT NULL AND LENGTH(TRIM(p.contato_nome)) > 2
  UNION ALL
  SELECT TRIM(p.contato_nome), TRIM(n.contato_telefone), 'Bling Distribuição'
  FROM bling_pedidos_venda_distribuicao p
  JOIN bling_nfe_saida_detalhes_distribuicao n ON n.contato_id = p.contato_id
  WHERE p.contato_id IS NOT NULL AND p.contato_id != '0'
    AND n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND p.contato_nome IS NOT NULL AND LENGTH(TRIM(p.contato_nome)) > 2
  UNION ALL
  SELECT TRIM(contato_nome), TRIM(contato_telefone), 'Bling E-commerce'
  FROM bling_nfe_saida_detalhes_ecommerce
  WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
    AND contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION ALL
  SELECT TRIM(contato_nome), TRIM(contato_telefone), 'Bling Distribuição'
  FROM bling_nfe_saida_detalhes_distribuicao
  WHERE contato_telefone IS NOT NULL AND TRIM(contato_telefone) != ''
    AND contato_nome IS NOT NULL AND LENGTH(TRIM(contato_nome)) > 2
  UNION ALL
  SELECT TRIM(c.name), TRIM(n.contato_telefone), 'Tray E-commerce'
  FROM clientes_tray_ecommerce c
  JOIN bling_nfe_saida_detalhes_ecommerce n ON TRIM(n.contato_email) = TRIM(c.email)
  WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND c.email IS NOT NULL AND TRIM(c.email) != ''
    AND c.name IS NOT NULL AND LENGTH(TRIM(c.name)) > 2
  UNION ALL
  SELECT TRIM(c.name), TRIM(n.contato_telefone), 'Tray E-commerce'
  FROM clientes_tray_ecommerce c
  JOIN bling_nfe_saida_detalhes_distribuicao n ON TRIM(n.contato_email) = TRIM(c.email)
  WHERE n.contato_telefone IS NOT NULL AND TRIM(n.contato_telefone) != ''
    AND c.email IS NOT NULL AND TRIM(c.email) != ''
    AND c.name IS NOT NULL AND LENGTH(TRIM(c.name)) > 2
  UNION ALL
  SELECT TRIM(pe.contato_nome), TRIM(nd.contato_telefone), 'Bling E-commerce'
  FROM bling_pedidos_venda_ecommerce pe
  JOIN bling_nfe_saida_detalhes_distribuicao nd
    ON REPLACE(REPLACE(REPLACE(nd.contato_numerodocumento,'.',''),'-',''),'/','')
     = REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')
  WHERE nd.contato_telefone IS NOT NULL AND TRIM(nd.contato_telefone) != ''
    AND pe.contato_numerodocumento IS NOT NULL
    AND LENGTH(REPLACE(REPLACE(REPLACE(pe.contato_numerodocumento,'.',''),'-',''),'/','')) >= 11
    AND pe.contato_nome IS NOT NULL AND LENGTH(TRIM(pe.contato_nome)) > 2
`;

// ── SQL: clientes e telefones dos XMLs (banco local) ─────────────────────────
const XML_CLIENTES_SQL = `
  SELECT dest_nome AS nome, 'XML Interno' AS fonte,
         dest_email AS email, dest_municipio AS cidade, dest_uf AS estado
  FROM nfe_xml_importado
  WHERE dest_nome IS NOT NULL AND LENGTH(TRIM(dest_nome)) > 2
`;

const XML_FONES_SQL = `
  SELECT dest_nome AS nome, dest_telefone AS telefone, 'XML Interno' AS fonte
  FROM nfe_xml_importado
  WHERE dest_telefone IS NOT NULL AND TRIM(dest_telefone) != ''
    AND dest_nome IS NOT NULL AND LENGTH(TRIM(dest_nome)) > 2
`;

// ── Construir mapa de telefones com mesclagem ─────────────────────────────────
// Para cada nome limpo, acumula todos os pares (telefone, fonte).
// Regra de mesclagem:
//   - Mesmo telefone, fontes diferentes → um telefone, fontes concatenadas
//   - Telefones diferentes → concatenados com " / "
//   - Fontes correspondentes a cada telefone também concatenadas
function construirMapaTelefonesMesclado(fonesRows) {
  // nome_limpo → Map<telefone, Set<fonte>>
  const mapaTemp = new Map();

  for (const r of fonesRows) {
    const nomeLimpo = limparNomeJS(r.nome);
    if (!nomeValido(nomeLimpo)) continue;
    const tel   = String(r.telefone || '').replace(/\D/g, '').trim();
    const fonte = r.fonte || '';
    if (!tel || tel.length < 8) continue;

    if (!mapaTemp.has(nomeLimpo)) mapaTemp.set(nomeLimpo, new Map());
    const telMap = mapaTemp.get(nomeLimpo);
    if (!telMap.has(tel)) telMap.set(tel, new Set());
    telMap.get(tel).add(fonte);
  }

  // Converter para mapa final: nome_limpo → { telefone, fonte }
  const mapaFinal = new Map();
  for (const [nome, telMap] of mapaTemp) {
    // Ordenar telefones para consistência
    const telefones = [...telMap.keys()].sort();
    const partes    = telefones.map(tel => {
      const fontes = [...telMap.get(tel)].sort().join(', ');
      return { tel, fontes };
    });

    // Concatenar todos os telefones com " / "
    const telefoneStr = partes.map(p => p.tel).join(' / ');
    // Concatenar todas as fontes únicas
    const todasFontes = [...new Set(partes.flatMap(p => p.fontes.split(', ')))].sort();
    const fonteStr    = todasFontes.join(', ');

    mapaFinal.set(nome, { telefone: telefoneStr, fonte_tel: fonteStr });
  }

  return mapaFinal;
}

// ── Deduplicar clientes ───────────────────────────────────────────────────────
function deduplicarClientes(rows) {
  const mapa = new Map();

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
      const ex = mapa.get(nomeLimpo);
      if (!ex.email  && r.email)  ex.email  = r.email;
      if (!ex.cidade && r.cidade) ex.cidade = r.cidade;
      if (!ex.estado && r.estado) ex.estado = r.estado;
      // Agregar fontes únicas no campo fonte
      if (r.fonte && !ex.fonte.includes(r.fonte)) {
        ex.fonte = [...new Set([...ex.fonte.split(', '), r.fonte])].sort().join(', ');
      }
    }
  }

  return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

// ── Cache ─────────────────────────────────────────────────────────────────────
let _cache    = null;
let _cacheTTL = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

async function getClientesDedup() {
  const agora = Date.now();
  if (_cache && agora < _cacheTTL) return _cache;

  console.log('🔄 Reconstruindo cache de clientes...');

  // Buscar dados do remoto e do banco local em paralelo
  const [rawRemoto, fonesRemoto, rawLocal, fonesLocal] = await Promise.all([
    query(CLIENTES_RAW_SQL),
    query(FONES_RAW_SQL),
    queryLocal(XML_CLIENTES_SQL),   // retorna [] se banco local indisponível
    queryLocal(XML_FONES_SQL),
  ]);

  console.log(`  Remoto: ${rawRemoto.length} clientes, ${fonesRemoto.length} registros de fone`);
  console.log(`  XML local: ${rawLocal.length} clientes, ${fonesLocal.length} registros de fone`);

  // Unir todas as linhas e deduplicar
  const todosRaw   = [...rawRemoto, ...rawLocal];
  const todosFones = [...fonesRemoto, ...fonesLocal];

  const clientes    = deduplicarClientes(todosRaw);
  const fonesMapa   = construirMapaTelefonesMesclado(todosFones);

  // Enriquecer clientes com telefone e fonte_tel
  for (const c of clientes) {
    const dados = fonesMapa.get(c.nome);
    c.telefone  = dados?.telefone  || null;
    c.fonte_tel = dados?.fonte_tel || null; // quais fontes têm o telefone
  }

  _cache    = clientes;
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
    const ufFiltro        = (req.query.uf     || '').trim();
    const cidadeFiltro    = (req.query.cidade || '').trim();

    const todos = await getClientesDedup();

    let filtrados = todos;
    if (somenteTelefone) filtrados = filtrados.filter(c => c.telefone);
    if (search)          filtrados = filtrados.filter(c => c.nome.toLowerCase().includes(search));
    if (ufFiltro)        filtrados = filtrados.filter(c => c.estado === ufFiltro);
    if (cidadeFiltro)    filtrados = filtrados.filter(c => c.cidade === cidadeFiltro);

    const total      = filtrados.length;
    const totalPages = Math.ceil(total / limit);
    const pagina     = filtrados.slice(offset, offset + limit);

    const porFonte = {};
    for (const c of pagina) {
      const f = c.fonte || 'Desconhecido';
      porFonte[f] = (porFonte[f] || 0) + 1;
    }

    const baseParaSelects = (ufFiltro || cidadeFiltro)
      ? todos.filter(c => {
          if (somenteTelefone && !c.telefone) return false;
          if (search && !c.nome.toLowerCase().includes(search)) return false;
          return true;
        })
      : filtrados;

    const ufsDisponiveis = [...new Set(
      baseParaSelects.map(c => c.estado).filter(Boolean)
    )].sort();

    const cidadesDisponiveis = [...new Set(
      (ufFiltro ? baseParaSelects.filter(c => c.estado === ufFiltro) : baseParaSelects)
        .map(c => c.cidade).filter(Boolean)
    )].sort();

    res.json({
      total, clientes: pagina,
      resumo: { totalClientes: total, porFonte, fontes: Object.keys(porFonte).length },
      pagination: { page, limit, total, totalPages },
      ufsDisponiveis,
      cidadesDisponiveis,
    });

  } catch (err) {
    console.error('/api/todos-clientes erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar clientes', message: err.message });
  }
});

export default router;
