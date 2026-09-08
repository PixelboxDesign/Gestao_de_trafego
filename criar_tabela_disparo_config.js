const mysql = require('mysql2/promise');

(async () => {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '1728f1br',
      database: 'luna_cosmeticos'
    });
    
    console.log('✅ Conectado no banco luna_cosmeticos');
    
    const createTableSQL = `
CREATE TABLE IF NOT EXISTS app_disparo_config (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mensagem TEXT NOT NULL,
  item_id INT UNSIGNED NULL,
  item_tipo VARCHAR(20) NULL COMMENT 'kit ou produto',
  item_nome VARCHAR(255) NULL,
  item_thumb_url TEXT NULL,
  quantidade INT UNSIGNED NOT NULL DEFAULT 10,
  intervalo_valor DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  intervalo_unidade VARCHAR(20) NOT NULL DEFAULT 'horas' COMMENT 'horas ou minutos',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Configuração do disparo de mensagens WhatsApp'
    `;
    
    console.log('Executando SQL...');
    await conn.execute(createTableSQL);
    console.log('✅ Tabela app_disparo_config criada com sucesso!');
    
    const [rows] = await conn.execute('SELECT COUNT(*) as total FROM app_disparo_config');
    console.log(`Total de registros: ${rows[0].total}`);
    
    await conn.end();
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error(err);
    process.exit(1);
  }
})();
