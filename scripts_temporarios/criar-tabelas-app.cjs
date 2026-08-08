/**
 * Cria as tabelas da aplicação no banco luna_cosmeticos
 * Prefixo app_ = dados escritos pela aplicação (não são dados de origem externa)
 */

const mysql = require('mysql2/promise');

const CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '1728f1br',
  database: 'luna_cosmeticos',
};

async function criar() {
  const conn = await mysql.createConnection(CONFIG);
  console.log('✅ Conectado ao banco luna_cosmeticos\n');

  // ─── app_disparos ──────────────────────────────────────────────────────────
  // Histórico de mensagens enviadas via WhatsApp
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS app_disparos (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      numero        VARCHAR(20)   NOT NULL COMMENT 'Número destino (só dígitos)',
      nome          VARCHAR(255)  NULL      COMMENT 'Nome do cliente (se disponível)',
      mensagem      TEXT          NOT NULL  COMMENT 'Mensagem enviada',
      kit_nome      VARCHAR(255)  NULL      COMMENT 'Kit do catálogo vinculado (se houver)',
      status        ENUM('enviado','erro','pendente') NOT NULL DEFAULT 'pendente',
      erro_msg      TEXT          NULL      COMMENT 'Detalhe do erro (se status=erro)',
      criado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      enviado_em    DATETIME      NULL      COMMENT 'Momento do envio confirmado',
      INDEX idx_numero    (numero),
      INDEX idx_status    (status),
      INDEX idx_criado_em (criado_em)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='[APP] Histórico de disparos WhatsApp'
  `);
  console.log('✅ Tabela app_disparos criada/verificada');

  // ─── app_whatsapp_sessoes ─────────────────────────────────────────────────
  // Controle de sessões WhatsApp conectadas
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS app_whatsapp_sessoes (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      numero        VARCHAR(20)   NULL      COMMENT 'Número conectado',
      status        ENUM('disconnected','qr','connecting','connected','error') NOT NULL DEFAULT 'disconnected',
      conectado_em  DATETIME      NULL,
      atualizado_em DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='[APP] Status da sessão WhatsApp'
  `);
  console.log('✅ Tabela app_whatsapp_sessoes criada/verificada');

  // ─── app_campanhas ────────────────────────────────────────────────────────
  // Agrupamento de disparos em campanhas (para uso futuro)
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS app_campanhas (
      id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nome          VARCHAR(255)  NOT NULL,
      descricao     TEXT          NULL,
      kit_nome      VARCHAR(255)  NULL,
      total_numeros INT UNSIGNED  NOT NULL DEFAULT 0,
      total_enviado INT UNSIGNED  NOT NULL DEFAULT 0,
      total_erro    INT UNSIGNED  NOT NULL DEFAULT 0,
      status        ENUM('rascunho','em_andamento','concluida','cancelada') NOT NULL DEFAULT 'rascunho',
      criado_em     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      iniciado_em   DATETIME      NULL,
      finalizado_em DATETIME      NULL,
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      COMMENT='[APP] Campanhas de disparo'
  `);
  console.log('✅ Tabela app_campanhas criada/verificada');

  // Adiciona coluna campanha_id em app_disparos (se não existir)
  try {
    await conn.execute(`
      ALTER TABLE app_disparos 
      ADD COLUMN campanha_id INT UNSIGNED NULL AFTER kit_nome,
      ADD INDEX idx_campanha (campanha_id)
    `);
    console.log('✅ Coluna campanha_id adicionada em app_disparos');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  campanha_id já existe em app_disparos');
    } else {
      console.warn('⚠️ ', e.message);
    }
  }

  // ─── Verifica resultado ───────────────────────────────────────────────────
  const [tabelas] = await conn.execute(
    "SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'luna_cosmeticos' AND TABLE_NAME LIKE 'app_%' ORDER BY TABLE_NAME"
  );
  console.log('\n📋 Tabelas [APP] no banco luna_cosmeticos:');
  tabelas.forEach(t => console.log(`   ${t.TABLE_NAME} — ${t.TABLE_COMMENT}`));

  await conn.end();
  console.log('\n✅ Pronto!');
}

criar().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
