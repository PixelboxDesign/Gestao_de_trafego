use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::{state::WhatsAppStatus, AppState};

#[derive(Debug, Serialize)]
pub struct WhatsAppStatusResponse {
    pub status: String,
    pub qr: Option<String>,
    pub mensagem: String,
}

#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub numero: String,
    pub mensagem: String,
}

pub async fn status(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Json<WhatsAppStatusResponse> {
    let state = state.lock().await;

    let (status_str, qr, mensagem) = match &state.whatsapp_status {
        WhatsAppStatus::Disconnected => (
            "disconnected", None, "WhatsApp desconectado".to_string()
        ),
        WhatsAppStatus::Connecting => (
            "connecting", None, "Aguardando conexão...".to_string()
        ),
        WhatsAppStatus::WaitingQr(qr_data) => (
            "waiting_qr", Some(qr_data.clone()), "Escaneie o QR Code".to_string()
        ),
        WhatsAppStatus::Connected => (
            "connected", None, "WhatsApp conectado".to_string()
        ),
        WhatsAppStatus::Error(msg) => (
            "error", None, format!("Erro: {}", msg)
        ),
    };

    Json(WhatsAppStatusResponse {
        status: status_str.to_string(),
        qr,
        mensagem,
    })
}

pub async fn get_qr(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Json<serde_json::Value> {
    let state = state.lock().await;

    match &state.whatsapp_status {
        WhatsAppStatus::WaitingQr(qr) => Json(serde_json::json!({
            "disponivel": true,
            "qr": qr
        })),
        _ => Json(serde_json::json!({
            "disponivel": false,
            "qr": null
        })),
    }
}

pub async fn send_message(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(body): Json<SendMessageRequest>,
) -> Json<serde_json::Value> {
    let mut state = state.lock().await;

    match &state.whatsapp_status {
        WhatsAppStatus::Connected => {
            // TODO: integrar com biblioteca WhatsApp (baileys via sidecar Node.js)
            state.add_log(
                crate::state::LogLevel::Info,
                "whatsapp",
                &format!("Mensagem enviada para {}", body.numero),
            );
            Json(serde_json::json!({ "ok": true, "mensagem": "Enviado com sucesso" }))
        }
        _ => Json(serde_json::json!({
            "ok": false,
            "mensagem": "WhatsApp não está conectado"
        })),
    }
}
