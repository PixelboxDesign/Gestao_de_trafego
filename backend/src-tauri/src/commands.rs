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

/// Salva configuração do Render (API Key, Service IDs, etc)
#[tauri::command]
pub async fn save_render_config(
    state: State<'_, Arc<Mutex<AppState>>>,
    api_key: String,
    service_ids: Vec<String>, // ← MUDOU: array
    env_var_name: String,
) -> Result<String, String> {
    if api_key.trim().is_empty() {
        return Err("API Key não pode estar vazia".to_string());
    }
    if service_ids.is_empty() {
        return Err("Adicione pelo menos um Service ID".to_string());
    }
    if env_var_name.trim().is_empty() {
        return Err("Nome da variável de ambiente não pode estar vazio".to_string());
    }

    // Valida que todos os IDs são válidos
    for id in &service_ids {
        if id.trim().is_empty() {
            return Err("Service IDs não podem estar vazios".to_string());
        }
    }

    let mut state = state.lock().await;
    state.render_config = Some(RenderConfig {
        api_key,
        service_ids,
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
        .ok_or("Configure o Render primeiro (API Key e Service IDs)")?;

    if config.service_ids.is_empty() {
        return Err("Adicione pelo menos um Service ID na configuração".to_string());
    }

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

    let mut success_count = 0;
    let mut error_messages = Vec::new();
    let mut deploy_ids = Vec::new();

    tracing::info!("🔄 Iniciando deploy em {} serviço(s)...", config.service_ids.len());

    for (index, service_id) in config.service_ids.iter().enumerate() {
        tracing::info!("📦 [{}/{}] Processando serviço: {}", index + 1, config.service_ids.len(), service_id);

        // Passo 1: Atualizar variável de ambiente
        let response = client
            .put(format!(
                "https://api.render.com/v1/services/{}/env-vars",
                service_id
            ))
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await;

        let response = match response {
            Ok(r) => r,
            Err(e) => {
                error_messages.push(format!("❌ {}: {}", service_id, e));
                continue;
            }
        };

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            error_messages.push(format!("❌ {} (HTTP {}): {}", service_id, status, error_text));
            continue;
        }

        tracing::info!("✅ Variável atualizada no serviço {}!", service_id);

        // Passo 2: Triggerar deploy manual
        let deploy_body = serde_json::json!({
            "clearCache": "do_not_clear"
        });

        let deploy_response = client
            .post(format!(
                "https://api.render.com/v1/services/{}/deploys",
                service_id
            ))
            .header("Authorization", format!("Bearer {}", config.api_key))
            .header("Content-Type", "application/json")
            .json(&deploy_body)
            .send()
            .await;

        match deploy_response {
            Ok(resp) if resp.status().is_success() => {
                let deploy_info: serde_json::Value = resp
                    .json()
                    .await
                    .unwrap_or(serde_json::json!({}));
                
                let deploy_id = deploy_info
                    .get("id")
                    .and_then(|id| id.as_str())
                    .unwrap_or("N/A");

                deploy_ids.push(format!("{}: {}", service_id, deploy_id));
                success_count += 1;
                tracing::info!("✅ Deploy iniciado no {}: {}", service_id, deploy_id);
            }
            Ok(resp) => {
                let status = resp.status();
                let error_text = resp.text().await.unwrap_or_default();
                error_messages.push(format!("⚠️ {}: Deploy falhou (HTTP {})", service_id, status));
            }
            Err(e) => {
                error_messages.push(format!("❌ {}: {}", service_id, e));
            }
        }
    }

    if success_count == 0 {
        return Err(format!("Todos os deploys falharam:\n{}", error_messages.join("\n")));
    }

    let mut result = format!(
        "✅ Deploy(s) iniciado(s) com sucesso: {}/{}\n\n\
        📝 Variável atualizada: {}\n\
        🌐 Nova URL: {}\n\n\
        🚀 Deploy IDs:\n{}",
        success_count,
        config.service_ids.len(),
        config.env_var_name,
        tunnel_url,
        deploy_ids.join("\n")
    );

    if !error_messages.is_empty() {
        result.push_str(&format!("\n\n⚠️ Erros:\n{}", error_messages.join("\n")));
    }

    result.push_str("\n\n⏱️ Tempo estimado: 2-5 minutos");

    Ok(result)
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
