use crate::state::{AppState, RenderConfig};
use std::sync::Arc;
use tauri::State;
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

/// Atualiza variável de ambiente no Render com a URL do tunnel
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

    tracing::info!("Atualizando variável '{}' no Render com URL: {}", config.env_var_name, tunnel_url);

    let response = client
        .patch(format!(
            "https://api.render.com/v1/services/{}/env-vars",
            config.service_id
        ))
        .header("Authorization", format!("Bearer {}", config.api_key))
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Erro ao atualizar: {}", e))?;

    if response.status().is_success() {
        Ok(format!(
            "✅ Variável '{}' atualizada no Render!\n🔄 Deploy será iniciado automaticamente (~2min)",
            config.env_var_name
        ))
    } else {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_default();
        Err(format!("❌ Erro HTTP {}: {}", status, error_text))
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
