use crate::state::{AppState, RenderConfig};
use std::sync::Arc;
use tauri::{State, Manager};
use tokio::sync::Mutex;

/// Retorna a URL atual do Cloudflare Tunnel
#[tauri::command]
pub async fn get_tunnel_url(state: State<'_, Arc<Mutex<AppState>>>) -> Result<Option<String>, String> {
    let state = state.lock().await;
    Ok(state.get_tunnel_url())
}

/// Salva configuração do Render (API Key, Service ID, etc)
#[tauri::command]
pub async fn save_render_config(
    state: State<'_, Arc<Mutex<AppState>>>,
    api_key: String,
    service_id: String,
    env_var_name: String,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("API Key não pode estar vazia".to_string());
    }
    if service_id.trim().is_empty() {
        return Err("Service ID não pode estar vazio".to_string());
    }
    if env_var_name.trim().is_empty() {
        return Err("Nome da variável de ambiente não pode estar vazio".to_string());
    }

    let mut state = state.lock().await;
    state.render_config = Some(RenderConfig {
        api_key,
        service_id,
        env_var_name,
    });

    // Salvar em arquivo local para persistir entre reinícios
    if let Err(e) = save_render_config_to_file(&state.render_config.as_ref().unwrap()) {
        return Err(format!("Erro ao salvar configuração: {}", e));
    }

    Ok("Configuração salva com sucesso!".to_string())
}

/// Carrega configuração do Render do arquivo
#[tauri::command]
pub async fn load_render_config(state: State<'_, Arc<Mutex<AppState>>>) -> Result<Option<RenderConfig>, String> {
    let state = state.lock().await;
    
    // Se já está no estado, retorna
    if state.render_config.is_some() {
        return Ok(state.render_config.clone());
    }

    // Caso contrário, tenta carregar do arquivo
    match load_render_config_from_file() {
        Ok(config) => Ok(Some(config)),
        Err(_) => Ok(None),
    }
}

/// Testa conexão com a API do Render
#[tauri::command]
pub async fn test_render_connection(
    api_key: String,
    service_id: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    let response = client
        .get(format!("https://api.render.com/v1/services/{}", service_id))
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| format!("Erro ao conectar: {}", e))?;

    if response.status().is_success() {
        let service: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Erro ao ler resposta: {}", e))?;
        
        let service_name = service
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or("N/A");
        
        Ok(format!("✅ Conexão OK! Serviço: {}", service_name))
    } else {
        Err(format!("❌ Erro HTTP {}: {}", response.status(), response.text().await.unwrap_or_default()))
    }
}

/// Busca URL do Cloudflare manualmente via API local (fallback)
#[tauri::command]
pub async fn fetch_cloudflare_url_manual() -> Result<Option<String>, String> {
    // Tenta ler do arquivo primeiro (se foi salvo por script externo)
    if let Ok(url) = std::fs::read_to_string("f:\\luna_cosmeticos\\backend\\tunnel-url.txt") {
        let url = url.trim().to_string();
        if url.starts_with("https://") && url.contains(".trycloudflare.com") {
            tracing::info!("URL carregada do arquivo tunnel-url.txt: {}", url);
            return Ok(Some(url));
        }
    }
    
    // Cloudflare Tunnel expõe métricas em http://localhost:2000/metrics
    match reqwest::get("http://127.0.0.1:2000/metrics").await {
        Ok(response) => {
            if let Ok(text) = response.text().await {
                // Procura por URL no formato trycloudflare.com
                use regex::Regex;
                let re = Regex::new(r"https://[a-z0-9-]+\.trycloudflare\.com")
                    .map_err(|e| e.to_string())?;
                
                if let Some(m) = re.find(&text) {
                    return Ok(Some(m.as_str().to_string()));
                }
            }
            Ok(None)
        }
        Err(_) => Ok(None)
    }
}

/// Reinicia o Cloudflare Tunnel e captura nova URL
#[tauri::command]
pub async fn restart_cloudflare_tunnel(app: tauri::AppHandle) -> Result<String, String> {
    tracing::info!("🔄 Reiniciando Cloudflare Tunnel...");
    
    // Mata todos os processos cloudflared
    for _ in 0..3 {
        let _ = std::process::Command::new("taskkill")
            .args(&["/F", "/IM", "cloudflared.exe"])
            .output();
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;
    }
    
    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    
    // Limpa URL antiga do estado
    if let Some(state) = app.try_state::<Arc<Mutex<AppState>>>() {
        if let Ok(mut state_guard) = state.try_lock() {
            state_guard.tunnel_url = None;
        }
    }
    
    // Inicia novo tunnel
    crate::iniciar_cloudflare_tunnel(app.clone());
    
    // Aguarda até 30 segundos pela URL
    for i in 0..30 {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        
        if let Some(state) = app.try_state::<Arc<Mutex<AppState>>>() {
            if let Ok(state_guard) = state.try_lock() {
                if let Some(url) = &state_guard.tunnel_url {
                    tracing::info!("✅ Nova URL capturada: {}", url);
                    return Ok(format!("Tunnel reiniciado! Nova URL: {}", url));
                }
            }
        }
        
        if i % 5 == 0 {
            tracing::info!("Aguardando URL... {}s", i);
        }
    }
    
    Err("Timeout: URL não foi detectada após 30 segundos".to_string())
}

#[tauri::command]
pub async fn update_render_env(state: State<'_, Arc<Mutex<AppState>>>) -> Result<String, String> {
    let state = state.lock().await;

    // Valida configuração
    let config = state
        .render_config
        .as_ref()
        .ok_or("Configure o Render primeiro (API Key e Service ID)")?;

    // Valida URL do tunnel
    let tunnel_url = state
        .get_tunnel_url()
        .ok_or("URL do Cloudflare Tunnel não detectada ainda")?;

    // Faz requisição para API do Render
    let client = reqwest::Client::new();
    
    let body = serde_json::json!([
        {
            "key": config.env_var_name,
            "value": tunnel_url
        }
    ]);

    tracing::info!("🔄 Passo 1/2: Atualizando variável '{}' no Render com URL: {}", config.env_var_name, tunnel_url);

    // Passo 1: Atualizar variável de ambiente
    let response = client
        .put(format!(
            "https://api.render.com/v1/services/{}/env-vars",
            config.service_id
        ))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Erro ao atualizar variável: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("❌ Erro ao atualizar variável HTTP {}: {}", status, error_text));
    }

    tracing::info!("✅ Variável atualizada com sucesso!");
    tracing::info!("🚀 Passo 2/2: Triggerando deploy no Render...");

    // Passo 2: Triggerar deploy manual
    let deploy_body = serde_json::json!({
        "clearCache": "do_not_clear"
    });

    let deploy_response = client
        .post(format!(
            "https://api.render.com/v1/services/{}/deploys",
            config.service_id
        ))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .header("Content-Type", "application/json")
        .json(&deploy_body)
        .send()
        .await
        .map_err(|e| format!("Erro ao triggerar deploy: {}", e))?;

    if deploy_response.status().is_success() {
        let deploy_info: serde_json::Value = deploy_response
            .json()
            .await
            .unwrap_or(serde_json::json!({}));
        
        let deploy_id = deploy_info
            .get("id")
            .and_then(|id| id.as_str())
            .unwrap_or("N/A");

        tracing::info!("✅ Deploy triggerado com sucesso! ID: {}", deploy_id);

        Ok(format!(
            "✅ Sucesso!\n\n\
            📝 Variável '{}' atualizada\n\
            🚀 Deploy iniciado (ID: {})\n\n\
            ⏱️ Tempo estimado: 2-5 minutos\n\
            🌐 Acompanhe em: https://dashboard.render.com/web/{}",
            config.env_var_name,
            deploy_id,
            config.service_id
        ))
    } else {
        let status = deploy_response.status();
        let error_text = deploy_response.text().await.unwrap_or_default();
        
        // Se o deploy falhou mas a variável foi atualizada, informa isso
        Ok(format!(
            "⚠️ Variável atualizada, mas erro ao triggerar deploy:\n\
            HTTP {}: {}\n\n\
            💡 Você pode fazer deploy manual em:\n\
            https://dashboard.render.com/web/{}/deploys",
            status,
            error_text,
            config.service_id
        ))
    }
}

// ── Funções auxiliares de arquivo ────────────────────────────────────────────

fn get_config_file_path() -> Result<std::path::PathBuf, String> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| format!("Erro ao localizar executável: {}", e))?
        .parent()
        .ok_or("Erro ao obter diretório do executável")?
        .to_path_buf();
    
    Ok(exe_dir.join("render_config.json"))
}

fn save_render_config_to_file(config: &RenderConfig) -> Result<(), String> {
    let path = get_config_file_path()?;
    let json = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Erro ao serializar: {}", e))?;
    
    std::fs::write(&path, json)
        .map_err(|e| format!("Erro ao escrever arquivo: {}", e))?;
    
    tracing::info!("Configuração do Render salva em: {}", path.display());
    Ok(())
}

pub fn load_render_config_from_file() -> Result<RenderConfig, String> {
    let path = get_config_file_path()?;
    
    if !path.exists() {
        return Err("Arquivo de configuração não existe".to_string());
    }

    let json = std::fs::read_to_string(&path)
        .map_err(|e| format!("Erro ao ler arquivo: {}", e))?;
    
    let config: RenderConfig = serde_json::from_str(&json)
        .map_err(|e| format!("Erro ao deserializar: {}", e))?;
    
    Ok(config)
}
