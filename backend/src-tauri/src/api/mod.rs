pub mod catalogo;
pub mod catalogo_db;
pub mod clientes;
pub mod disparos;
pub mod logs;
pub mod render_deploy;
pub mod whatsapp;

use axum::{
    extract::Request,
    http::Method,
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use std::{net::SocketAddr, sync::Arc, time::Instant};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
use tracing::info;

use crate::AppState;

/// Middleware para logar TODAS as requisições HTTP
async fn log_middleware(
    axum::extract::State(state): axum::extract::State<Arc<Mutex<AppState>>>,
    req: Request,
    next: Next,
) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let start = Instant::now();
    
    info!("📨 [HTTP IN] {} {}", method, uri);
    
    // Log no AppState
    if let Ok(mut s) = state.try_lock() {
        s.add_log(
            crate::state::LogLevel::Info,
            "HTTP",
            &format!("Request: {} {}", method, uri)
        );
    }
    
    let response = next.run(req).await;
    
    let duration = start.elapsed();
    let status = response.status();
    
    let log_symbol = if status.is_success() {
        "✅"
    } else if status.is_client_error() {
        "⚠️"
    } else {
        "❌"
    };
    
    let level = if status.is_success() {
        crate::state::LogLevel::Info
    } else if status.is_client_error() {
        crate::state::LogLevel::Warn
    } else {
        crate::state::LogLevel::Error
    };
    
    info!(
        "{} [HTTP OUT] {} {} - Status: {} - Tempo: {:?}",
        log_symbol, method, uri, status, duration
    );
    
    // Log no AppState
    if let Ok(mut s) = state.try_lock() {
        s.add_log(
            level,
            "HTTP",
            &format!("Response: {} {} - {} ({:?})", method, uri, status, duration)
        );
    }
    
    response
}

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
    info!("🔧 [HTTP] Configurando servidor Axum...");
    
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any);
    
    info!("✅ [HTTP] CORS configurado");

    info!("🗺️ [HTTP] Registrando rotas...");
    
    // Caminho absoluto para a pasta dist
    let dist_path = std::path::PathBuf::from("f:\\luna_cosmeticos\\backend\\dist");
    info!("📁 [HTTP] Servindo assets de: {:?}", dist_path);
    
    let app = Router::new()
        // Rota raiz - serve index.html
        .route("/", get(serve_index))
        // Serve arquivos estáticos (CSS, JS)
        .nest_service("/assets", ServeDir::new(dist_path.join("assets")))
        // Health check
        .route("/health", get(health))
        // Rotas de clientes
        .route("/api/clientes", get(clientes::list))
        .route("/api/clientes/filtros/ufs", get(clientes::list_ufs))
        .route("/api/clientes/filtros/cidades", get(clientes::list_cidades))
        .route("/api/clientes/filtros/fontes", get(clientes::list_fontes))
        .route("/api/clientes/:id", get(clientes::get_by_id))
        // Rotas de catálogo (v1 - arquivos)
        .route("/api/catalogo/marcas", get(catalogo::listar_marcas))
        .route("/api/catalogo/kits/:marca", get(catalogo::listar_kits))
        .route("/api/catalogo/imagem/:marca/:kit/:nome", get(catalogo::servir_imagem))
        .route("/api/catalogo/salvar", axum::routing::post(catalogo::salvar_info))
        .route("/api/catalogo/upload-thumb/:marca/:kit", axum::routing::post(catalogo::upload_thumb))
        .route("/api/catalogo/upload-carrossel/:marca/:kit", axum::routing::post(catalogo::upload_carrossel))
        .route("/api/catalogo/deletar-imagem/:marca/:kit/:arquivo", axum::routing::delete(catalogo::deletar_imagem))
        .route("/api/catalogo/reordenar-carrossel", axum::routing::post(catalogo::reordenar_carrossel))
        .route("/api/catalogo/files/*path", get(catalogo::serve_file))
        // Rotas de catálogo (v2 - banco de dados)
        .route("/api/catalogo/v2/produtos", get(catalogo_db::listar_produtos_db))
        .route("/api/catalogo/v2/kits", get(catalogo_db::listar_kits_db))
        .route("/api/catalogo/v2/produtos-individuais", get(catalogo_db::listar_produtos_individuais_db))
        .route("/api/catalogo/v2/kits-e-produtos", get(catalogo_db::listar_kits_e_produtos_disparo))
        .route("/api/catalogo/v2/produto/sku/:sku", get(catalogo_db::buscar_produto_por_sku))
        .route("/api/catalogo/v2/produto/:marca/:nome", axum::routing::put(catalogo_db::atualizar_produto))
        .route("/api/catalogo/v2/kit/:marca/:nome", axum::routing::put(catalogo_db::atualizar_kit))
        .route("/api/catalogo/deletar-thumb/:marca/:nome", axum::routing::delete(catalogo::deletar_thumb))
        // Rotas de WhatsApp
        .route("/api/whatsapp/status", get(whatsapp::status))
        .route("/api/whatsapp/qr", get(whatsapp::get_qr))
        .route("/api/whatsapp/desconectar", axum::routing::post(whatsapp::desconectar))
        .route("/api/whatsapp/send", axum::routing::post(whatsapp::send_message))
        // Rotas de logs
        .route("/api/logs", get(logs::list))
        .route("/api/logs", axum::routing::post(logs::add_frontend_log))
        // Rotas de disparos
        .route("/api/disparos", get(disparos::list))
        .route("/api/disparos", axum::routing::post(disparos::criar))
        .route("/api/disparos/iniciar", axum::routing::post(disparos::iniciar_disparo))
        // Rota de deploy Render
        .route("/api/render/deploy-com-url-nova", axum::routing::post(render_deploy::deploy_com_url_nova))
        .layer(middleware::from_fn_with_state(state.clone(), log_middleware))
        .layer(cors)
        .with_state(state);
    
    info!("✅ [HTTP] {} rotas registradas", 33);

    info!("🔌 [HTTP] Vinculando à porta...");
    let (listener, port) = bind_available_port(3001).await;
    info!("✅ [HTTP] Porta {} vinculada com sucesso", port);
    info!("🚀 [HTTP] API REST ouvindo em http://0.0.0.0:{}", port);
    info!("🌐 [HTTP] SERVIDOR PRONTO PARA ACEITAR CONEXÕES");

    axum::serve(listener, app).await.unwrap();
    
    info!("🛑 [HTTP] Servidor HTTP encerrado");
}

async fn health() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "service": "luna-server",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Local::now().to_rfc3339()
    }))
}

async fn serve_index() -> Response {
    let html = tokio::fs::read_to_string("f:\\luna_cosmeticos\\backend\\dist\\index.html")
        .await
        .unwrap_or_else(|_| "<h1>Erro ao carregar index.html</h1>".to_string());
    
    axum::response::Html(html).into_response()
}
