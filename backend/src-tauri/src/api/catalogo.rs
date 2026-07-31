use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use serde::Serialize;
use std::{path::PathBuf, sync::Arc};
use tokio::{fs, sync::Mutex};

use crate::AppState;

const CATALOGO_BASE: &str = "f:\\luna_cosmeticos\\catalogo";

#[derive(Debug, Serialize)]
pub struct CatalogoItem {
    pub nome: String,
    pub tipo: String, // "arquivo" | "pasta"
    pub tamanho: Option<u64>,
    pub caminho: String,
}

/// Lista arquivos e pastas do catálogo
pub async fn list_files(
    State(_state): State<Arc<Mutex<AppState>>>,
) -> Json<Vec<CatalogoItem>> {
    let base = PathBuf::from(CATALOGO_BASE);
    let mut items = Vec::new();

    if let Ok(mut entries) = fs::read_dir(&base).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let metadata = entry.metadata().await.unwrap_or_else(|_| {
                panic!("Falha ao ler metadata")
            });
            let nome = entry.file_name().to_string_lossy().to_string();
            let tipo = if metadata.is_dir() { "pasta" } else { "arquivo" }.to_string();
            let tamanho = if metadata.is_file() { Some(metadata.len()) } else { None };
            let caminho = entry.path().to_string_lossy().to_string();

            items.push(CatalogoItem { nome, tipo, tamanho, caminho });
        }
    }

    items.sort_by(|a, b| a.nome.cmp(&b.nome));
    Json(items)
}

/// Serve um arquivo do catálogo
pub async fn serve_file(
    State(_state): State<Arc<Mutex<AppState>>>,
    Path(file_path): Path<String>,
) -> Result<Response<Body>, (StatusCode, String)> {
    let base = PathBuf::from(CATALOGO_BASE);
    let full_path = base.join(&file_path);

    // Segurança: garantir que o path está dentro do catálogo
    let canonical = full_path.canonicalize().map_err(|_| {
        (StatusCode::NOT_FOUND, "Arquivo não encontrado".to_string())
    })?;
    let base_canonical = base.canonicalize().map_err(|_| {
        (StatusCode::INTERNAL_SERVER_ERROR, "Erro de configuração".to_string())
    })?;
    if !canonical.starts_with(&base_canonical) {
        return Err((StatusCode::FORBIDDEN, "Acesso negado".to_string()));
    }

    let content = fs::read(&canonical).await.map_err(|_| {
        (StatusCode::NOT_FOUND, "Arquivo não encontrado".to_string())
    })?;

    let mime = mime_guess::from_path(&canonical)
        .first_or_octet_stream()
        .to_string();

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .body(Body::from(content))
        .unwrap())
}
