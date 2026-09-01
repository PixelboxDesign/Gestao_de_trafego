use sqlx::MySqlPool;

/// Estado global compartilhado entre API e Tauri
pub struct AppState {
    pub db: MySqlPool,
    pub whatsapp_status: WhatsAppStatus,
    pub logs: Vec<LogEntry>,
    pub tunnel_url: Option<String>,
    pub render_config: Option<RenderConfig>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RenderConfig {
    pub api_key: String,
    pub service_id: String,
    pub env_var_name: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub enum WhatsAppStatus {
    Disconnected,
    Connecting,
    WaitingQr(String), // QR code base64
    Connected,
    Error(String),
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct LogEntry {
    pub timestamp: String,
    pub level: LogLevel,
    pub module: String,
    pub message: String,
    pub source: String, // "frontend" ou "backend"
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "PascalCase")]
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
            tunnel_url: None,
            render_config: None,
        }
    }

    pub fn set_tunnel_url(&mut self, url: String) {
        self.tunnel_url = Some(url);
    }

    pub fn get_tunnel_url(&self) -> Option<String> {
        self.tunnel_url.clone()
    }

    pub fn add_log(&mut self, level: LogLevel, module: &str, message: &str) {
        let entry = LogEntry {
            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
            level,
            module: module.to_string(),
            message: message.to_string(),
            source: "backend".to_string(),
        };
        self.logs.push(entry);
        // Manter apenas os últimos 500 logs
        if self.logs.len() > 500 {
            self.logs.remove(0);
        }
    }
    
    pub fn add_frontend_log(&mut self, level: LogLevel, module: &str, message: &str) {
        let entry = LogEntry {
            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
            level,
            module: module.to_string(),
            message: message.to_string(),
            source: "frontend".to_string(),
        };
        self.logs.push(entry);
        // Manter apenas os últimos 500 logs
        if self.logs.len() > 500 {
            self.logs.remove(0);
        }
    }
}
