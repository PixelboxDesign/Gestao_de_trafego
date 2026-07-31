use axum::{extract::State, Json};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::AppState;

pub async fn list(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Json<serde_json::Value> {
    let state = state.lock().await;

    Json(serde_json::json!({
        "total": state.logs.len(),
        "logs": state.logs
    }))
}
