/**
 * 📚 CATÁLOGO COMPLETO DO BANCO hawktec_alpha-ecommerce
 * 
 * Total: 72 tabelas catalogadas em 2026-07-15T01:51:00.302Z
 * 
 * Este arquivo é a REFERÊNCIA DEFINITIVA de todas as tabelas e colunas.
 * Use este catálogo antes de escrever qualquer query SQL.
 */

export const DATABASE_CATALOG = {
  
  // ========================================
  // TABELAS DE CLIENTES (4 tabelas)
  // ========================================
  
  CLIENTES: {
    // Tabela principal de clientes Tray Ecommerce
    clientes_tray_ecommerce: {
      colunas: ['CustomerID', 'name', 'cpf', 'email', 'gender', 'city', 'state', 'created', 'updated_at'],
      primaryKey: 'CustomerID',
      descricao: 'Clientes do e-commerce Tray'
    },
    
    // Tabela de clientes Tray Ecommerce com deltas (mudanças)
    clientes_tray_ecommerce_deltas: {
      colunas: ['CustomerID', 'name', 'cpf', 'email', 'gender', 'city', 'state', 'created', 'updated_at'],
      primaryKey: 'CustomerID',
      descricao: 'Histórico de alterações de clientes'
    },
    
    // Atributos customizados dos clientes
    tray_customers_attributes: {
      colunas: ['id', 'customer_id', 'property', 'first_name', 'last_name', 'cpf', 'date', 'number', 'created', 'modified'],
      primaryKey: 'id',
      foreignKey: 'customer_id',
      descricao: 'Atributos personalizados dos clientes (nome, sobrenome, CPF)'
    },
    
    // Atributos customizados dos clientes (distribuição)
    tray_customers_attributesdist: {
      colunas: ['id', 'customer_id', 'property', 'first_name', 'last_name', 'cpf', 'date', 'number', 'created', 'modified'],
      primaryKey: 'id',
      foreignKey: 'customer_id',
      descricao: 'Atributos customizados - canal distribuição'
    }
  },
  
  // ========================================
  // TABELAS DE PEDIDOS (5 tabelas principais)
  // ========================================
  
  PEDIDOS: {
    // Pedidos E-commerce via Tray
    pedidos_ecommerce_tray: {
      colunas: ['id', 'numero_pedido', 'nome', 'email', 'cpf', 'valor_total', 'status_pedido', 'canal_origem', 'data_pedido', 'created_at', 'updated_at'],
      primaryKey: 'id',
      descricao: 'Pedidos do e-commerce (USAR "nome" para nome do cliente)'
    },
    
    // Detalhes completos dos pedidos (20 colunas)
    tray_ecommerce_pedidos_detalhes: {
      colunas: [
        'id', 'order_id', 'numero_pedido', 'status_pedido', 'nome_cliente', 
        'email_cliente', 'cpf', 'valor_total', 'valor_produtos', 'valor_frete', 
        'valor_desconto', 'metodo_pagamento', 'endereco_entrega', 'cidade', 
        'estado', 'cep', 'data_pedido', 'data_atualizacao', 'created_at', 'updated_at'
      ],
      primaryKey: 'id',
      foreignKey: 'order_id',
      descricao: 'Detalhes completos dos pedidos (USAR "nome_cliente" para nome)'
    },
    
    // Detalhes resumidos dos pedidos
    detalhes_pedidos_ecommerce_tray: {
      colunas: ['id', 'numero_pedido', 'customer_name', 'total', 'status', 'date'],
      primaryKey: 'id',
      descricao: 'Detalhes resumidos de pedidos'
    },
    
    // Pedidos de distribuição
    pedidos_distribuicao_tray: {
      colunas: ['id', 'numero_pedido', 'customer_name', 'total', 'status', 'date'],
      primaryKey: 'id',
      descricao: 'Pedidos do canal de distribuição'
    },
    
    // Tratamento de pedidos (creditos, reembolsos)
    apedidos_tray_tratamento: {
      colunas: [
        'id', 'numero_pedido', 'customer_id', 'valor_pedido', 'opcao_escolhida',
        'valor_credito', 'status', 'ip_registro', 'data_criacao', 'updated_at',
        'data_ultima_alteracao_status', 'data_ultima_alteracao_opcao'
      ],
      primaryKey: 'id',
      foreignKey: 'customer_id',
      descricao: 'Pedidos em tratamento (crédito/reembolso)'
    }
  },
  
  // ========================================
  // TABELAS DE PRODUTOS (11 tabelas)
  // ========================================
  
  PRODUTOS: {
    // Produtos distribuição
    bling_produtos_distribuicao: {
      colunas: ['id', 'nome', 'codigo', 'preco', 'preco_custo', 'unidade', 'peso', 'gtin', 'gtin_embalagem', 'tipo', 'situacao', 'formato', 'descricao_curta'],
      primaryKey: 'id',
      descricao: 'Produtos do canal de distribuição'
    },
    
    // Produtos e-commerce
    bling_produtos_ecommerce: {
      colunas: ['id', 'nome', 'codigo', 'preco', 'preco_custo', 'unidade', 'peso', 'gtin', 'gtin_embalagem', 'tipo', 'situacao', 'formato', 'descricao_curta'],
      primaryKey: 'id',
      descricao: 'Produtos do e-commerce'
    },
    
    // Estoque por depósito (distribuição)
    bling_produtos_estoque_depositos_distribuicao: {
      colunas: ['produto_id', 'deposito_id', 'saldo_virtual', 'saldo_fisico'],
      foreignKeys: ['produto_id', 'deposito_id'],
      descricao: 'Estoque por depósito - distribuição'
    },
    
    // Estoque por depósito (e-commerce)
    bling_produtos_estoque_depositos_ecommerce: {
      colunas: ['produto_id', 'deposito_id', 'saldo_virtual', 'saldo_fisico'],
      foreignKeys: ['produto_id', 'deposito_id'],
      descricao: 'Estoque por depósito - e-commerce'
    },
    
    // Estoque consolidado (distribuição)
    bling_produtos_estoque_distribuicao: {
      colunas: ['produto_id', 'saldo_virtual_total', 'saldo_fisico_total'],
      foreignKey: 'produto_id',
      descricao: 'Estoque total consolidado - distribuição'
    },
    
    // Estoque consolidado (e-commerce)
    bling_produtos_estoque_ecommerce: {
      colunas: ['produto_id', 'saldo_virtual_total', 'saldo_fisico_total'],
      foreignKey: 'produto_id',
      descricao: 'Estoque total consolidado - e-commerce'
    },
    
    // Produtos vendidos (resumo Tray)
    produtos_vendidos_tray_ecommerce: {
      colunas: ['id', 'produto_nome', 'quantidade_total', 'receita_total'],
      primaryKey: 'id',
      descricao: 'Resumo de produtos vendidos'
    }
  },
  
  // ========================================
  // TABELAS DE NOTAS FISCAIS (20 tabelas)
  // ========================================
  
  NOTAS_FISCAIS: {
    // NFe Saída - Detalhes (distribuição)
    bling_nfe_saida_detalhes_distribuicao: {
      temColunas: ['id', 'tipo', 'numero', 'serie', 'situacao', 'data_emissao', 'data_operacao', 'contato_nome', 'xml', 'link_danfe', 'chave_acesso'],
      primaryKey: 'id',
      descricao: 'Notas fiscais de saída - distribuição'
    },
    
    // NFe Saída - Detalhes (e-commerce)
    bling_nfe_saida_detalhes_ecommerce: {
      temColunas: ['id', 'tipo', 'numero', 'serie', 'situacao', 'data_emissao', 'data_operacao', 'contato_nome', 'xml', 'link_danfe', 'chave_acesso'],
      primaryKey: 'id',
      descricao: 'Notas fiscais de saída - e-commerce'
    },
    
    // NFe Saída - Itens (distribuição)
    bling_nfe_saida_detalhes_itens_distribuicao: {
      temColunas: ['nfe_id', 'codigo', 'descricao', 'quantidade', 'valor_unitario', 'valor_total'],
      foreignKey: 'nfe_id',
      descricao: 'Itens das notas fiscais - distribuição'
    },
    
    // NFe Saída - Itens (e-commerce)
    bling_nfe_saida_detalhes_itens_ecommerce: {
      temColunas: ['nfe_id', 'codigo', 'descricao', 'quantidade', 'valor_unitario', 'valor_total'],
      foreignKey: 'nfe_id',
      descricao: 'Itens das notas fiscais - e-commerce'
    }
  },
  
  // ========================================
  // TABELAS DE REDES SOCIAIS (14 tabelas)
  // ========================================
  
  FACEBOOK: {
    // Campanhas
    facebook_campaigns: {
      colunas: ['id', 'account_id', 'name', 'status', 'objective', 'created_time', 'updated_time', 'start_time', 'stop_time'],
      primaryKey: 'id',
      descricao: 'Campanhas do Facebook Ads'
    },
    
    // Anúncios
    facebook_ad_details: {
      colunas: ['id', 'name', 'campaign_id', 'adset_id', 'status', 'created_time', 'updated_time'],
      primaryKey: 'id',
      foreignKeys: ['campaign_id', 'adset_id'],
      descricao: 'Detalhes dos anúncios'
    },
    
    // Insights dos anúncios
    facebook_ad_insights: {
      colunas: ['id', 'ad_id', 'date_start', 'date_stop', 'impressions', 'clicks', 'spend', 'reach', 'ctr', 'cpc', 'cpm'],
      primaryKey: 'id',
      foreignKey: 'ad_id',
      descricao: 'Métricas de performance dos anúncios'
    },
    
    // Preview dos anúncios
    facebook_ad_preview: {
      colunas: ['id', 'ad_id', 'preview_url', 'created_at'],
      primaryKey: 'id',
      foreignKey: 'ad_id',
      descricao: 'Previews visuais dos anúncios'
    }
  },
  
  INSTAGRAM: {
    // Posts/Mídia
    instagram_media: {
      colunas: ['id', 'caption', 'media_type', 'media_url', 'permalink', 'timestamp', 'username'],
      primaryKey: 'id',
      descricao: 'Posts e stories do Instagram'
    },
    
    // Insights dos posts
    instagram_media_insights: {
      colunas: ['id', 'media_id', 'metric_name', 'value', 'fetched_at'],
      primaryKey: 'id',
      foreignKey: 'media_id',
      descricao: 'Métricas dos posts (engajamento, alcance, salvamentos)'
    }
  },
  
  TIKTOK: {
    // Campanhas
    tiktokads_campaigns: {
      colunas: ['id', 'advertiser_id', 'campaign_name', 'objective', 'budget', 'status', 'created_time', 'modified_time'],
      primaryKey: 'id',
      descricao: 'Campanhas do TikTok Ads'
    },
    
    // Grupos de anúncios
    tiktokads_adgroups: {
      colunas: ['id', 'campaign_id', 'adgroup_name', 'budget', 'status', 'created_time', 'modified_time'],
      primaryKey: 'id',
      foreignKey: 'campaign_id',
      descricao: 'Grupos de anúncios'
    }
  },
  
  GOOGLE_ADS: {
    // Campanhas Google Ads
    googleads_campaigns: {
      colunas: ['id', 'customer_id', 'name', 'status', 'budget', 'created_at', 'updated_at'],
      primaryKey: 'id',
      descricao: 'Campanhas do Google Ads'
    }
  },
  
  // ========================================
  // TABELAS DE CONFIGURAÇÃO (2 tabelas)
  // ========================================
  
  SISTEMA: {
    // Usuários do sistema
    usuarios: {
      colunas: ['id', 'username', 'email', 'password_hash', 'role', 'created_at', 'last_login'],
      primaryKey: 'id',
      descricao: 'Usuários do sistema'
    },
    
    // Configurações gerais
    configuracoes_sistema: {
      colunas: ['id', 'chave', 'valor', 'descricao', 'updated_at'],
      primaryKey: 'id',
      descricao: 'Configurações gerais do sistema'
    }
  }
};

/**
 * 🔗 CORRELAÇÕES DETECTADAS (87 possíveis relações)
 * 
 * Principais ligações entre tabelas:
 */

export const CORRELATIONS = {
  // Cliente → Pedidos
  customer_id: {
    origem: ['apedidos_tray_tratamento', 'tray_customers_attributes'],
    destino: ['clientes_tray_ecommerce', 'clientes_tray_ecommerce_deltas']
  },
  
  // Pedido → Detalhes
  numero_pedido: {
    origem: ['apedidos_tray_tratamento', 'pedidos_ecommerce_tray', 'tray_ecommerce_pedidos_detalhes'],
    descricao: 'Número do pedido usado para juntar tabelas'
  },
  
  order_id: {
    origem: 'tray_ecommerce_pedidos_detalhes',
    destino: 'pedidos_ecommerce_tray',
    descricao: 'FK que liga pedidos aos seus detalhes'
  },
  
  // Produto → Estoque
  produto_id: {
    origem: ['bling_produtos_estoque_depositos_*', 'bling_produtos_estoque_*'],
    destino: ['bling_produtos_distribuicao', 'bling_produtos_ecommerce']
  },
  
  // NFe → Itens
  nfe_id: {
    origem: ['bling_nfe_saida_detalhes_itens_*'],
    destino: ['bling_nfe_saida_detalhes_*']
  },
  
  // Campanha → Anúncios
  campaign_id: {
    origem: ['facebook_ad_details', 'tiktokads_adgroups'],
    destino: ['facebook_campaigns', 'tiktokads_campaigns']
  },
  
  // Anúncio → Insights
  ad_id: {
    origem: ['facebook_ad_insights', 'facebook_ad_preview'],
    destino: 'facebook_ad_details'
  },
  
  // Mídia → Insights
  media_id: {
    origem: 'instagram_media_insights',
    destino: 'instagram_media'
  }
};

/**
 * 📊 QUERIES COMUNS (Templates SQL corretos)
 */

export const COMMON_QUERIES = {
  
  // BUSCAR TODOS OS CLIENTES
  todosClientes: `
    SELECT DISTINCT 
      COALESCE(c.name, t.first_name, t.last_name) as nome_cliente,
      c.email,
      c.city,
      c.state
    FROM clientes_tray_ecommerce c
    LEFT JOIN tray_customers_attributes t ON c.CustomerID = t.customer_id
    WHERE c.name IS NOT NULL OR t.first_name IS NOT NULL
    UNION
    SELECT DISTINCT 
      nome as nome_cliente,
      email,
      NULL as city,
      NULL as state
    FROM pedidos_ecommerce_tray
    WHERE nome IS NOT NULL
    UNION
    SELECT DISTINCT 
      nome_cliente,
      email_cliente as email,
      cidade as city,
      estado as state
    FROM tray_ecommerce_pedidos_detalhes
    WHERE nome_cliente IS NOT NULL
  `,
  
  // PEDIDOS COM CLIENTE
  pedidosComCliente: `
    SELECT 
      p.numero_pedido,
      p.nome as nome_cliente,
      p.email,
      p.valor_total,
      p.status_pedido,
      p.data_pedido
    FROM pedidos_ecommerce_tray p
    WHERE p.data_pedido >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ORDER BY p.data_pedido DESC
  `,
  
  // PRODUTOS COM ESTOQUE
  produtosComEstoque: `
    SELECT 
      p.id,
      p.nome,
      p.codigo,
      p.preco,
      e.saldo_fisico_total,
      e.saldo_virtual_total
    FROM bling_produtos_ecommerce p
    LEFT JOIN bling_produtos_estoque_ecommerce e ON p.id = e.produto_id
    WHERE p.situacao = 'Ativo'
  `,
  
  // PERFORMANCE DE ANÚNCIOS FACEBOOK
  performanceFacebook: `
    SELECT 
      c.name as campanha,
      a.name as anuncio,
      i.impressions,
      i.clicks,
      i.spend,
      i.ctr,
      i.cpc
    FROM facebook_campaigns c
    JOIN facebook_ad_details a ON c.id = a.campaign_id
    JOIN facebook_ad_insights i ON a.id = i.ad_id
    WHERE i.date_start >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY i.spend DESC
  `
};

/**
 * ⚠️ NOTAS IMPORTANTES:
 * 
 * 1. NOMES DE COLUNAS PARA CLIENTES:
 *    - clientes_tray_ecommerce: usar "name"
 *    - pedidos_ecommerce_tray: usar "nome"
 *    - tray_ecommerce_pedidos_detalhes: usar "nome_cliente"
 *    - tray_customers_attributes: usar "first_name" + "last_name"
 * 
 * 2. NUNCA usar "customer_name" - essa coluna NÃO EXISTE!
 * 
 * 3. Sempre use o catálogo DATABASE_CATALOG antes de escrever queries
 * 
 * 4. Para JOINs, consulte CORRELATIONS para saber as FKs corretas
 */
