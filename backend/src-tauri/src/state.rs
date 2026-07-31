use sqlx::MySqlPool;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Estado global compartilhado entre API e Tauri
pub struct AppState {
    pub db: MySqlPool,
    pub whatsapp_status: WhatsAppStatus,
    pub logs: Vec<LogEntry>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub enum WhatsAppStatus {
    Disconnected,
    Connecting,
    WaitingQr(String), // QR code base64
    Connected,
    Error(String),
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: LogLevel,
    pub module: String,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub enum LogLevel {
    Info,
    Warn,
    Error,
    Debug,
}

impl AppState {
    pub fn new(db: MySqlPool) -> Self {
        Self {
            db,
            whatsapp_status: WhatsAppStatus::Disconnected,
            logs: Vec::new(),
        }
    }

    pub fn add_log(&mut self, level: LogLevel, module: &str, message: &str) {
        let entry = LogEntry {
            timestamp: chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            level,
            module: module.to_string(),
            message: message.to_string(),
        };
        self.logs.push(entry);
        // Manter apenas os últimos 500 logs
        if self.logs.len() > 500 {
            self.logs.remove(0);
        }
    }
}
