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
struct RenderEnvVar {
    key: String,
    value: String,
}

#[derive(Debug, Deserialize, Serialize)]
struct RenderDeployRequest {
    #[serde(rename = "clearCache")]
    clear_cache: String,
}

/// POST /api/render/deploy-com-url-nova
/// Atualiza a URL do Cloudflare no Render e faz deploy automático
pub async fn deploy_com_url_nova(
    State(_state): State<Arc<Mutex<AppState>>>,
) -> Result<Json<RenderDeployResponse>, (StatusCode, String)> {
    info!("🚀 Iniciando deploy automático no Render...");

    // 1. Ler URL do Cloudflare do arquivo
    let tunnel_url = match tokio::fs::read_to_string("tunnel-url.txt").await {
        Ok(url) => url.trim().to_string(),
        Err(e) => {
            error!("❌ Erro ao ler tunnel-url.txt: {}", e);
            return Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Erro ao ler URL do Cloudflare: {}", e),
            ));
        }
    };

    if tunnel_url.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "URL do Cloudflare está vazia".to_string(),
        ));
    }

    info!("📡 URL do Cloudflare: {}", tunnel_url);

    // 2. Configuração do Render (lê do .env ou usa fallback)
    let render_api_key = std::env::var("RENDER_API_KEY")
        .unwrap_or_else(|_| "rnd_cyHZHxdwg0Aah04WKhrTYwzXSIuT".to_string());
    let service_id = "srv-d9roha7avr4c739pliu0";
    let env_var_name = "VITE_API_BASE_URL";
    
    info!("🔑 Token sendo usado: {}...", &render_api_key[..15]);
    info!("🎯 Service ID: {}", service_id);

    // 3. Criar cliente HTTP
    let client = reqwest::Client::new();

    // 4. Atualizar variável de ambiente no Render
    info!("🔄 Atualizando variável '{}' no Render...", env_var_name);

    let env_vars = vec![RenderEnvVar {
        key: env_var_name.to_string(),
        value: tunnel_url.clone(),
    }];

    let update_url = format!(
        "https://api.render.com/v1/services/{}/env-vars",
        service_id
    );

    let update_response = client
        .put(&update_url)
        .header("Authorization", format!("Bearer {}", render_api_key))
        .header("Content-Type", "application/json")
        .json(&env_vars)
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
