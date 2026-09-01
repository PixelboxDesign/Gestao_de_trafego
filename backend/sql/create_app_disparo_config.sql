-- Tabela para armazenar a configuração do disparo (persistente)
CREATE TABLE IF NOT EXISTS `app_disparo_config` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `mensagem` TEXT NOT NULL,
  `item_id` INT DEFAULT NULL,
  `item_tipo` VARCHAR(50) DEFAULT NULL COMMENT 'kit ou produto',
  `item_nome` VARCHAR(255) DEFAULT NULL,
  `item_thumb_url` TEXT DEFAULT NULL,
  `quantidade` INT UNSIGNED NOT NULL DEFAULT 10,
  `intervalo_valor` DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  `intervalo_unidade` VARCHAR(20) NOT NULL DEFAULT 'horas' COMMENT 'horas ou minutos',
  `criado_em` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
