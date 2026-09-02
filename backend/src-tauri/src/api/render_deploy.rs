use axum::{extract::State, http::StatusCode, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info};

use crate::AppState;

#[derive(Debug, Serialize)]
pub struct RenderDeployResponse {
    pub ok: bool,
    pub mensagem: String,
    pub deploy_id: Option<String>,
    pub url_cloudflare: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
struct RenderDeployRequest {
    #[serde(rename = "clearCache")]
    clear_cache: String,
}

/// POST /api/render/deploy-com-url-nova
/// Atualiza a URL do Cloudflare no Render e faz deploy automático
pub async fn deploy_com_url_nova(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Result<Json<RenderDeployResponse>, (StatusCode, String)> {
    info!("🚀 Iniciando deploy automático no Render...");

    // 1. Ler configuração do Render do AppState
    let (render_api_key, service_id, env_var_name) = {
        let state_guard = state.lock().await;
        match &state_guard.render_config {
            Some(config) => (
                config.api_key.clone(),
                config.service_id.clone(),
                config.env_var_name.clone(),
            ),
            None => {
                error!("❌ Configuração do Render não encontrada");
                return Err((
                    StatusCode::BAD_REQUEST,
                    "Configure o Render primeiro (API Key, Service ID e variável de ambiente)".to_string(),
                ));
            }
        }
    };

    info!("✅ Configuração do Render carregada");
    info!("📋 Service ID: {}", service_id);
    info!("📋 Variável: {}", env_var_name);

    // 2. Ler URL do Cloudflare do AppState
    let tunnel_url = {
        let state_guard = state.lock().await;
        match state_guard.get_tunnel_url() {
            Some(url) => url,
            None => {
                error!("❌ URL do Cloudflare não detectada ainda");
                return Err((
                    StatusCode::BAD_REQUEST,
                    "URL do Cloudflare Tunnel não foi detectada ainda. Aguarde alguns segundos e tente novamente.".to_string(),
                ));
            }
        }
    };

    info!("📡 URL do Cloudflare: {}", tunnel_url);

    // 3. Criar cliente HTTP
    let client = reqwest::Client::new();

    // 4. Atualizar variável de ambiente no Render (endpoint específico para uma variável)
    info!("🔄 Atualizando variável '{}' no Render...", env_var_name);

    let env_value = serde_json::json!({
        "value": tunnel_url.clone()
    });

    let update_url = format!(
        "https://api.render.com/v1/services/{}/env-vars/{}",
        service_id, env_var_name
    );

    let update_response = client
        .put(&update_url)
        .header("Authorization", format!("Bearer {}", render_api_key))
        .header("Content-Type", "application/json")
        .json(&env_value)
        .send()
        .await;

    match update_response {
        Ok(resp) if resp.status().is_success() => {
            info!("✅ Variável atualizada com sucesso!");
        }
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_else(|_| "sem corpo".to_string());
            error!("❌ Erro ao atualizar variável: {} - {}", status, body);
            return Err((
                StatusCode::BAD_GATEWAY,
                format!("Erro do Render ao atualizar variável: {} - {}", status, body),
            ));
        }
        Err(e) => {
            error!("❌ Erro de conexão ao atualizar variável: {}", e);
            return Err((
                StatusCode::BAD_GATEWAY,
                format!("Erro de conexão com Render: {}", e),
            ));
        }
    }

    // 5. Triggerar deploy
    info!("🚀 Triggerando deploy no Render...");

    let deploy_url = format!(
        "https://api.render.com/v1/services/{}/deploys",
        service_id
    );

    let deploy_body = RenderDeployRequest {
        clear_cache: "do_not_clear".to_string(),
    };

    let deploy_response = client
        .post(&deploy_url)
        .header("Authorization", format!("Bearer {}", render_api_key))
        .header("Content-Type", "application/json")
        .json(&deploy_body)
        .send()
        .await;

    match deploy_response {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp
                .json()
                .await
                .unwrap_or_else(|_| serde_json::json!({}));
            let deploy_id = body["id"].as_str().map(|s| s.to_string());

            info!("✅ Deploy iniciado! ID: {:?}", deploy_id);

            Ok(Json(RenderDeployResponse {
                ok: true,
                mensagem: format!(
                    "Deploy iniciado com sucesso! URL: {} | Aguarde 2-5 minutos",
                    tunnel_url
                ),
                deploy_id,
                url_cloudflare: Some(tunnel_url),
            }))
        }
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_else(|_| "sem corpo".to_string());
            error!("❌ Erro ao triggerar deploy: {} - {}", status, body);
            Err((
                StatusCode::BAD_GATEWAY,
                format!("Erro do Render ao triggerar deploy: {} - {}", status, body),
            ))
        }
        Err(e) => {
            error!("❌ Erro de conexão ao triggerar deploy: {}", e);
            Err((
                StatusCode::BAD_GATEWAY,
                format!("Erro de conexão com Render: {}", e),
            ))
        }
    }
}
