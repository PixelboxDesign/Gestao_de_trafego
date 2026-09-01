use axum::{
    extract::{Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::AppState;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Disparo {
    pub id: u32,
    pub numero: String,
    pub nome: Option<String>,
    pub mensagem: String,
    pub kit_nome: Option<String>,
    pub campanha_id: Option<u32>,
    pub status: String,
    pub erro_msg: Option<String>,
    pub criado_em: Option<String>,
    pub enviado_em: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct DisparosQuery {
    pub limit: Option<u32>,
    pub page: Option<u32>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct DisparosResponse {
    pub data: Vec<Disparo>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
}

/// GET /api/disparos — lista histórico de disparos
pub async fn list(
    State(state): State<Arc<Mutex<AppState>>>,
    Query(params): Query<DisparosQuery>,
) -> Json<DisparosResponse> {
    let limit = params.limit.unwrap_or(60).min(200);
    let page  = params.page.unwrap_or(1);
    let offset = (page - 1) * limit;
    let state = state.lock().await;

    let mut where_clause = String::from("1=1");
    if let Some(ref s) = params.status {
        where_clause.push_str(&format!(" AND status = '{}'", s.replace("'", "\\'")));
    }

    let sql = format!(
        r#"SELECT id, numero, nome, mensagem, kit_nome, campanha_id, status, erro_msg,
                  DATE_FORMAT(criado_em, '%Y-%m-%dT%T') as criado_em,
                  DATE_FORMAT(enviado_em, '%Y-%m-%dT%T') as enviado_em
           FROM app_disparos
           WHERE {}
           ORDER BY criado_em DESC
           LIMIT {} OFFSET {}"#,
        where_clause, limit, offset
    );

    let count_sql = format!(
        "SELECT COUNT(*) FROM app_disparos WHERE {}",
        where_clause
    );

    let data: Vec<Disparo> = sqlx::query_as(&sql)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

    let total: i64 = sqlx::query_scalar(&count_sql)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    Json(DisparosResponse { data, total, page, limit })
}

/// POST /api/disparos — registra um disparo no histórico
#[derive(Debug, Deserialize)]
pub struct NovoDisparo {
    pub numero: String,
    pub nome: Option<String>,
    pub mensagem: String,
    pub kit_nome: Option<String>,
    pub campanha_id: Option<u32>,
    pub status: Option<String>,
}

pub async fn criar(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(body): Json<NovoDisparo>,
) -> Json<serde_json::Value> {
    let state = state.lock().await;
    let status = body.status.unwrap_or_else(|| "pendente".to_string());

    let result = sqlx::query(
        r#"INSERT INTO app_disparos (numero, nome, mensagem, kit_nome, campanha_id, status)
           VALUES (?, ?, ?, ?, ?, ?)"#
    )
    .bind(&body.numero)
    .bind(&body.nome)
    .bind(&body.mensagem)
    .bind(&body.kit_nome)
    .bind(&body.campanha_id)
    .bind(&status)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) => Json(serde_json::json!({ "ok": true, "id": r.last_insert_id() })),
        Err(e) => Json(serde_json::json!({ "ok": false, "erro": e.to_string() })),
    }
}

// ─── Endpoint para iniciar disparo ───────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct IniciarDisparoRequest {
    pub mensagem: String,
    pub item_id: i32,
    pub item_tipo: String, // "kit" ou "produto"
    pub quantidade: u32,
    pub intervalo_horas: f64,
}

#[derive(Debug, Serialize)]
pub struct IniciarDisparoResponse {
    pub ok: bool,
    pub disparo_id: Option<u64>,
    pub erro: Option<String>,
    pub intervalo_segundos: Option<u32>,
}

/// POST /api/disparos/iniciar — inicia um disparo WhatsApp configurado
pub async fn iniciar_disparo(
    State(state): State<Arc<Mutex<AppState>>>,
    Json(body): Json<IniciarDisparoRequest>,
) -> Json<IniciarDisparoResponse> {
    let state_lock = state.lock().await;
    
    // Validações
    if body.mensagem.trim().is_empty() {
        return Json(IniciarDisparoResponse {
            ok: false,
            disparo_id: None,
            erro: Some("Mensagem não pode estar vazia".to_string()),
            intervalo_segundos: None,
        });
    }

    if body.quantidade == 0 {
        return Json(IniciarDisparoResponse {
            ok: false,
            disparo_id: None,
            erro: Some("Quantidade deve ser maior que zero".to_string()),
            intervalo_segundos: None,
        });
    }

    if body.intervalo_horas <= 0.0 {
        return Json(IniciarDisparoResponse {
            ok: false,
            disparo_id: None,
            erro: Some("Intervalo deve ser maior que zero".to_string()),
            intervalo_segundos: None,
        });
    }

    // Busca o item (kit ou produto) no banco
    let item_query = format!(
        r#"SELECT id, nome, tipo, codigo_sku FROM relacao_produtos_kits_disparo_luna 
           WHERE id = ? AND tipo = ? LIMIT 1"#
    );

    let tipo_db = if body.item_tipo == "kit" {
        "kit_composto"
    } else {
        "produto_individual"
    };

    let item: Option<(i32, Option<String>, String, Option<String>)> = 
        sqlx::query_as(&item_query)
            .bind(body.item_id)
            .bind(tipo_db)
            .fetch_optional(&state_lock.db)
            .await
            .unwrap_or(None);

    let item_nome = match item {
        Some((_, nome_opt, _, _)) => nome_opt.unwrap_or_else(|| "Sem nome".to_string()),
        None => {
            return Json(IniciarDisparoResponse {
                ok: false,
                disparo_id: None,
                erro: Some(format!("{} não encontrado", if body.item_tipo == "kit" { "Kit" } else { "Produto" })),
                intervalo_segundos: None,
            });
        }
    };

    // Calcula intervalo em segundos entre cada mensagem
    let intervalo_segundos = ((body.intervalo_horas * 3600.0) / body.quantidade as f64).floor() as u32;

    // TODO: Aqui seria iniciado o processo de disparo em background
    // Por enquanto, apenas registra o disparo no banco
    
    // Registra o disparo inicial no histórico
    let result = sqlx::query(
        r#"INSERT INTO app_disparos (numero, nome, mensagem, kit_nome, campanha_id, status)
           VALUES (?, ?, ?, ?, ?, ?)"#
    )
    .bind("") // número será preenchido no envio
    .bind(Option::<String>::None) // nome do cliente
    .bind(&body.mensagem)
    .bind(&item_nome)
    .bind(Option::<u32>::None) // campanha_id
    .bind("agendado") // status
    .execute(&state_lock.db)
    .await;

    match result {
        Ok(r) => Json(IniciarDisparoResponse {
            ok: true,
            disparo_id: Some(r.last_insert_id()),
            erro: None,
            intervalo_segundos: Some(intervalo_segundos),
        }),
        Err(e) => Json(IniciarDisparoResponse {
            ok: false,
            disparo_id: None,
            erro: Some(format!("Erro ao registrar disparo: {}", e)),
            intervalo_segundos: None,
        }),
    }
}
