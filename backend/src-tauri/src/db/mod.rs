use sqlx::mysql::{MySqlConnectOptions, MySqlPoolOptions};
use sqlx::MySqlPool;
use std::env;
use tracing::info;

/// Conecta ao banco MariaDB local
pub async fn connect() -> anyhow::Result<MySqlPool> {
    let host     = env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string());
    let port: u16 = env::var("DB_PORT")
        .unwrap_or_else(|_| "3306".to_string())
        .parse()
        .unwrap_or(3306);
    let user     = env::var("DB_USER").unwrap_or_else(|_| "root".to_string());
    let password = env::var("DB_PASSWORD").unwrap_or_else(|_| "1728f1br".to_string());
    let database = env::var("DB_NAME").unwrap_or_else(|_| "histórico_alphahall".to_string());

    info!("Conectando ao banco: {}:{}/{}", host, port, database);

    // Usa MySqlConnectOptions para evitar encoding do nome do banco na URL
    let opts = MySqlConnectOptions::new()
        .host(&host)
        .port(port)
        .username(&user)
        .password(&password)
        .database(&database)
        .charset("utf8mb4");

    let pool = MySqlPoolOptions::new()
        .max_connections(10)
        .connect_with(opts)
        .await?;

    Ok(pool)
}
