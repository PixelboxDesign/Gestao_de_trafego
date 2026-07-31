use sqlx::{mysql::MySqlPoolOptions, MySqlPool};
use std::env;
use tracing::info;

/// Conecta ao banco MariaDB local
pub async fn connect() -> anyhow::Result<MySqlPool> {
    let host     = env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string());
    let port     = env::var("DB_PORT").unwrap_or_else(|_| "3306".to_string());
    let user     = env::var("DB_USER").unwrap_or_else(|_| "root".to_string());
    let password = env::var("DB_PASSWORD").unwrap_or_else(|_| "1728f1br".to_string());
    let database = env::var("DB_NAME").unwrap_or_else(|_| "histórico_alphahall".to_string());

    let url = format!("mysql://{}:{}@{}:{}/{}", user, password, host, port, database);

    info!("Conectando ao banco: {}:{}/{}", host, port, database);

    let pool = MySqlPoolOptions::new()
        .max_connections(10)
        .connect(&url)
        .await?;

    Ok(pool)
}
