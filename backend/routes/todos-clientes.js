import express from 'express';
import { query } from '../config/database.js';

const router = express.Router();

// GET /api/todos-clientes — todos os clientes de todas as fontes confirmadas
router.get('/', async (req, res) => {
  try {
    console.log('🔍 /api/todos-clientes iniciado');

    const sql = `
      SELECT DISTINCT nome, fonte, email, cidade, estado
      FROM (
        SELECT DISTINCT TRIM(contato_nome) AS nome, 'Bling E-commerce - Pedidos'    AS fonte, NULL  AS email, NULL AS cidade, NULL AS estado
          FROM bling_pedidos_venda_ecommerce
         WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION
        SELECT DISTINCT TRIM(contato_nome), 'Bling E-commerce - NFe',          NULL, NULL, NULL
          FROM bling_nfe_saida_detalhes_ecommerce
         WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION
        SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - Pedidos',    NULL, NULL, NULL
          FROM bling_pedidos_venda_distribuicao
         WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION
        SELECT DISTINCT TRIM(contato_nome), 'Bling Distribuição - NFe',        NULL, NULL, NULL
          FROM bling_nfe_saida_detalhes_distribuicao
         WHERE contato_nome IS NOT NULL AND TRIM(contato_nome) != ''
        UNION
        SELECT DISTINCT TRIM(name), 'Tray E-commerce', email, city, state
          FROM clientes_tray_ecommerce
         WHERE name IS NOT NULL AND TRIM(name) != ''
        UNION
        SELECT DISTINCT TRIM(name), 'Tray Distribuição', email, city, state
          FROM clientes_tray_distribuicao
         WHERE name IS NOT NULL AND TRIM(name) != ''
      ) todos
      WHERE LENGTH(nome) > 2
      ORDER BY nome ASC
    `;

    const clientes = await query(sql);
    console.log(`✅ /api/todos-clientes: ${clientes.length} clientes`);

    // Agrupar por fonte para o resumo
    const porFonte = {};
    for (const c of clientes) {
      porFonte[c.fonte] = (porFonte[c.fonte] || 0) + 1;
    }

    res.json({
      total: clientes.length,
      clientes,
      resumo: {
        totalClientes: clientes.length,
        porFonte,
        fontes: Object.keys(porFonte).length,
      },
    });
  } catch (err) {
    console.error('/api/todos-clientes erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar clientes', message: err.message });
  }
});

export default router;
