use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::AppState;

// ─── Tipos ───────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProdutoDB {
    pub id: i32,
    pub produto_id: Option<String>,
    pub codigo_sku: Option<String>,
    pub nome: Option<String>,
    pub tipo: String,
    pub preco: Option<f64>,
    pub preco_custo: Option<f64>,
    pub descricao: Option<String>,
    pub descricao_peso: Option<String>,
    pub descricao_tamanho: Option<String>,
    pub descricao_composicao: Option<String>,
    pub imagem_url: Option<String>,
    pub estoque_virtual: Option<f64>,
    pub situacao: Option<String>,
    pub eh_kit: bool,
    pub componentes: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct ProdutoResponse {
    pub id: i32,
    pub produto_id: String,
    pub sku: String,
    pub nome: String,
    pub tipo: String,
    pub preco: f64,
    pub descricao: String,
    pub descricao_peso: String,
    pub descricao_tamanho: String,
    pub descricao_composicao: String,
    pub tem_thumb: bool,
    pub thumb_ext: Option<String>,
    pub imagens_carrossel: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct KitResponse {
    pub id: i32,
    pub produto_id: String,
    pub sku: String,
    pub nome: String,
    pub tipo: String,
    pub preco: f64,
    pub descricao: String,
    pub eh_kit: bool,
    pub tem_thumb: bool,
    pub thumb_ext: Option<String>,
    pub componentes: Vec<ComponenteResponse>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponenteResponse {
    pub produto_id: String,
    pub sku: Option<String>,
    pub nome: String,
    pub quantidade: f64,
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/// GET /api/catalogo/v2/produtos — lista todos os produtos do banco
pub async fn listar_produtos_db(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Result<Json<Vec<ProdutoDB>>, (StatusCode, String)> {
    let state = state.lock().await;
    let pool = &state.db;

    let produtos = sqlx::query_as::<_, ProdutoDB>(
        r#"
        SELECT 
            id,
            produto_id,
            codigo_sku,
            nome,
            tipo,
            CAST(preco AS DOUBLE) as preco,
            CAST(preco_custo AS DOUBLE) as preco_custo,
            descricao,
            descricao_peso,
            descricao_tamanho,
            descricao_composicao,
            imagem_url,
            CAST(estoque_virtual AS DOUBLE) as estoque_virtual,
            situacao,
            eh_kit,
            componentes
        FROM relacao_produtos_kits_disparo_luna
        WHERE nome IS NOT NULL
        ORDER BY tipo DESC, nome ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar produtos: {}", e)))?;

    Ok(Json(produtos))
}

/// GET /api/catalogo/v2/produto/:sku — busca produto por SKU
pub async fn buscar_produto_por_sku(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(sku): Path<String>,
) -> Result<Json<ProdutoDB>, (StatusCode, String)> {
    let state = state.lock().await;
    let pool = &state.db;

    let produto = sqlx::query_as::<_, ProdutoDB>(
        r#"
        SELECT 
            id,
            produto_id,
            codigo_sku,
            nome,
            tipo,
            CAST(preco AS DOUBLE) as preco,
            CAST(preco_custo AS DOUBLE) as preco_custo,
            descricao,
            descricao_peso,
            descricao_tamanho,
            descricao_composicao,
            imagem_url,
            CAST(estoque_virtual AS DOUBLE) as estoque_virtual,
            situacao,
            eh_kit,
            componentes
        FROM relacao_produtos_kits_disparo_luna
        WHERE codigo_sku = ?
        LIMIT 1
        "#
    )
    .bind(&sku)
    .fetch_one(pool)
    .await
    .map_err(|e| match e {
        sqlx::Error::RowNotFound => (StatusCode::NOT_FOUND, format!("Produto com SKU '{}' não encontrado", sku)),
        _ => (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar produto: {}", e)),
    })?;

    Ok(Json(produto))
}

/// GET /api/catalogo/v2/kits — lista apenas kits compostos
pub async fn listar_kits_db(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Result<Json<Vec<KitResponse>>, (StatusCode, String)> {
    let state = state.lock().await;
    let pool = &state.db;

    let kits_raw = sqlx::query_as::<_, ProdutoDB>(
        r#"
        SELECT 
            id,
            produto_id,
            codigo_sku,
            nome,
            tipo,
            CAST(preco AS DOUBLE) as preco,
            CAST(preco_custo AS DOUBLE) as preco_custo,
            descricao,
            descricao_peso,
            descricao_tamanho,
            descricao_composicao,
            imagem_url,
            CAST(estoque_virtual AS DOUBLE) as estoque_virtual,
            situacao,
            eh_kit,
            componentes
        FROM relacao_produtos_kits_disparo_luna
        WHERE tipo = 'kit_composto' AND nome IS NOT NULL
        ORDER BY nome ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar kits: {}", e)))?;

    // Converter para KitResponse com componentes parseados
    let mut kits = Vec::new();
    
    for kit in kits_raw {
        let componentes = if let Some(comp_json) = kit.componentes {
            serde_json::from_value::<Vec<ComponenteResponse>>(comp_json)
                .unwrap_or_default()
        } else {
            Vec::new()
        };

        // Verificar se tem thumb (buscar pela pasta com o nome do produto em kits/)
        let nome_pasta = kit.nome.as_ref()
            .unwrap_or(&"".to_string())
            .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
            .trim()
            .to_string();
        
        let (tem_thumb, thumb_ext) = verificar_thumb_kit(&nome_pasta).await;

        kits.push(KitResponse {
            id: kit.id,
            produto_id: kit.produto_id.unwrap_or_default(),
            sku: kit.codigo_sku.unwrap_or_default(),
            nome: kit.nome.unwrap_or_default(),
            tipo: kit.tipo,
            preco: kit.preco.unwrap_or(0.0),
            descricao: kit.descricao.unwrap_or_default(),
            eh_kit: kit.eh_kit,
            tem_thumb,
            thumb_ext,
            componentes,
        });
    }

    Ok(Json(kits))
}

/// GET /api/catalogo/v2/produtos-individuais — lista apenas produtos individuais
pub async fn listar_produtos_individuais_db(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Result<Json<Vec<ProdutoResponse>>, (StatusCode, String)> {
    let state = state.lock().await;
    let pool = &state.db;

    let produtos_raw = sqlx::query_as::<_, ProdutoDB>(
        r#"
        SELECT 
            id,
            produto_id,
            codigo_sku,
            nome,
            tipo,
            CAST(preco AS DOUBLE) as preco,
            CAST(preco_custo AS DOUBLE) as preco_custo,
            descricao,
            descricao_peso,
            descricao_tamanho,
            descricao_composicao,
            imagem_url,
            CAST(estoque_virtual AS DOUBLE) as estoque_virtual,
            situacao,
            eh_kit,
            componentes
        FROM relacao_produtos_kits_disparo_luna
        WHERE tipo = 'produto_individual' AND nome IS NOT NULL
        ORDER BY nome ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar produtos: {}", e)))?;

    let mut produtos = Vec::new();
    
    for produto in produtos_raw {
        let nome_pasta = produto.nome.as_ref()
            .unwrap_or(&"".to_string())
            .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
            .trim()
            .to_string();
        
        let (tem_thumb, thumb_ext) = verificar_thumb_produto(&nome_pasta).await;
        let imagens_carrossel = listar_imagens_carrossel_produto(&nome_pasta).await;

        produtos.push(ProdutoResponse {
            id: produto.id,
            produto_id: produto.produto_id.unwrap_or_default(),
            sku: produto.codigo_sku.unwrap_or_default(),
            nome: produto.nome.unwrap_or_default(),
            tipo: produto.tipo,
            preco: produto.preco.unwrap_or(0.0),
            descricao: produto.descricao.unwrap_or_default(),
            descricao_peso: produto.descricao_peso.unwrap_or_default(),
            descricao_tamanho: produto.descricao_tamanho.unwrap_or_default(),
            descricao_composicao: produto.descricao_composicao.unwrap_or_default(),
            tem_thumb,
            thumb_ext,
            imagens_carrossel,
        });
    }

    Ok(Json(produtos))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async fn verificar_thumb_kit(nome_pasta: &str) -> (bool, Option<String>) {
    use std::path::PathBuf;

    let base = PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\kits");
    let pasta_kit = base.join(nome_pasta);

    if !pasta_kit.exists() {
        return (false, None);
    }

    // Procurar por thumb.* (jpg, png, webp, jpeg)
    let extensoes = vec!["jpg", "jpeg", "png", "webp"];
    
    for ext in extensoes {
        let thumb_path = pasta_kit.join(format!("thumb.{}", ext));
        if thumb_path.exists() {
            return (true, Some(ext.to_string()));
        }
    }

    (false, None)
}

async fn verificar_thumb_produto(nome_pasta: &str) -> (bool, Option<String>) {
    use std::path::PathBuf;

    let base = PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\produtos");
    let pasta_produto = base.join(nome_pasta);

    if !pasta_produto.exists() {
        return (false, None);
    }

    let extensoes = vec!["jpg", "jpeg", "png", "webp"];
    
    for ext in extensoes {
        let thumb_path = pasta_produto.join(format!("thumb.{}", ext));
        if thumb_path.exists() {
            return (true, Some(ext.to_string()));
        }
    }

    (false, None)
}

async fn listar_imagens_carrossel_produto(nome_pasta: &str) -> Vec<String> {
    use std::path::PathBuf;

    let base = PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\produtos");
    let pasta_produto = base.join(nome_pasta);

    if !pasta_produto.exists() {
        return Vec::new();
    }

    let mut imagens = Vec::new();

    if let Ok(entries) = std::fs::read_dir(&pasta_produto) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_file() {
                    if let Some(nome) = entry.file_name().to_str() {
                        // Busca arquivos img_*.jpg, img_*.png, img_*.webp
                        if nome.starts_with("img_") && 
                           (nome.ends_with(".jpg") || nome.ends_with(".jpeg") || 
                            nome.ends_with(".png") || nome.ends_with(".webp")) {
                            imagens.push(nome.to_string());
                        }
                    }
                }
            }
        }
    }

    // Ordena por nome para manter ordem
    imagens.sort();
    imagens
}

// ─── Struct para atualização ─────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct AtualizarProdutoRequest {
    pub codigo_sku: Option<String>,
    pub preco: Option<f64>,
    pub descricao: Option<String>,
    pub descricao_peso: Option<String>,
    pub descricao_tamanho: Option<String>,
    pub descricao_composicao: Option<String>,
}

/// PUT /api/catalogo/produto/:id — atualiza campos do produto
pub async fn atualizar_produto(
    State(state): State<Arc<Mutex<AppState>>>,
    Path((_marca, nome)): Path<(String, String)>,
    Json(payload): Json<AtualizarProdutoRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let state = state.lock().await;
    let pool = &state.db;

    // Constrói a query dinamicamente baseado nos campos presentes
    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(sku) = &payload.codigo_sku {
        updates.push("codigo_sku = ?");
        values.push(sku.clone());
    }
    if let Some(preco) = payload.preco {
        updates.push("preco = ?");
        values.push(preco.to_string());
    }
    if let Some(desc) = &payload.descricao {
        updates.push("descricao = ?");
        values.push(desc.clone());
    }
    if let Some(peso) = &payload.descricao_peso {
        updates.push("descricao_peso = ?");
        values.push(peso.clone());
    }
    if let Some(tamanho) = &payload.descricao_tamanho {
        updates.push("descricao_tamanho = ?");
        values.push(tamanho.clone());
    }
    if let Some(comp) = &payload.descricao_composicao {
        updates.push("descricao_composicao = ?");
        values.push(comp.clone());
    }

    if updates.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Nenhum campo para atualizar".to_string()));
    }

    let query_str = format!(
        "UPDATE relacao_produtos_kits_disparo_luna SET {} WHERE nome = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);
    
    // Bind dos valores
    for value in values {
        query = query.bind(value);
    }
    query = query.bind(&nome);

    query.execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar produto: {}", e)))?;

    Ok(Json(serde_json::json!({ "ok": true, "mensagem": "Produto atualizado com sucesso" })))
}

pub async fn atualizar_kit(
    State(state): State<Arc<Mutex<AppState>>>,
    Path((_marca, nome)): Path<(String, String)>,
    Json(payload): Json<AtualizarProdutoRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let state = state.lock().await;
    let pool = &state.db;

    // Constrói a query dinamicamente baseado nos campos presentes
    let mut updates = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(sku) = &payload.codigo_sku {
        updates.push("codigo_sku = ?");
        values.push(sku.clone());
    }
    if let Some(preco) = payload.preco {
        updates.push("preco = ?");
        values.push(preco.to_string());
    }
    if let Some(desc) = &payload.descricao {
        updates.push("descricao = ?");
        values.push(desc.clone());
    }

    if updates.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "Nenhum campo para atualizar".to_string()));
    }

    let query_str = format!(
        "UPDATE relacao_produtos_kits_disparo_luna SET {} WHERE nome = ? AND tipo = 'kit_composto'",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);
    
    // Bind dos valores
    for value in values {
        query = query.bind(value);
    }
    query = query.bind(&nome);

    query.execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar kit: {}", e)))?;

    Ok(Json(serde_json::json!({ "ok": true, "mensagem": "Kit atualizado com sucesso" })))
}
