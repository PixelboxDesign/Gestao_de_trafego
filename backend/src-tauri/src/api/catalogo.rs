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
pub struct Marca {
    pub nome: String,
    pub total_kits: usize,
}

#[derive(Debug, Serialize)]
pub struct Kit {
    pub nome: String,
    pub marca: String,
    pub tem_thumb: bool,
    pub thumb_ext: Option<String>,
    pub imagens_carrossel: Vec<String>,
    pub info: KitInfo,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KitInfo {
    #[serde(default)]
    pub preco: String,
    #[serde(default)]
    pub descricao: String,
    #[serde(default)]
    pub sku_kit: String,
    #[serde(default)]
    pub skus_itens: Vec<String>,
}

impl Default for KitInfo {
    fn default() -> Self {
        Self {
            preco: String::new(),
            descricao: String::new(),
            sku_kit: String::new(),
            skus_itens: Vec::new(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct SalvarInfoBody {
    pub marca: String,
    pub kit: String,
    pub novo_nome: Option<String>, // Nome novo para renomear pasta
    pub preco: String,
    pub descricao: String,
    pub sku_kit: String,
    pub skus_itens: Vec<String>,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn catalogo_path() -> PathBuf {
    PathBuf::from(CATALOGO_BASE)
}

/// Encontra a imagem thumb dentro de uma pasta de kit
async fn encontrar_thumb(kit_path: &PathBuf) -> Option<String> {
    if let Ok(mut entries) = fs::read_dir(kit_path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let nome = entry.file_name().to_string_lossy().to_lowercase();
            if nome.starts_with("thumb") && 
               (nome.ends_with(".jpg") || nome.ends_with(".jpeg") || nome.ends_with(".png") || nome.ends_with(".webp")) {
                return Some(entry.file_name().to_string_lossy().to_string());
            }
        }
    }
    None
}

/// Lista todas as imagens que NÃO são thumb (para o carrossel)
async fn listar_imagens_carrossel(kit_path: &PathBuf) -> Vec<String> {
    let mut imagens = Vec::new();
    if let Ok(mut entries) = fs::read_dir(kit_path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let nome = entry.file_name().to_string_lossy().to_lowercase();
            if !nome.starts_with("thumb") && !nome.starts_with("info.json") &&
               (nome.ends_with(".jpg") || nome.ends_with(".jpeg") || nome.ends_with(".png") || nome.ends_with(".webp")) {
                imagens.push(entry.file_name().to_string_lossy().to_string());
            }
        }
    }
    imagens.sort();
    imagens
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

/// GET /api/catalogo/marcas — lista todas as marcas disponíveis
pub async fn listar_marcas(
    State(_state): State<Arc<Mutex<AppState>>>,
) -> Json<Vec<Marca>> {
    let base = catalogo_path();
    let mut marcas = Vec::new();

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
            let marca_path = base.join(&nome);

            // Conta quantos kits tem na marca
            let mut total_kits = 0;
            if let Ok(mut kits_entries) = fs::read_dir(&marca_path).await {
                while let Ok(Some(_)) = kits_entries.next_entry().await {
                    total_kits += 1;
                }
            }

            marcas.push(Marca {
                nome,
                total_kits,
            });
        }
    }

    marcas.sort_by(|a, b| a.nome.cmp(&b.nome));
    Json(marcas)
}

/// GET /api/catalogo/kits/:marca — lista kits de uma marca específica
pub async fn listar_kits(
    State(_state): State<Arc<Mutex<AppState>>>,
    Path(marca_nome): Path<String>,
) -> Json<Vec<Kit>> {
    let base = catalogo_path();
    let marca_path = base.join(&marca_nome);
    let mut kits = Vec::new();

    // Valida que a marca existe
    if !marca_path.exists() {
        return Json(kits);
    }

    if let Ok(mut entries) = fs::read_dir(&marca_path).await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            if let Ok(meta) = entry.metadata().await {
                if !meta.is_dir() {
                    continue;
                }
            }

            let nome = entry.file_name().to_string_lossy().to_string();
            let kit_path = marca_path.join(&nome);

            let thumb_arquivo = encontrar_thumb(&kit_path).await;
            let thumb_ext = thumb_arquivo.clone().and_then(|f| {
                std::path::Path::new(&f)
                    .extension()
                    .map(|e| e.to_string_lossy().to_string())
            });

            let imagens_carrossel = listar_imagens_carrossel(&kit_path).await;
            let info = ler_info(&kit_path).await;

            kits.push(Kit {
                nome,
                marca: marca_nome.clone(),
                tem_thumb: thumb_arquivo.is_some(),
                thumb_ext,
                imagens_carrossel,
                info,
            });
        }
    }

    kits.sort_by(|a, b| a.nome.cmp(&b.nome));
    Json(kits)
}

/// GET /api/catalogo/imagem/:marca/:kit/:nome — serve imagem específica do kit
pub async fn servir_imagem(
    State(_state): State<Arc<Mutex<AppState>>>,
    Path((marca_nome, kit_nome, img_nome)): Path<(String, String, String)>,
) -> Result<Response<Body>, (StatusCode, String)> {
    let base = catalogo_path();
    let marca_path = base.join(&marca_nome);
    let kit_path = marca_path.join(&kit_nome);

    // Segurança: garante que está dentro do catálogo
    let canonical_base = base.canonicalize().map_err(|_| {
        (StatusCode::INTERNAL_SERVER_ERROR, "Catálogo não encontrado".to_string())
    })?;
    let canonical_kit = kit_path.canonicalize().map_err(|_| {
        (StatusCode::NOT_FOUND, format!("Kit '{}/{}' não encontrado", marca_nome, kit_nome))
    })?;
    if !canonical_kit.starts_with(&canonical_base) {
        return Err((StatusCode::FORBIDDEN, "Acesso negado".to_string()));
    }

    // Busca a imagem pelo nome
    let imagem_path = canonical_kit.join(&img_nome);
    if !imagem_path.exists() {
        return Err((StatusCode::NOT_FOUND, format!("Imagem '{}' não encontrada", img_nome)));
    }

    let content = fs::read(&imagem_path).await.map_err(|_| {
        (StatusCode::NOT_FOUND, "Erro ao ler imagem".to_string())
    })?;

    // Detecta MIME type
    let mime = if img_nome.to_lowercase().ends_with(".jpg") || img_nome.to_lowercase().ends_with(".jpeg") {
        "image/jpeg"
    } else if img_nome.to_lowercase().ends_with(".png") {
        "image/png"
    } else if img_nome.to_lowercase().ends_with(".webp") {
        "image/webp"
    } else {
        "image/jpeg"
    };

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(header::CACHE_CONTROL, "public, max-age=86400, immutable")
        .header(header::ETAG, format!("\"{}/{}/{}\"", marca_nome, kit_nome, img_nome))
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(header::ACCESS_CONTROL_ALLOW_METHODS, "GET, OPTIONS")
        .body(Body::from(content))
        .unwrap())
}

/// POST /api/catalogo/salvar — salva info.json no kit e renomeia pasta se necessário
pub async fn salvar_info(
    State(_state): State<Arc<Mutex<AppState>>>,
    Json(body): Json<SalvarInfoBody>,
) -> Json<serde_json::Value> {
    let base = catalogo_path();
    let marca_path = base.join(&body.marca);
    let kit_path = marca_path.join(&body.kit);

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

    // Se tiver novo_nome, renomeia a pasta primeiro
    let kit_path_final = if let Some(ref novo_nome) = body.novo_nome {
        let novo_nome_clean = novo_nome.trim();
        if novo_nome_clean.is_empty() || novo_nome_clean == body.kit {
            canonical_kit.clone()
        } else {
            // Valida o novo nome (sem caracteres especiais perigosos)
            if novo_nome_clean.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
                return Json(serde_json::json!({ 
                    "ok": false, 
                    "erro": "Nome inválido. Evite caracteres especiais: / \\ : * ? \" < > |" 
                }));
            }

            let novo_path = marca_path.join(novo_nome_clean);
            
            // Verifica se já existe uma pasta com esse nome
            if novo_path.exists() {
                return Json(serde_json::json!({ 
                    "ok": false, 
                    "erro": format!("Já existe um kit com o nome '{}'", novo_nome_clean) 
                }));
            }

            // Renomeia a pasta
            match fs::rename(&canonical_kit, &novo_path).await {
                Ok(_) => novo_path,
                Err(e) => return Json(serde_json::json!({ 
                    "ok": false, 
                    "erro": format!("Erro ao renomear pasta: {}", e) 
                })),
            }
        }
    } else {
        canonical_kit.clone()
    };

    // Salva o info.json
    let info = KitInfo {
        preco: body.preco.trim().to_string(),
        descricao: body.descricao.trim().to_string(),
        sku_kit: body.sku_kit.trim().to_string(),
        skus_itens: body.skus_itens.iter()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect(),
    };

    let json_str = match serde_json::to_string_pretty(&info) {
        Ok(s) => s,
        Err(e) => return Json(serde_json::json!({ "ok": false, "erro": e.to_string() })),
    };

    let info_path = kit_path_final.join("info.json");
    match fs::write(&info_path, json_str).await {
        Ok(_) => {
            let novo_nome_resposta = if let Some(ref nn) = body.novo_nome {
                if !nn.trim().is_empty() && nn.trim() != body.kit {
                    Some(nn.trim().to_string())
                } else {
                    None
                }
            } else {
                None
            };

            Json(serde_json::json!({ 
                "ok": true,
                "novo_nome": novo_nome_resposta
            }))
        },
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

/// POST /api/catalogo/upload-thumb/:marca/:kit — faz upload da thumbnail
pub async fn upload_thumb(
    State(_state): State<Arc<Mutex<AppState>>>,
    Path((marca_nome, kit_nome)): Path<(String, String)>,
    mut multipart: Multipart,
) -> Json<serde_json::Value> {
    let base = catalogo_path();
    let marca_path = base.join(&marca_nome);
    let kit_path = marca_path.join(&kit_nome);

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

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name != "imagem" {
            continue;
        }

        let data = match field.bytes().await {
            Ok(bytes) => bytes,
            Err(e) => return Json(serde_json::json!({ "ok": false, "erro": format!("Erro ao ler: {}", e) })),
        };

        if data.len() > 5 * 1024 * 1024 {
            return Json(serde_json::json!({ "ok": false, "erro": "Arquivo muito grande (máx 5MB)" }));
        }

        let ext = if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
            "jpg"
        } else if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
            "png"
        } else if data.starts_with(b"RIFF") && data.len() > 12 && &data[8..12] == b"WEBP" {
            "webp"
        } else {
            return Json(serde_json::json!({ "ok": false, "erro": "Formato inválido (JPG, PNG ou WebP)" }));
        };

        // Remove thumb antiga
        if let Ok(mut entries) = fs::read_dir(&canonical_kit).await {
            while let Ok(Some(entry)) = entries.next_entry().await {
                let nome = entry.file_name().to_string_lossy().to_lowercase();
                if nome.starts_with("thumb") {
                    let _ = fs::remove_file(entry.path()).await;
                }
            }
        }

        // Salva nova thumb
        let img_path = canonical_kit.join(format!("thumb.{}", ext));
        match fs::write(&img_path, &data).await {
            Ok(_) => return Json(serde_json::json!({ "ok": true, "arquivo": format!("thumb.{}", ext) })),
            Err(e) => return Json(serde_json::json!({ "ok": false, "erro": format!("Erro ao salvar: {}", e) })),
        }
    }

    Json(serde_json::json!({ "ok": false, "erro": "Nenhum arquivo recebido" }))
}

/// POST /api/catalogo/upload-carrossel/:marca/:kit — adiciona imagem ao carrossel
pub async fn upload_carrossel(
    State(_state): State<Arc<Mutex<AppState>>>,
    Path((marca_nome, kit_nome)): Path<(String, String)>,
    mut multipart: Multipart,
) -> Json<serde_json::Value> {
    let base = catalogo_path();
    let marca_path = base.join(&marca_nome);
    let kit_path = marca_path.join(&kit_nome);

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

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or("").to_string();
        if name != "imagem" {
            continue;
        }

        let data = match field.bytes().await {
            Ok(bytes) => bytes,
            Err(e) => return Json(serde_json::json!({ "ok": false, "erro": format!("Erro ao ler: {}", e) })),
        };

        if data.len() > 5 * 1024 * 1024 {
            return Json(serde_json::json!({ "ok": false, "erro": "Arquivo muito grande (máx 5MB)" }));
        }

        let ext = if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
            "jpg"
        } else if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) {
            "png"
        } else if data.starts_with(b"RIFF") && data.len() > 12 && &data[8..12] == b"WEBP" {
            "webp"
        } else {
            return Json(serde_json::json!({ "ok": false, "erro": "Formato inválido (JPG, PNG ou WebP)" }));
        };

        // Gera nome único (timestamp + contador)
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let mut contador = 1;
        let mut img_path;
        loop {
            img_path = canonical_kit.join(format!("img_{}_{}.{}", timestamp, contador, ext));
            if !img_path.exists() {
                break;
            }
            contador += 1;
        }

        match fs::write(&img_path, &data).await {
            Ok(_) => return Json(serde_json::json!({ 
                "ok": true, 
                "arquivo": format!("img_{}_{}.{}", timestamp, contador, ext) 
            })),
            Err(e) => return Json(serde_json::json!({ "ok": false, "erro": format!("Erro ao salvar: {}", e) })),
        }
    }

    Json(serde_json::json!({ "ok": false, "erro": "Nenhum arquivo recebido" }))
}

/// DELETE /api/catalogo/deletar-imagem/:marca/:kit/:arquivo — deleta imagem do carrossel
pub async fn deletar_imagem(
    State(_state): State<Arc<Mutex<AppState>>>,
    Path((marca_nome, kit_nome, arquivo)): Path<(String, String, String)>,
) -> Json<serde_json::Value> {
    let base = catalogo_path();
    let marca_path = base.join(&marca_nome);
    let kit_path = marca_path.join(&kit_nome);

    // Segurança: não permite deletar thumb
    if arquivo.to_lowercase().starts_with("thumb") {
        return Json(serde_json::json!({ "ok": false, "erro": "Não é permitido deletar a thumbnail por aqui" }));
    }

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

    let img_path = canonical_kit.join(&arquivo);
    match fs::remove_file(&img_path).await {
        Ok(_) => Json(serde_json::json!({ "ok": true })),
        Err(e) => Json(serde_json::json!({ "ok": false, "erro": format!("Erro ao deletar: {}", e) })),
    }
}
