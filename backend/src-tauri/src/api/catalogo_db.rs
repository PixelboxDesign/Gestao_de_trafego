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
    pub imagem_url: Option<String>,
    pub estoque_virtual: Option<f64>,
    pub situacao: Option<String>,
    pub eh_kit: bool,
    pub componentes: Option<serde_json::Value>,
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
            preco,
            preco_custo,
            descricao,
            imagem_url,
            estoque_virtual,
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
            preco,
            preco_custo,
            descricao,
            imagem_url,
            estoque_virtual,
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

        // Verificar se tem thumb (buscar pela pasta com o nome do produto)
        let nome_pasta = kit.nome.as_ref()
            .unwrap_or(&"".to_string())
            .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
            .trim()
            .to_string();
        
        let (tem_thumb, thumb_ext) = verificar_thumb(&nome_pasta).await;

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

async fn verificar_thumb(nome_pasta: &str) -> (bool, Option<String>) {
    use std::path::PathBuf;

    let base = PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall");
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
