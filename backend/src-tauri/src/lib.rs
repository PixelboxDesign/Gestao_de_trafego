mod api;
mod db;
mod state;
mod commands;

use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Emitter,
};
use tokio::sync::Mutex;
use tracing::info;

pub use state::AppState;

/// Spawna um processo sem janela de terminal visível no Windows
/// Retorna um handle para o processo spawned
fn spawn_oculto(programa: &str, args: &[&str], envs: &[(&str, &str)]) -> Option<std::process::Child> {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = std::process::Command::new(programa);
    cmd.args(args);
    for (k, v) in envs {
        cmd.env(k, v);
    }
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd.stdin(std::process::Stdio::null());
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    match cmd.spawn() {
        Ok(child) => {
            info!("✅ {} iniciado (sem janela, PID: {:?})", programa, child.id());
            Some(child)
        }
        Err(e) => {
            tracing::warn!("⚠️ Falha ao iniciar {}: {}", programa, e);
            None
        }
    }
}

/// Inicia o ngrok em background sem janela (DESATIVADO - usando Cloudflare Tunnel)
fn _iniciar_ngrok() {
    let dominio = "repackage-backstage-snowcap.ngrok-free.dev";
    info!("🟢 Iniciando ngrok → {}", dominio);
    spawn_oculto("ngrok", &["http", "--log=stdout", "3001"], &[]);
}

/// Inicia o Cloudflare Tunnel em background sem janela
pub fn iniciar_cloudflare_tunnel(app_handle: tauri::AppHandle) {
    info!("🟢 Iniciando Cloudflare Tunnel (Quick Tunnel)");
    
    // Mata processos cloudflared existentes para evitar conflito (tenta 3 vezes)
    for _ in 0..3 {
        let _ = std::process::Command::new("taskkill")
            .args(&["/F", "/IM", "cloudflared.exe"])
            .output();
        std::thread::sleep(std::time::Duration::from_millis(300));
    }
    
    std::thread::sleep(std::time::Duration::from_millis(1000)); // Aguarda 1s
    
    // Quick Tunnel: URL temporária, sem configuração, inicia instantaneamente
    if let Some(mut child) = spawn_oculto("cloudflared", &["tunnel", "--url", "http://localhost:3001"], &[]) {
        // Spawna thread para ler stdout E stderr
        if let Some(stdout) = child.stdout.take() {
            let app_handle_stdout = app_handle.clone();
            std::thread::spawn(move || {
                use std::io::{BufRead, BufReader};
                let reader = BufReader::new(stdout);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        info!("[Cloudflare OUT] {}", line);
                        
                        // Regex para capturar URL do Cloudflare
                        if line.contains("trycloudflare.com") {
                            if let Some(url) = extract_cloudflare_url(&line) {
                                info!("🌐 URL do Cloudflare detectada: {}", url);
                                
                                // Salva em arquivo
                                save_tunnel_url_to_file(&url);
                                
                                // Atualiza estado global
                                if let Some(state) = app_handle_stdout.try_state::<Arc<Mutex<AppState>>>() {
                                    if let Ok(mut state_guard) = state.try_lock() {
                                        state_guard.set_tunnel_url(url.clone());
                                        state_guard.add_log(crate::state::LogLevel::Info, "Cloudflare", &format!("Nova URL detectada: {}", url));
                                    }
                                }
                                
                                // Emite evento para o frontend
                                let _ = app_handle_stdout.emit("tunnel-url-detected", url);
                            }
                        }
                    }
                }
            });
        }
        
        // Ler stderr também
        if let Some(stderr) = child.stderr.take() {
            let app_handle_stderr = app_handle.clone();
            std::thread::spawn(move || {
                use std::io::{BufRead, BufReader};
                let reader = BufReader::new(stderr);
                for line in reader.lines() {
                    if let Ok(line) = line {
                        info!("[Cloudflare ERR] {}", line);
                        
                        // Regex para capturar URL do Cloudflare (pode estar no stderr)
                        if line.contains("trycloudflare.com") {
                            if let Some(url) = extract_cloudflare_url(&line) {
                                info!("🌐 URL do Cloudflare detectada (stderr): {}", url);
                                
                                // Salva em arquivo
                                save_tunnel_url_to_file(&url);
                                
                                // Atualiza estado global
                                if let Some(state) = app_handle_stderr.try_state::<Arc<Mutex<AppState>>>() {
                                    if let Ok(mut state_guard) = state.try_lock() {
                                        state_guard.set_tunnel_url(url.clone());
                                        state_guard.add_log(crate::state::LogLevel::Info, "Cloudflare", &format!("Nova URL detectada: {}", url));
                                    }
                                }
                                
                                // Emite evento para o frontend
                                let _ = app_handle_stderr.emit("tunnel-url-detected", url);
                            }
                        }
                    }
                }
            });
        }
    }
}

/// Extrai URL do Cloudflare de uma linha de log
fn extract_cloudflare_url(line: &str) -> Option<String> {
    use regex::Regex;
    let re = Regex::new(r"https://[a-z0-9-]+\.trycloudflare\.com").ok()?;
    re.find(line).map(|m| m.as_str().to_string())
}

/// Salva URL do tunnel em arquivo
fn save_tunnel_url_to_file(url: &str) {
    let path = std::path::PathBuf::from("tunnel-url.txt");
    if let Err(e) = std::fs::write(&path, url) {
        tracing::warn!("⚠️ Falha ao salvar tunnel-url.txt: {}", e);
    } else {
        info!("✅ URL salva em tunnel-url.txt: {}", url);
    }
}

/// Inicia o sidecar Node.js do WhatsApp em background sem janela
fn iniciar_whatsapp_sidecar() {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    // Caminho relativo ao executável (produção) e caminho absoluto (dev)
    let sidecar_paths = vec![
        exe_dir.join("whatsapp-sidecar").join("server.js"),
        exe_dir.parent().and_then(|p| p.parent()).map(|p| p.join("whatsapp-sidecar").join("server.js")).unwrap_or_default(),
        std::path::PathBuf::from("f:\\luna_cosmeticos\\backend\\whatsapp-sidecar\\server.js"),
    ];

    for path in &sidecar_paths {
        if path.exists() {
            info!("🟢 Iniciando WhatsApp sidecar: {}", path.display());
            
            // Define working directory como a pasta do sidecar para sessão persistir
            let working_dir = path.parent().unwrap_or(path.as_path());
            
            let mut cmd = std::process::Command::new("node");
            cmd.arg(path.to_str().unwrap_or(""));
            cmd.current_dir(working_dir);
            cmd.env("WHATSAPP_PORT", "3002");
            cmd.creation_flags(CREATE_NO_WINDOW);
            cmd.stdin(std::process::Stdio::null());
            cmd.stdout(std::process::Stdio::null());
            cmd.stderr(std::process::Stdio::null());
            
            match cmd.spawn() {
                Ok(mut child) => {
                    info!("✅ WhatsApp sidecar iniciado (PID: {:?})", child.id());
                    // Desacopla o processo filho para que não seja morto quando o pai terminar
                    std::thread::spawn(move || {
                        let _ = child.wait();
                    });
                    return;
                }
                Err(e) => {
                    tracing::warn!("⚠️ Falha ao iniciar sidecar: {}", e);
                }
            }
        }
    }
    
    tracing::warn!("⚠️ WhatsApp sidecar não encontrado em nenhum caminho");
}

/// Inicia o Tunnel Keep-Alive (Ngrok/Cloudflare) em background sem janela
fn iniciar_tunnel_keepalive() {
    let keepalive_paths = vec![
        std::path::PathBuf::from("f:\\luna_cosmeticos\\scripts_permanentes\\tunnel-keepalive.js"),
        std::path::PathBuf::from("..\\..\\scripts_permanentes\\tunnel-keepalive.js"),
    ];

    match keepalive_paths.into_iter().find(|p| p.exists()) {
        Some(path) => {
            info!("🟢 Iniciando Tunnel Keep-Alive: {}", path.display());
            spawn_oculto("node", &[path.to_str().unwrap_or("")], &[]);
        }
        None => tracing::warn!("⚠️ Tunnel Keep-Alive não encontrado"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Inicializar logs ULTRA VERBOSOS (sem captura para AppState ainda - será feito depois do setup)
    tracing_subscriber::fmt()
        .with_env_filter("luna_server=info,axum=info,sqlx=warn,tower_http=info,tauri=info")
        .with_line_number(true)
        .with_file(true)
        .with_target(true)
        .init();

    info!("🌙 Luna Server iniciando...");
    info!("📍 Diretório de execução: {:?}", std::env::current_dir().unwrap_or_default());
    info!("📍 Executável: {:?}", std::env::current_exe().unwrap_or_default());

    // Carregar variáveis de ambiente
    dotenv::dotenv().ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_tunnel_url,
            commands::save_render_config,
            commands::load_render_config,
            commands::test_render_connection,
            commands::update_render_env,
            commands::fetch_cloudflare_url_manual,
            commands::restart_cloudflare_tunnel,
        ])
        .setup(|app| {
            info!("🔧 [SETUP] Iniciando configuração do app...");
            
            // Conectar ao banco e iniciar API em background
            let app_handle = app.handle().clone();
            let app_handle_tunnel = app_handle.clone();
            
            // Usar Arc<AtomicBool> para sinalizar quando servidor estiver pronto
            let server_pronto = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
            let server_pronto_clone = server_pronto.clone();
            
            tauri::async_runtime::spawn(async move {
                info!("🔌 [DB] Conectando ao banco de dados...");
                let pool = match db::connect().await {
                    Ok(p) => {
                        info!("✅ [DB] Banco de dados conectado com sucesso");
                        p
                    }
                    Err(e) => {
                        tracing::error!("❌ [DB] ERRO ao conectar no banco: {:?}", e);
                        panic!("Falha ao conectar no banco de dados: {:?}", e);
                    }
                };

                let state = Arc::new(Mutex::new(AppState::new(pool)));
                let state_clone = state.clone();
                
                // Adicionar log inicial
                if let Ok(mut s) = state.try_lock() {
                    s.add_log(crate::state::LogLevel::Info, "Sistema", "Luna Server iniciado com sucesso");
                    s.add_log(crate::state::LogLevel::Info, "Database", "Conexão com MySQL estabelecida");
                }

                // Tentar carregar configuração do Render
                info!("📁 [CONFIG] Carregando configuração do Render...");
                if let Ok(config) = commands::load_render_config_from_file() {
                    if let Ok(mut s) = state.try_lock() {
                        s.render_config = Some(config);
                        info!("✅ [CONFIG] Configuração do Render carregada");
                    }
                } else {
                    info!("ℹ️ [CONFIG] Nenhuma configuração do Render encontrada");
                }

                // Guardar estado no app
                app_handle.manage(state);
                info!("✅ [STATE] Estado global registrado no Tauri");

                // Iniciar servidor HTTP na porta 3001
                info!("🌐 [HTTP] Iniciando servidor HTTP na porta 3001...");
                let server_pronto_http = server_pronto_clone.clone();
                tokio::spawn(async move {
                    // Sinaliza que servidor está pronto ANTES de bloquear
                    server_pronto_http.store(true, std::sync::atomic::Ordering::SeqCst);
                    info!("✅ [HTTP] Servidor HTTP PRONTO - marcando flag");
                    
                    api::start_server(state_clone).await;
                });

                // AGUARDA até servidor estar pronto (max 5 segundos)
                info!("⏳ [HTTP] Aguardando servidor HTTP ficar pronto...");
                for i in 0..50 {
                    if server_pronto_clone.load(std::sync::atomic::Ordering::SeqCst) {
                        info!("✅ [HTTP] Servidor confirmado como pronto após {}ms", i * 100);
                        break;
                    }
                    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                }

                info!("✅ [API] API REST completamente inicializada");
            });

            // Aguardar servidor ficar pronto antes de continuar setup
            info!("⏳ [SETUP] Aguardando servidor HTTP (bloqueante)...");
            std::thread::sleep(std::time::Duration::from_secs(3));
            info!("✅ [SETUP] Timeout de espera concluído");

            info!("🔥 [TUNNEL] Iniciando Cloudflare Tunnel...");
            // Iniciar Cloudflare Tunnel (expõe porta 3001 publicamente)
            iniciar_cloudflare_tunnel(app_handle_tunnel);

            info!("💬 [WHATSAPP] Iniciando sidecar WhatsApp...");
            // Iniciar sidecar WhatsApp
            iniciar_whatsapp_sidecar();

            info!("🔁 [KEEPALIVE] Iniciando Tunnel Keep-Alive...");
            // Iniciar Tunnel Keep-Alive (mantém tunnel ativo)
            iniciar_tunnel_keepalive();

            // Configurar system tray
            info!("🖼️ [TRAY] Configurando system tray...");
            let quit = MenuItem::with_id(app, "quit", "Encerrar Luna Server", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "Abrir Painel", true, None::<&str>)?;
            let status = MenuItem::with_id(
                app,
                "status",
                "✅ Servidor Online — Porta 3001",
                false,
                None::<&str>,
            )?;

            let menu = Menu::with_items(app, &[&status, &show, &quit])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("🌙 Luna Server — Online")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        info!("🛑 [TRAY] Encerrando Luna Server...");
                        
                        // Salvar logs antes de encerrar
                        if let Some(state) = app.try_state::<Arc<Mutex<AppState>>>() {
                            if let Ok(guard) = state.try_lock() {
                                let logs_dir = std::path::PathBuf::from("logs");
                                if let Err(e) = std::fs::create_dir_all(&logs_dir) {
                                    tracing::warn!("⚠️ Falha ao criar diretório logs: {}", e);
                                } else {
                                    let timestamp = chrono::Local::now().format("%Y-%m-%d_%H-%M-%S");
                                    let log_file = logs_dir.join(format!("logs_{}.json", timestamp));
                                    
                                    match serde_json::to_string_pretty(&guard.logs) {
                                        Ok(json) => {
                                            if let Err(e) = std::fs::write(&log_file, json) {
                                                tracing::warn!("⚠️ Falha ao salvar logs: {}", e);
                                            } else {
                                                info!("✅ Logs salvos em: {:?}", log_file);
                                            }
                                        }
                                        Err(e) => {
                                            tracing::warn!("⚠️ Falha ao serializar logs: {}", e);
                                        }
                                    }
                                }
                            }
                        }
                        
                        app.exit(0);
                    }
                    "show" => {
                        info!("👁️ [TRAY] Mostrando janela...");
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        info!("🖱️ [TRAY] Clique no ícone detectado");
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            
            info!("✅ [TRAY] System tray configurado");

            // Janela começa visível na primeira abertura
            info!("🪟 [WINDOW] Mostrando janela principal...");
            if let Some(window) = app.get_webview_window("main") {
                info!("🪟 [WINDOW] Janela encontrada, tornando visível...");
                let _ = window.show();
                let _ = window.set_focus();
                info!("✅ [WINDOW] Janela deve estar visível agora");
            } else {
                tracing::error!("❌ [WINDOW] ERRO: Janela 'main' não encontrada!");
            }

            info!("✅ [SETUP] Setup completo!");
            Ok(())
        })
        .on_window_event(|window, event| {
            // Fechar janela volta para tray em vez de encerrar
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                info!("🚪 [WINDOW] Usuário tentou fechar - minimizando para tray");
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar Luna Server");
    
    info!("👋 [EXIT] Luna Server encerrado");
}
