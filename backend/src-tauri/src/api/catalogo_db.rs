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
    pub visivel: bool,
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
    pub visivel: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponenteFromDB {
    pub produto_id: String,
    #[serde(default)]
    pub sku: Option<String>,
    pub nome: String,
    pub quantidade: i32,  // Banco retorna int
}

#[derive(Debug, Serialize, Clone)]
pub struct ComponenteResponse {
    pub produto_id: String,
    pub sku: Option<String>,
    pub nome: String,
    pub quantidade: f64,
    pub tem_thumb: bool,
    pub thumb_ext: Option<String>,
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
        let componentes_raw = if let Some(comp_json) = kit.componentes {
            match serde_json::from_value::<Vec<ComponenteFromDB>>(comp_json.clone()) {
                Ok(comps) => {
                    tracing::info!("✅ Componentes parseados: {} itens", comps.len());
                    comps
                }
                Err(e) => {
                    tracing::error!("❌ Erro ao parsear componentes do kit '{}': {}", 
                        kit.nome.as_ref().unwrap_or(&"".to_string()), e);
                    tracing::error!("JSON recebido: {}", comp_json);
                    Vec::new()
                }
            }
        } else {
            tracing::warn!("⚠️ Kit '{}' não tem componentes no banco", 
                kit.nome.as_ref().unwrap_or(&"".to_string()));
            Vec::new()
        };

        // Para cada componente, buscar se tem thumbnail
        let mut componentes = Vec::new();
        for comp in componentes_raw {
            let nome_pasta_componente = comp.nome
                .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
                .trim()
                .to_string();
            
            let (tem_thumb, thumb_ext) = verificar_thumb_produto(&nome_pasta_componente).await;

            componentes.push(ComponenteResponse {
                produto_id: comp.produto_id,
                sku: comp.sku,
                nome: comp.nome,
                quantidade: comp.quantidade as f64,  // Convert int -> float
                tem_thumb,
                thumb_ext,
            });
        }

        // Verificar se tem thumb (buscar pela pasta com o nome do produto em kits/)
        let nome_pasta = kit.nome.as_ref()
            .unwrap_or(&"".to_string())
            .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
            .trim()
            .to_string();
        
        // ✅ TASK #1: Verificar se a pasta existe ANTES de adicionar
        use std::path::PathBuf;
        let base_kits = PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\kits");
        let pasta_kit = base_kits.join(&nome_pasta);
        
        // Se a pasta não existe, pula este kit (normalização)
        if !pasta_kit.exists() || !pasta_kit.is_dir() {
            continue;
        }
        
        let (tem_thumb, thumb_ext) = verificar_thumb_kit(&nome_pasta).await;
        let visivel = ler_visivel_kit(&nome_pasta).await;

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
            visivel,
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
        
        // ✅ TASK #1: Verificar se a pasta existe ANTES de adicionar
        use std::path::PathBuf;
        let base = PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\produtos");
        let pasta_produto = base.join(&nome_pasta);
        
        // Se a pasta não existe, pula este produto (normalização)
        if !pasta_produto.exists() || !pasta_produto.is_dir() {
            continue;
        }
        
        let (tem_thumb, thumb_ext) = verificar_thumb_produto(&nome_pasta).await;
        let imagens_carrossel = listar_imagens_carrossel_produto(&nome_pasta).await;
        let visivel = ler_visivel_produto(&nome_pasta).await;

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
            visivel,
        });
    }

    Ok(Json(produtos))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

#[derive(Debug, serde::Deserialize)]
struct InfoJson {
    #[serde(default = "default_true_helper")]
    visivel: bool,
}

fn default_true_helper() -> bool {
    true
}

async fn ler_visivel_kit(nome_pasta: &str) -> bool {
    use std::path::PathBuf;
    use tokio::fs;

    let base = PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\kits");
    let info_path = base.join(nome_pasta).join("info.json");

    if let Ok(conteudo) = fs::read_to_string(&info_path).await {
        if let Ok(info) = serde_json::from_str::<InfoJson>(&conteudo) {
            return info.visivel;
        }
    }
    true // Default = visível
}

async fn ler_visivel_produto(nome_pasta: &str) -> bool {
    use std::path::PathBuf;
    use tokio::fs;

    let base = PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\produtos");
    let info_path = base.join(nome_pasta).join("info.json");

    if let Ok(conteudo) = fs::read_to_string(&info_path).await {
        if let Ok(info) = serde_json::from_str::<InfoJson>(&conteudo) {
            return info.visivel;
        }
    }
    true // Default = visível
}

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

// ─── Endpoint para dropdown de disparo ──────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ItemDisparo {
    pub id: i32,
    pub nome: String,
    pub tipo: String, // "kit" ou "produto"
    pub thumb_url: Option<String>,
    pub caminho_thumb_bd: Option<String>,
}

/// GET /api/catalogo/v2/kits-e-produtos — lista kits e produtos para dropdown de disparo
pub async fn listar_kits_e_produtos_disparo(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Result<Json<Vec<ItemDisparo>>, (StatusCode, String)> {
    let state = state.lock().await;
    let pool = &state.db;

    // Busca kits e produtos do banco
    let items_raw = sqlx::query_as::<_, ProdutoDB>(
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
        WHERE (tipo = 'kit_composto' OR tipo = 'produto_individual') AND nome IS NOT NULL
        ORDER BY tipo DESC, nome ASC
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao buscar itens: {}", e)))?;

    let mut items = Vec::new();
    
    for item in items_raw {
        let nome = item.nome.as_ref()
            .unwrap_or(&"".to_string())
            .clone();
        
        let nome_pasta = nome
            .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
            .trim()
            .to_string();
        
        // Determina se é kit ou produto
        let tipo_item = if item.tipo == "kit_composto" { "kit" } else { "produto" };
        let subfolder = if tipo_item == "kit" { "kits" } else { "produtos" };
        
        // Verificar se tem thumb
        let (tem_thumb, thumb_ext) = if tipo_item == "kit" {
            verificar_thumb_kit(&nome_pasta).await
        } else {
            verificar_thumb_produto(&nome_pasta).await
        };
        
        let thumb_url = if tem_thumb && thumb_ext.is_some() {
            let ext = thumb_ext.as_ref().unwrap();
            Some(format!(
                "/api/catalogo/imagem/Alphahall/{}/thumb.{}?tipo={}",
                nome_pasta, ext, tipo_item
            ))
        } else {
            None
        };

        let caminho_thumb_bd = if tem_thumb && thumb_ext.is_some() {
            Some(format!(
                "Alphahall/{}/{}/thumb.{}",
                subfolder, nome_pasta, thumb_ext.as_ref().unwrap()
            ))
        } else {
            None
        };

        items.push(ItemDisparo {
            id: item.id,
            nome,
            tipo: tipo_item.to_string(),
            thumb_url,
            caminho_thumb_bd,
        });
    }

    Ok(Json(items))
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
    pub visivel: Option<bool>,
    pub novo_nome: Option<String>,
}

/// PUT /api/catalogo/produto/:id — atualiza campos do produto
pub async fn atualizar_produto(
    State(state): State<Arc<Mutex<AppState>>>,
    Path((_marca, nome)): Path<(String, String)>,
    Json(payload): Json<AtualizarProdutoRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {

    // ── Renomear pasta (filesystem) se novo_nome foi enviado ──────────────────
    let nome_efetivo = if let Some(ref novo_nome) = payload.novo_nome {
        let novo_nome_clean = novo_nome.trim().to_string();
        if !novo_nome_clean.is_empty() && novo_nome_clean != nome {
            // Valida caracteres
            if novo_nome_clean.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
                return Ok(Json(serde_json::json!({
                    "ok": false,
                    "erro": "Nome inválido. Evite: / \\ : * ? \" < > |"
                })));
            }
            let nome_pasta_atual = nome
                .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
                .trim().to_string();
            let nome_pasta_novo = novo_nome_clean
                .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
                .trim().to_string();
            let base = std::path::PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\produtos");
            let pasta_atual = base.join(&nome_pasta_atual);
            let pasta_nova  = base.join(&nome_pasta_novo);
            if pasta_nova.exists() {
                return Ok(Json(serde_json::json!({
                    "ok": false,
                    "erro": format!("Já existe um produto com o nome '{}'", nome_pasta_novo)
                })));
            }
            if pasta_atual.exists() {
                tokio::fs::rename(&pasta_atual, &pasta_nova).await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao renomear pasta: {}", e)))?;
            }
            novo_nome_clean
        } else {
            nome.clone()
        }
    } else {
        nome.clone()
    };

    // Se veio campo `visivel`, salva no info.json (filesystem)
    if let Some(visivel) = payload.visivel {
        let nome_pasta = nome
            .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
            .trim()
            .to_string();
        let info_path = std::path::PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\produtos")
            .join(&nome_pasta)
            .join("info.json");

        // Lê o info.json atual (ou cria um vazio)
        let mut info: serde_json::Value = if let Ok(conteudo) = tokio::fs::read_to_string(&info_path).await {
            serde_json::from_str(&conteudo).unwrap_or(serde_json::json!({}))
        } else {
            serde_json::json!({})
        };

        info["visivel"] = serde_json::json!(visivel);

        let json_str = serde_json::to_string_pretty(&info)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        // Cria a pasta se não existir
        if let Some(parent) = info_path.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }

        tokio::fs::write(&info_path, json_str)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao salvar info.json: {}", e)))?;

        // Se só veio visivel (sem outros campos), retorna aqui
        let tem_outros_campos = payload.codigo_sku.is_some()
            || payload.preco.is_some()
            || payload.descricao.is_some()
            || payload.descricao_peso.is_some()
            || payload.descricao_tamanho.is_some()
            || payload.descricao_composicao.is_some();

        if !tem_outros_campos {
            return Ok(Json(serde_json::json!({ "ok": true, "mensagem": "Visibilidade atualizada com sucesso", "novo_nome": nome_efetivo })));
        }
    }

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
    // Atualiza nome no banco se foi renomeado
    if nome_efetivo != nome {
        updates.push("nome = ?");
        values.push(nome_efetivo.clone());
    }

    if updates.is_empty() {
        return Ok(Json(serde_json::json!({ "ok": true, "mensagem": "Produto renomeado com sucesso", "novo_nome": nome_efetivo })));
    }

    let query_str = format!(
        "UPDATE relacao_produtos_kits_disparo_luna SET {} WHERE nome = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);
    
    for value in values {
        query = query.bind(value);
    }
    query = query.bind(&nome);

    query.execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar produto: {}", e)))?;

    Ok(Json(serde_json::json!({ "ok": true, "mensagem": "Produto atualizado com sucesso", "novo_nome": nome_efetivo })))
}

pub async fn atualizar_kit(
    State(state): State<Arc<Mutex<AppState>>>,
    Path((_marca, nome)): Path<(String, String)>,
    Json(payload): Json<AtualizarProdutoRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {

    // ── Renomear pasta (filesystem) se novo_nome foi enviado ──────────────────
    let nome_efetivo = if let Some(ref novo_nome) = payload.novo_nome {
        let novo_nome_clean = novo_nome.trim().to_string();
        if !novo_nome_clean.is_empty() && novo_nome_clean != nome {
            if novo_nome_clean.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
                return Ok(Json(serde_json::json!({
                    "ok": false,
                    "erro": "Nome inválido. Evite: / \\ : * ? \" < > |"
                })));
            }
            let nome_pasta_atual = nome
                .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
                .trim().to_string();
            let nome_pasta_novo = novo_nome_clean
                .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
                .trim().to_string();
            let base = std::path::PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\kits");
            let pasta_atual = base.join(&nome_pasta_atual);
            let pasta_nova  = base.join(&nome_pasta_novo);
            if pasta_nova.exists() {
                return Ok(Json(serde_json::json!({
                    "ok": false,
                    "erro": format!("Já existe um kit com o nome '{}'", nome_pasta_novo)
                })));
            }
            if pasta_atual.exists() {
                tokio::fs::rename(&pasta_atual, &pasta_nova).await
                    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao renomear pasta: {}", e)))?;
            }
            novo_nome_clean
        } else {
            nome.clone()
        }
    } else {
        nome.clone()
    };

    // Se veio campo `visivel`, salva no info.json (filesystem)
    if let Some(visivel) = payload.visivel {
        let nome_pasta = nome_efetivo
            .replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "")
            .trim()
            .to_string();
        let info_path = std::path::PathBuf::from("f:\\luna_cosmeticos\\catalogos\\Alphahall\\kits")
            .join(&nome_pasta)
            .join("info.json");

        let mut info: serde_json::Value = if let Ok(conteudo) = tokio::fs::read_to_string(&info_path).await {
            serde_json::from_str(&conteudo).unwrap_or(serde_json::json!({}))
        } else {
            serde_json::json!({})
        };

        info["visivel"] = serde_json::json!(visivel);

        let json_str = serde_json::to_string_pretty(&info)
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        if let Some(parent) = info_path.parent() {
            let _ = tokio::fs::create_dir_all(parent).await;
        }

        tokio::fs::write(&info_path, json_str)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao salvar info.json: {}", e)))?;

        let tem_outros_campos = payload.codigo_sku.is_some()
            || payload.preco.is_some()
            || payload.descricao.is_some();

        if !tem_outros_campos {
            return Ok(Json(serde_json::json!({ "ok": true, "mensagem": "Kit atualizado com sucesso", "novo_nome": nome_efetivo })));
        }
    }

    let state = state.lock().await;
    let pool = &state.db;

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
    // Atualiza nome no banco se foi renomeado
    if nome_efetivo != nome {
        updates.push("nome = ?");
        values.push(nome_efetivo.clone());
    }

    if updates.is_empty() {
        return Ok(Json(serde_json::json!({ "ok": true, "mensagem": "Kit renomeado com sucesso", "novo_nome": nome_efetivo })));
    }

    let query_str = format!(
        "UPDATE relacao_produtos_kits_disparo_luna SET {} WHERE nome = ? AND tipo = 'kit_composto'",
        updates.join(", ")
    );

    let mut query = sqlx::query(&query_str);
    
    for value in values {
        query = query.bind(value);
    }
    query = query.bind(&nome);

    query.execute(pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar kit: {}", e)))?;

    Ok(Json(serde_json::json!({ "ok": true, "mensagem": "Kit atualizado com sucesso", "novo_nome": nome_efetivo })))
}

// ─── Criação de Produto/Kit ───────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct CriarProdutoRequest {
    pub nome: String,
    pub marca: Option<String>,
    pub preco: Option<f64>,
    pub descricao: Option<String>,
    pub codigo_sku: Option<String>,
}

/// POST /api/catalogo/criar-produto — cria pasta no filesystem + insere no banco
pub async fn criar_produto(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(payload): Json<CriarProdutoRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let nome = payload.nome.trim().to_string();
    if nome.is_empty() {
        return Ok(Json(serde_json::json!({ "ok": false, "erro": "Nome não pode ser vazio" })));
    }
    if nome.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
        return Ok(Json(serde_json::json!({ "ok": false, "erro": "Nome inválido. Evite: / \\ : * ? \" < > |" })));
    }

    let marca = payload.marca.as_deref().unwrap_or("Alphahall").to_string();
    let nome_pasta = nome.replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "").trim().to_string();

    // Cria pasta no filesystem
    let pasta = std::path::PathBuf::from(format!("f:\\luna_cosmeticos\\catalogos\\{}\\produtos", marca))
        .join(&nome_pasta);

    if pasta.exists() {
        return Ok(Json(serde_json::json!({ "ok": false, "erro": format!("Produto '{}' já existe", nome_pasta) })));
    }

    tokio::fs::create_dir_all(&pasta).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao criar pasta: {}", e)))?;

    // Cria info.json inicial
    let info = serde_json::json!({ "visivel": true });
    let _ = tokio::fs::write(pasta.join("info.json"), serde_json::to_string_pretty(&info).unwrap()).await;

    // Insere no banco de dados
    let state = state.lock().await;
    let pool = &state.db;

    sqlx::query(
        "INSERT INTO relacao_produtos_kits_disparo_luna (nome, tipo, preco, descricao, codigo_sku, eh_kit)
         VALUES (?, 'produto_individual', ?, ?, ?, 0)"
    )
    .bind(&nome)
    .bind(payload.preco.unwrap_or(0.0))
    .bind(payload.descricao.as_deref().unwrap_or(""))
    .bind(payload.codigo_sku.as_deref().unwrap_or(""))
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao inserir no banco: {}", e)))?;

    Ok(Json(serde_json::json!({ "ok": true, "nome": nome, "mensagem": "Produto criado com sucesso" })))
}

#[derive(Debug, Deserialize)]
pub struct CriarKitRequest {
    pub nome: String,
    pub marca: Option<String>,
    pub preco: Option<f64>,
    pub descricao: Option<String>,
    pub codigo_sku: Option<String>,
    pub componentes: Option<Vec<ComponenteInput>>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ComponenteInput {
    pub produto_id: String,
    pub nome: String,
    pub sku: Option<String>,
    pub quantidade: i32,
}

/// POST /api/catalogo/criar-kit — cria pasta no filesystem + insere no banco
pub async fn criar_kit(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(payload): Json<CriarKitRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let nome = payload.nome.trim().to_string();
    if nome.is_empty() {
        return Ok(Json(serde_json::json!({ "ok": false, "erro": "Nome não pode ser vazio" })));
    }
    if nome.contains(['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
        return Ok(Json(serde_json::json!({ "ok": false, "erro": "Nome inválido. Evite: / \\ : * ? \" < > |" })));
    }

    let marca = payload.marca.as_deref().unwrap_or("Alphahall").to_string();
    let nome_pasta = nome.replace(&['<', '>', ':', '"', '/', '\\', '|', '?', '*'][..], "").trim().to_string();

    // Cria pasta no filesystem
    let pasta = std::path::PathBuf::from(format!("f:\\luna_cosmeticos\\catalogos\\{}\\kits", marca))
        .join(&nome_pasta);

    if pasta.exists() {
        return Ok(Json(serde_json::json!({ "ok": false, "erro": format!("Kit '{}' já existe", nome_pasta) })));
    }

    tokio::fs::create_dir_all(&pasta).await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao criar pasta: {}", e)))?;

    let info = serde_json::json!({ "visivel": true });
    let _ = tokio::fs::write(pasta.join("info.json"), serde_json::to_string_pretty(&info).unwrap()).await;

    // Serializa componentes para JSON
    let componentes_json = serde_json::to_string(&payload.componentes.unwrap_or_default()).unwrap_or("[]".to_string());

    // Insere no banco
    let state = state.lock().await;
    let pool = &state.db;

    sqlx::query(
        "INSERT INTO relacao_produtos_kits_disparo_luna (nome, tipo, preco, descricao, codigo_sku, eh_kit, componentes)
         VALUES (?, 'kit_composto', ?, ?, ?, 1, ?)"
    )
    .bind(&nome)
    .bind(payload.preco.unwrap_or(0.0))
    .bind(payload.descricao.as_deref().unwrap_or(""))
    .bind(payload.codigo_sku.as_deref().unwrap_or(""))
    .bind(&componentes_json)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao inserir no banco: {}", e)))?;

    Ok(Json(serde_json::json!({ "ok": true, "nome": nome, "mensagem": "Kit criado com sucesso" })))
}

#[derive(Debug, Deserialize)]
pub struct AtualizarComponentesRequest {
    pub componentes: Vec<ComponenteInput>,
}

/// PUT /api/catalogo/v2/kit/:marca/:nome/componentes — atualiza lista de componentes
pub async fn atualizar_componentes_kit(
    State(state): State<Arc<Mutex<AppState>>>,
    Path((_marca, nome)): Path<(String, String)>,
    Json(payload): Json<AtualizarComponentesRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, String)> {
    let componentes_json = serde_json::to_string(&payload.componentes)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let state = state.lock().await;
    let pool = &state.db;

    sqlx::query(
        "UPDATE relacao_produtos_kits_disparo_luna SET componentes = ? WHERE nome = ? AND tipo = 'kit_composto'"
    )
    .bind(&componentes_json)
    .bind(&nome)
    .execute(pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Erro ao atualizar componentes: {}", e)))?;

    Ok(Json(serde_json::json!({ "ok": true, "mensagem": "Componentes atualizados com sucesso" })))
}
