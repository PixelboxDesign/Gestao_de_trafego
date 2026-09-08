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
    let (render_api_key, service_ids, env_var_name) = {
        let state_guard = state.lock().await;
        match &state_guard.render_config {
            Some(config) => (
                config.api_key.clone(),
                config.service_ids.clone(), // ← MUDOU: agora é array
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

    if service_ids.is_empty() {
        error!("❌ Nenhum Service ID configurado");
        return Err((
            StatusCode::BAD_REQUEST,
            "Configure pelo menos um Service ID no Render".to_string(),
        ));
    }

    info!("✅ Configuração do Render carregada");
    info!("📋 Service IDs ({}): {:?}", service_ids.len(), service_ids);
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

    // 4. Atualizar variável de ambiente e triggerar deploy em TODOS os Service IDs
    let mut deploy_ids = Vec::new();
    let mut success_count = 0;
    let mut error_count = 0;

    for (index, service_id) in service_ids.iter().enumerate() {
        info!("📦 [{}/{}] Processando Service ID: {}", index + 1, service_ids.len(), service_id);

        // 4.1. Atualizar variável de ambiente
        info!("🔄 Atualizando variável '{}' no serviço {}...", env_var_name, service_id);

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
                info!("✅ Variável atualizada no serviço {}!", service_id);
            }
            Ok(resp) => {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_else(|_| "sem corpo".to_string());
                error!("❌ Erro ao atualizar variável no {}: {} - {}", service_id, status, body);
                error_count += 1;
                continue; // Pula para o próximo service_id
            }
            Err(e) => {
                error!("❌ Erro de conexão ao atualizar variável no {}: {}", service_id, e);
                error_count += 1;
                continue;
            }
        }

        // 4.2. Triggerar deploy
        info!("🚀 Triggerando deploy no serviço {}...", service_id);

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

                info!("✅ Deploy iniciado no {}! ID: {:?}", service_id, deploy_id);
                
                if let Some(id) = deploy_id {
                    deploy_ids.push(id);
                }
                success_count += 1;
            }
            Ok(resp) => {
                let status = resp.status();
                let body = resp.text().await.unwrap_or_else(|_| "sem corpo".to_string());
                error!("❌ Erro ao triggerar deploy no {}: {} - {}", service_id, status, body);
                error_count += 1;
            }
            Err(e) => {
                error!("❌ Erro de conexão ao triggerar deploy no {}: {}", service_id, e);
                error_count += 1;
            }
        }
    }

    // 5. Retornar resultado consolidado
    if success_count == 0 {
        error!("❌ Nenhum deploy foi iniciado com sucesso");
        return Err((
            StatusCode::BAD_GATEWAY,
            "Todos os deploys falharam. Verifique os logs para detalhes.".to_string(),
        ));
    }

    let mensagem = if error_count > 0 {
        format!(
            "✅ {} deploy(s) iniciado(s) com sucesso! | ⚠️ {} falhou(aram) | URL: {} | Aguarde 2-5 minutos",
            success_count, error_count, tunnel_url
        )
    } else {
        format!(
            "✅ Todos os {} deploy(s) iniciados com sucesso! | URL: {} | Aguarde 2-5 minutos",
            success_count, tunnel_url
        )
    };

    info!("🎉 {}", mensagem);

    Ok(Json(RenderDeployResponse {
        ok: true,
        mensagem,
        deploy_id: deploy_ids.first().cloned(), // Retorna o primeiro deploy_id (compatibilidade)
        url_cloudflare: Some(tunnel_url),
    }))
}
