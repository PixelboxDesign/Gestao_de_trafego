use axum::{
    body::Body,
    extract::{Path, State, Multipart},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, sync::Arc};
use tokio::{fs, sync::Mutex};

use crate::AppState;

const CATALOGO_BASE: &str = "f:\\luna_cosmeticos\\catalogos";

// ─── Tipos ───────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct Kit {
    pub nome: String,
    pub tem_imagem: bool,
    pub imagem_ext: Option<String>,
    pub info: KitInfo,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KitInfo {
    #[serde(default)]
    pub preco: String,
    #[serde(default)]
    pub mensagem: String,
}

impl Default for KitInfo {
    fn default() -> Self {
        Self {
            preco: String::new(),
            mensagem: String::new(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct SalvarInfoBody {
    pub kit: String,
    pub preco: String,
    pub mensagem: String,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn catalogo_path() -> PathBuf {
    PathBuf::from(CATALOGO_BASE)
}

/// Encontra a primeira imagem jpg/jpeg dentro de uma pasta de kit
async fn encontrar_imagem(kit_path: &PathBuf) -> Option<String> {
    if let Ok(mut entries) = fs::read_dir(kit_path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let nome = entry.file_name().to_string_lossy().to_lowercase();
            if nome.ends_with(".jpg") || nome.ends_with(".jpeg") || nome.ends_with(".png") || nome.ends_with(".webp") {
                return Some(entry.file_name().to_string_lossy().to_string());
            }
        }
    }
    None
}

/// Lê o info.json de um kit, retorna default se não existir
async fn ler_info(kit_path: &PathBuf) -> KitInfo {
    let info_path = kit_path.join("info.json");
    if let Ok(conteudo) = fs::read_to_string(&info_path).await {
        serde_json::from_str(&conteudo).unwrap_or_default()
    } else {
        KitInfo::default()
    }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/// GET /api/catalogo/kits — lista todas as subpastas como kits
pub async fn listar_kits(
    State(_state): State<Arc<Mutex<AppState>>>,
) -> Json<Vec<Kit>> {
    let base = catalogo_path();
    let mut kits = Vec::new();

    // Cria a pasta se não existir
    let _ = fs::create_dir_all(&base).await;

    if let Ok(mut entries) = fs::read_dir(&base).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            if let Ok(meta) = entry.metadata().await {
                if !meta.is_dir() {
                    continue;
                }
            }

            let nome = entry.file_name().to_string_lossy().to_string();
            let kit_path = base.join(&nome);

            let imagem_arquivo = encontrar_imagem(&kit_path).await;
            let imagem_ext = imagem_arquivo.clone().and_then(|f| {
                std::path::Path::new(&f)
                    .extension()
                    .map(|e| e.to_string_lossy().to_string())
            });

            let info = ler_info(&kit_path).await;

            kits.push(Kit {
                nome,
                tem_imagem: imagem_arquivo.is_some(),
                imagem_ext,
                info,
            });
        }
    }

    kits.sort_by(|a, b| a.nome.cmp(&b.nome));
    Json(kits)
}

/// GET /api/catalogo/imagem/:kit — serve a imagem do kit
pub async fn servir_imagem(
    State(_state): State<Arc<Mutex<AppState>>>,
    Path(kit_nome): Path<String>,
) -> Result<Response<Body>, (StatusCode, String)> {
    let base = catalogo_path();
    let kit_path = base.join(&kit_nome);

    // Segurança: garante que está dentro do catálogo
    let canonical_base = base.canonicalize().map_err(|_| {
        (StatusCode::INTERNAL_SERVER_ERROR, "Catálogo não encontrado".to_string())
    })?;
    let canonical_kit = kit_path.canonicalize().map_err(|_| {
        (StatusCode::NOT_FOUND, format!("Kit '{}' não encontrado", kit_nome))
    })?;
    if !canonical_kit.starts_with(&canonical_base) {
        return Err((StatusCode::FORBIDDEN, "Acesso negado".to_string()));
    }

    // Procura a imagem dentro do kit
    let imagem_arquivo = encontrar_imagem(&canonical_kit).await
        .ok_or_else(|| (StatusCode::NOT_FOUND, "Imagem não encontrada".to_string()))?;

    let imagem_path = canonical_kit.join(&imagem_arquivo);
    let content = fs::read(&imagem_path).await.map_err(|_| {
        (StatusCode::NOT_FOUND, "Erro ao ler imagem".to_string())
    })?;

    let mime = mime_guess::from_path(&imagem_path)
        .first_or_octet_stream()
        .to_string();

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(header::CACHE_CONTROL, "public, max-age=3600")
        .body(Body::from(content))
        .unwrap())
}

/// POST /api/catalogo/salvar — salva info.json no kit
pub async fn salvar_info(
    State(_state): State<Arc<Mutex<AppState>>>,
    Json(body): Json<SalvarInfoBody>,
) -> Json<serde_json::Value> {
    let base = catalogo_path();
    let kit_path = base.join(&body.kit);

    // Segurança
    let canonical_base = match base.canonicalize() {
        Ok(p) => p,
        Err(_) => return Json(serde_json::json!({ "ok": false, "erro": "Catálogo não encontrado" })),
    };
    let canonical_kit = match kit_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return Json(serde_json::json!({ "ok": false, "erro": "Kit não encontrado" })),
    };
    if !canonical_kit.starts_with(&canonical_base) {
        return Json(serde_json::json!({ "ok": false, "erro": "Acesso negado" }));
    }

    let info = KitInfo {
        preco: body.preco.trim().to_string(),
        mensagem: body.mensagem.trim().to_string(),
    };

    let json_str = match serde_json::to_string_pretty(&info) {
        Ok(s) => s,
        Err(e) => return Json(serde_json::json!({ "ok": false, "erro": e.to_string() })),
    };

    let info_path = canonical_kit.join("info.json");
    match fs::write(&info_path, json_str).await {
        Ok(_) => Json(serde_json::json!({ "ok": true })),
        Err(e) => Json(serde_json::json!({ "ok": false, "erro": e.to_string() })),
    }
}

/// GET /api/catalogo/files/*path — serve arquivos genéricos (compatibilidade)
pub async fn serve_file(
    State(_state): State<Arc<Mutex<AppState>>>,
    Path(file_path): Path<String>,
) -> Result<Response<Body>, (StatusCode, String)> {
    let base = catalogo_path();
    let full_path = base.join(&file_path);

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

/// POST /api/catalogo/upload-imagem/:kit — faz upload de imagem para o kit
pub async fn upload_imagem(
    State(_state): State<Arc<Mutex<AppState>>>,
    Path(kit_nome): Path<String>,
    mut multipart: Multipart,
) -> Json<serde_json::Value> {
    let base = catalogo_path();
    let kit_path = base.join(&kit_nome);

    // Segurança: valida que o kit existe e está dentro do catálogo
    let canonical_base = match base.canonicalize() {
        Ok(p) => p,
        Err(_) => return Json(serde_json::json!({ "ok": false, "erro": "Catálogo não encontrado" })),
    };
    let canonical_kit = match kit_path.canonicalize() {
        Ok(p) => p,
        Err(_) => return Json(serde_json::json!({ "ok": false, "erro": "Kit não encontrado" })),
    };
    if !canonical_kit.starts_with(&canonical_base) {
        return Json(serde_json::json!({ "ok": false, "erro": "Acesso negado" }));
    }

    // Processa o upload
    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name != "imagem" {
            continue;
        }

        // Lê os bytes do arquivo
        let data = match field.bytes().await {
            Ok(bytes) => bytes,
            Err(e) => return Json(serde_json::json!({ "ok": false, "erro": format!("Erro ao ler arquivo: {}", e) })),
        };

        // Valida tamanho (5MB)
        if data.len() > 5 * 1024 * 1024 {
            return Json(serde_json::json!({ "ok": false, "erro": "Arquivo muito grande (máx 5MB)" }));
        }

        // Detecta extensão pelo magic bytes
        let ext = if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
            "jpg"
        } else if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
            "png"
        } else if data.starts_with(b"RIFF") && data.len() > 12 && &data[8..12] == b"WEBP" {
            "webp"
        } else {
            return Json(serde_json::json!({ "ok": false, "erro": "Formato de imagem inválido (use JPG, PNG ou WebP)" }));
        };

        // Remove imagens antigas do kit
        if let Ok(mut entries) = fs::read_dir(&canonical_kit).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let nome = entry.file_name().to_string_lossy().to_lowercase();
                if nome.ends_with(".jpg") || nome.ends_with(".jpeg") || nome.ends_with(".png") || nome.ends_with(".webp") {
                    let _ = fs::remove_file(entry.path()).await;
                }
            }
        }

        // Salva nova imagem
        let img_path = canonical_kit.join(format!("imagem.{}", ext));
        match fs::write(&img_path, &data).await {
            Ok(_) => return Json(serde_json::json!({ "ok": true, "caminho": img_path.to_string_lossy() })),
            Err(e) => return Json(serde_json::json!({ "ok": false, "erro": format!("Erro ao salvar: {}", e) })),
        }
    }

    Json(serde_json::json!({ "ok": false, "erro": "Nenhum arquivo recebido" }))
}
