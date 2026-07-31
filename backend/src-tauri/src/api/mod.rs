pub mod catalogo;
pub mod clientes;
pub mod logs;
pub mod whatsapp;

use axum::{
    http::{HeaderValue, Method},
    routing::get,
    Router,
};
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::Mutex;
use tower_http::cors::CorsLayer;
use tracing::info;

use crate::AppState;

pub async fn start_server(state: Arc<Mutex<AppState>>) {
    let cors = CorsLayer::new()
        .allow_origin("*".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        // Health check
        .route("/health", get(health))
        // Rotas de clientes
        .route("/api/clientes", get(clientes::list))
        .route("/api/clientes/:id", get(clientes::get_by_id))
        // Rotas de catálogo
        .route("/api/catalogo", get(catalogo::list_files))
        .route("/api/catalogo/*path", get(catalogo::serve_file))
        // Rotas de WhatsApp
        .route("/api/whatsapp/status", get(whatsapp::status))
        .route("/api/whatsapp/qr", get(whatsapp::get_qr))
        .route("/api/whatsapp/send", axum::routing::post(whatsapp::send_message))
        // Rotas de logs
        .route("/api/logs", get(logs::list))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], 3001));
    info!("🚀 API REST ouvindo em http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "luna-server",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Local::now().to_rfc3339()
    }))
}
