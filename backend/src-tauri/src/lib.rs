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
    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    match cmd.spawn() {
        Ok(child) => {
            info!("✅ {} iniciado (sem janela)", programa);
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
fn iniciar_cloudflare_tunnel(app_handle: tauri::AppHandle) {
    info!("🟢 Iniciando Cloudflare Tunnel (Quick Tunnel)");
    
    // Mata processos cloudflared existentes para evitar conflito
    let _ = std::process::Command::new("taskkill")
        .args(&["/F", "/IM", "cloudflared.exe"])
        .output();
    
    std::thread::sleep(std::time::Duration::from_millis(500)); // Aguarda 500ms
    
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
                                
                                // Atualiza estado global
                                if let Some(state) = app_handle_stdout.try_state::<Arc<Mutex<AppState>>>() {
                                    if let Ok(mut state_guard) = state.try_lock() {
                                        state_guard.set_tunnel_url(url.clone());
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
                                
                                // Atualiza estado global
                                if let Some(state) = app_handle_stderr.try_state::<Arc<Mutex<AppState>>>() {
                                    if let Ok(mut state_guard) = state.try_lock() {
                                        state_guard.set_tunnel_url(url.clone());
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

/// Inicia o sidecar Node.js do WhatsApp em background sem janela
fn iniciar_whatsapp_sidecar() {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let sidecar_paths = vec![
        exe_dir.join("whatsapp-sidecar").join("server.js"),
        std::path::PathBuf::from("f:\\luna_cosmeticos\\backend\\whatsapp-sidecar\\server.js"),
    ];

    match sidecar_paths.into_iter().find(|p| p.exists()) {
        Some(path) => {
            info!("🟢 Iniciando WhatsApp sidecar: {}", path.display());
            spawn_oculto("node", &[path.to_str().unwrap_or("")], &[("WHATSAPP_PORT", "3002")]);
        }
        None => tracing::warn!("⚠️ WhatsApp sidecar não encontrado"),
    }
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
    // Inicializar logs
    tracing_subscriber::fmt()
        .with_env_filter("luna_server=debug,axum=info,sqlx=warn")
        .init();

    info!("🌙 Luna Server iniciando...");

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
        ])
        .setup(|app| {
            // Conectar ao banco e iniciar API em background
            let app_handle = app.handle().clone();
            let app_handle_tunnel = app_handle.clone();
            
            tauri::async_runtime::spawn(async move {
                let pool = db::connect()
                    .await
                    .expect("Falha ao conectar no banco de dados");

                info!("✅ Banco de dados conectado");

                let state = Arc::new(Mutex::new(AppState::new(pool)));
                let state_clone = state.clone();

                // Tentar carregar configuração do Render
                if let Ok(config) = commands::load_render_config_from_file() {
                    if let Ok(mut s) = state.try_lock() {
                        s.render_config = Some(config);
                        info!("✅ Configuração do Render carregada");
                    }
                }

                // Guardar estado no app
                app_handle.manage(state);

                // Iniciar servidor HTTP na porta 3001
                tokio::spawn(async move {
                    api::start_server(state_clone).await;
                });

                info!("✅ API REST iniciada na porta 3001");
            });

            // Iniciar Cloudflare Tunnel (expõe porta 3001 publicamente)
            iniciar_cloudflare_tunnel(app_handle_tunnel);

            // Iniciar sidecar WhatsApp
            iniciar_whatsapp_sidecar();

            // Iniciar Tunnel Keep-Alive (mantém tunnel ativo)
            iniciar_tunnel_keepalive();

            // Configurar system tray
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
                        info!("Encerrando Luna Server...");
                        app.exit(0);
                    }
                    "show" => {
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
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Janela começa visível na primeira abertura
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            // Fechar janela volta para tray em vez de encerrar
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar Luna Server");
}
