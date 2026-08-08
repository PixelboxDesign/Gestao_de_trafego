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
