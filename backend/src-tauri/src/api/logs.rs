use axum::{extract::State, Json};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::{AppState, state::LogLevel};

#[derive(serde::Deserialize)]
pub struct FrontendLogRequest {
    pub level: String,
    pub module: String,
    pub message: String,
}

pub async fn list(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Json<serde_json::Value> {
    let state = state.lock().await;

    Json(serde_json::json!({
        "total": state.logs.len(),
        "logs": state.logs
    }))
}

pub async fn add_frontend_log(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(payload): Json<FrontendLogRequest>,
) -> Json<serde_json::Value> {
    let mut state = state.lock().await;
    
    let level = match payload.level.as_str() {
        "Error" => LogLevel::Error,
        "Warn" => LogLevel::Warn,
        "Debug" => LogLevel::Debug,
        _ => LogLevel::Info,
    };
    
    state.add_frontend_log(level, &payload.module, &payload.message);

    Json(serde_json::json!({
        "ok": true
    }))
}
