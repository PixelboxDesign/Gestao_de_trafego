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

/// Inicia o ngrok em background apontando para a porta 3001
fn iniciar_ngrok() {
    let dominio = "repackage-backstage-snowcap.ngrok-free.dev";
    info!("🟢 Iniciando ngrok → {}", dominio);
    match std::process::Command::new("ngrok")
        .args(["http", &format!("--url={}", dominio), "3001"])
        .spawn()
    {
        Ok(_) => info!("✅ ngrok iniciado — https://{}", dominio),
        Err(e) => tracing::warn!("⚠️ ngrok não encontrado ou falhou: {} — API só acessível localmente", e),
    }
}

/// Inicia o sidecar Node.js do WhatsApp em background
fn iniciar_whatsapp_sidecar() {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    // Caminhos possíveis — release bundle primeiro, depois dev
    let sidecar_paths = vec![
        // Release: recursos bundled pelo Tauri ficam em _up/resources
        exe_dir.join("_up_").join("resources").join("whatsapp-sidecar").join("server.js"),
        // Release Windows: junto ao .exe
        exe_dir.join("whatsapp-sidecar").join("server.js"),
        // Dev: pasta do workspace
        std::path::PathBuf::from("f:\\luna_cosmeticos\\backend\\whatsapp-sidecar\\server.js"),
    ];

    let server_path = sidecar_paths.into_iter().find(|p| {
        let exists = p.exists();
        info!("Verificando sidecar em {}: {}", p.display(), exists);
        exists
    });

    match server_path {
        Some(path) => {
            info!("🟢 Iniciando WhatsApp sidecar: {}", path.display());
            match std::process::Command::new("node")
                .arg(&path)
                .env("WHATSAPP_PORT", "3002")
                .spawn()
            {
                Ok(_) => info!("✅ WhatsApp sidecar iniciado"),
                Err(e) => tracing::error!("❌ Falha ao iniciar WhatsApp sidecar: {}", e),
            }
        }
        None => {
            tracing::warn!("⚠️ WhatsApp sidecar não encontrado — WhatsApp não disponível");
        }
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

            // Iniciar ngrok (expõe porta 3001 publicamente)
            iniciar_ngrok();

            // Iniciar sidecar WhatsApp
            iniciar_whatsapp_sidecar();

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
