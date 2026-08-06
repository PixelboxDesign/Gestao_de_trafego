use axum::Json;
use serde::Deserialize;

const SIDECAR_URL: &str = "http://127.0.0.1:3002";

/// GET /api/whatsapp/status — repassa para o sidecar
pub async fn status() -> Json<serde_json::Value> {
    match reqwest::get(format!("{}/status", SIDECAR_URL)).await {
        Ok(res) => {
            let json = res.json::<serde_json::Value>().await.unwrap_or_else(|_| {
                serde_json::json!({ "status": "error", "erro": "resposta inválida do sidecar" })
            });
            Json(json)
        }
        Err(_) => Json(serde_json::json!({
            "status": "disconnected",
            "qr_base64": null,
            "numero": null,
            "erro": "Sidecar WhatsApp não está rodando"
        })),
    }
}

/// GET /api/whatsapp/qr — retorna QR code em base64
pub async fn get_qr() -> Json<serde_json::Value> {
    match reqwest::get(format!("{}/qr", SIDECAR_URL)).await {
        Ok(res) => {
            let json = res.json::<serde_json::Value>().await.unwrap_or_else(|_| {
                serde_json::json!({ "disponivel": false, "qr": null })
            });
            Json(json)
        }
        Err(_) => Json(serde_json::json!({ "disponivel": false, "qr": null })),
    }
}

/// POST /api/whatsapp/desconectar
pub async fn desconectar() -> Json<serde_json::Value> {
    let client = reqwest::Client::new();
    match client.post(format!("{}/desconectar", SIDECAR_URL)).send().await {
        Ok(res) => {
            let json = res.json::<serde_json::Value>().await.unwrap_or_else(|_| {
                serde_json::json!({ "ok": false })
            });
            Json(json)
        }
        Err(e) => Json(serde_json::json!({ "ok": false, "erro": e.to_string() })),
    }
}

/// POST /api/whatsapp/send
#[derive(Debug, Deserialize)]
pub struct SendMessageRequest {
    pub numero: String,
    pub mensagem: String,
}

pub async fn send_message(
    Json(body): Json<SendMessageRequest>,
) -> Json<serde_json::Value> {
    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "numero": body.numero,
        "mensagem": body.mensagem
    });

    match client
        .post(format!("{}/enviar", SIDECAR_URL))
        .json(&payload)
        .send()
        .await
    {
        Ok(res) => {
            let json = res.json::<serde_json::Value>().await.unwrap_or_else(|_| {
                serde_json::json!({ "ok": false })
            });
            Json(json)
        }
        Err(e) => Json(serde_json::json!({ "ok": false, "erro": e.to_string() })),
    }
}
