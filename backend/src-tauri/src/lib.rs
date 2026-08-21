mod api;
mod db;
mod state;

use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tokio::sync::Mutex;
use tracing::info;

pub use state::AppState;

/// Spawna um processo sem janela de terminal visível no Windows
fn spawn_oculto(programa: &str, args: &[&str], envs: &[(&str, &str)]) -> bool {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x08000000;

    let mut cmd = std::process::Command::new(programa);
    cmd.args(args);
    for (k, v) in envs {
        cmd.env(k, v);
    }
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.spawn() {
        Ok(_)  => { info!("✅ {} iniciado (sem janela)", programa); true }
        Err(e) => { tracing::warn!("⚠️ Falha ao iniciar {}: {}", programa, e); false }
    }
}

/// Inicia o ngrok em background sem janela (DESATIVADO - usando Cloudflare Tunnel)
fn _iniciar_ngrok() {
    let dominio = "repackage-backstage-snowcap.ngrok-free.dev";
    info!("🟢 Iniciando ngrok → {}", dominio);
    spawn_oculto("ngrok", &["http", "--log=stdout", "3001"], &[]);
}

/// Inicia o Cloudflare Tunnel em background sem janela
fn iniciar_cloudflare_tunnel() {
    info!("🟢 Iniciando Cloudflare Tunnel (Quick Tunnel)");
    // Quick Tunnel: URL temporária, sem configuração, inicia instantaneamente
    spawn_oculto("cloudflared", &["tunnel", "--url", "http://localhost:3001"], &[]);
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
        .setup(|app| {
            // Conectar ao banco e iniciar API em background
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let pool = db::connect()
                    .await
                    .expect("Falha ao conectar no banco de dados");

                info!("✅ Banco de dados conectado");

                let state = Arc::new(Mutex::new(AppState::new(pool)));
                let state_clone = state.clone();

                // Guardar estado no app
                app_handle.manage(state);

                // Iniciar servidor HTTP na porta 3001
                tokio::spawn(async move {
                    api::start_server(state_clone).await;
                });

                info!("✅ API REST iniciada na porta 3001");
            });

            // Iniciar Cloudflare Tunnel (expõe porta 3001 publicamente)
            iniciar_cloudflare_tunnel();

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
