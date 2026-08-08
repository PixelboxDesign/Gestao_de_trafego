pub mod catalogo;
pub mod clientes;
pub mod disparos;
pub mod logs;
pub mod whatsapp;

use axum::{
    http::Method,
    routing::get,
    Router,
};
use std::{net::SocketAddr, sync::Arc};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};
use tracing::info;

use crate::AppState;

/// Tenta vincular a uma porta a partir de `start`, incrementando até encontrar uma livre
async fn bind_available_port(start: u16) -> (tokio::net::TcpListener, u16) {
    let mut port = start;
    loop {
        let addr = SocketAddr::from(([0, 0, 0, 0], port));
        match tokio::net::TcpListener::bind(addr).await {
            Ok(listener) => return (listener, port),
            Err(_) => {
                info!("Porta {} ocupada, tentando {}...", port, port + 1);
                port += 1;
            }
        }
    }
}

pub async fn start_server(state: Arc<Mutex<AppState>>) {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any);

    let app = Router::new()
        // Health check
        .route("/health", get(health))
        // Rotas de clientes
        .route("/api/clientes", get(clientes::list))
        .route("/api/clientes/filtros/ufs", get(clientes::list_ufs))
        .route("/api/clientes/filtros/cidades", get(clientes::list_cidades))
        .route("/api/clientes/filtros/fontes", get(clientes::list_fontes))
        .route("/api/clientes/:id", get(clientes::get_by_id))
        // Rotas de catálogo
        .route("/api/catalogo/kits", get(catalogo::listar_kits))
        .route("/api/catalogo/imagem/:kit", get(catalogo::servir_imagem))
        .route("/api/catalogo/salvar", axum::routing::post(catalogo::salvar_info))
        .route("/api/catalogo/files/*path", get(catalogo::serve_file))
        // Rotas de WhatsApp
        .route("/api/whatsapp/status", get(whatsapp::status))
        .route("/api/whatsapp/qr", get(whatsapp::get_qr))
        .route("/api/whatsapp/desconectar", axum::routing::post(whatsapp::desconectar))
        .route("/api/whatsapp/send", axum::routing::post(whatsapp::send_message))
        // Rotas de logs
        .route("/api/logs", get(logs::list))
        // Rotas de disparos
        .route("/api/disparos", get(disparos::list))
        .route("/api/disparos", axum::routing::post(disparos::criar))
        .layer(cors)
        .with_state(state);

    let (listener, port) = bind_available_port(3001).await;
    info!("🚀 API REST ouvindo em http://0.0.0.0:{}", port);

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
