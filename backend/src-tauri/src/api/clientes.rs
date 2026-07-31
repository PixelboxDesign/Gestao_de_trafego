use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::AppState;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Cliente {
    pub nome: String,
    pub telefone: Option<String>,
    pub uf: Option<String>,
    pub cidade: Option<String>,
    pub email: Option<String>,
    pub fonte: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClienteQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub search: Option<String>,
    pub uf: Option<String>,
    pub cidade: Option<String>,
    pub somente_com_telefone: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ClientesResponse {
    pub data: Vec<Cliente>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
}

pub async fn list(
    State(state): State<Arc<Mutex<AppState>>>,
    Query(params): Query<ClienteQuery>,
) -> Json<ClientesResponse> {
    let page  = params.page.unwrap_or(1);
    let limit = params.limit.unwrap_or(100).min(500);
    let offset = (page - 1) * limit;

    let state = state.lock().await;

    // Query base unindo todas as fontes de clientes
    let mut where_parts: Vec<String> = vec!["LENGTH(TRIM(nome)) > 2".to_string()];

    if let Some(ref s) = params.search {
        where_parts.push(format!("nome LIKE '%{}%'", s.replace("'", "\\'")));
    }
    if let Some(ref uf) = params.uf {
        where_parts.push(format!("estado = '{}'", uf.replace("'", "\\'")));
    }
    if let Some(ref cidade) = params.cidade {
        where_parts.push(format!("cidade = '{}'", cidade.replace("'", "\\'")));
    }
    if params.somente_com_telefone.unwrap_or(false) {
        where_parts.push("telefone IS NOT NULL AND TRIM(telefone) != ''".to_string());
    }

    let where_clause = where_parts.join(" AND ");

    let sql = format!(
        r#"
        SELECT DISTINCT
            TRIM(nome) as nome,
            telefone,
            estado as uf,
            cidade,
            email,
            fonte
        FROM (
            SELECT TRIM(contato_nome) as nome, NULL as telefone, NULL as estado,
                   NULL as cidade, NULL as email, 'Bling E-commerce' as fonte
            FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
            UNION ALL
            SELECT TRIM(name), NULL, state, city, email, 'Tray E-commerce'
            FROM clientes_tray_ecommerce WHERE name IS NOT NULL
            UNION ALL
            SELECT TRIM(dest_nome), dest_telefone, dest_uf, dest_municipio, NULL, 'XML Interno'
            FROM nfe_xml_importado WHERE dest_nome IS NOT NULL
            UNION ALL
            SELECT TRIM(nome), telefone, NULL, cidade, NULL, 'Contatos'
            FROM contatos_xlsx WHERE nome IS NOT NULL
        ) todos
        WHERE {}
        ORDER BY nome ASC
        LIMIT {} OFFSET {}
        "#,
        where_clause, limit, offset
    );

    let clientes: Vec<Cliente> = sqlx::query_as(&sql)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

    let count_sql = format!(
        r#"SELECT COUNT(*) FROM (
            SELECT DISTINCT TRIM(nome) as nome FROM (
                SELECT TRIM(contato_nome) as nome FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
                UNION ALL SELECT TRIM(name) FROM clientes_tray_ecommerce WHERE name IS NOT NULL
                UNION ALL SELECT TRIM(dest_nome) FROM nfe_xml_importado WHERE dest_nome IS NOT NULL
                UNION ALL SELECT TRIM(nome) FROM contatos_xlsx WHERE nome IS NOT NULL
            ) t WHERE {}
        ) counted"#,
        where_clause
    );

    let total: i64 = sqlx::query_scalar(&count_sql)
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    Json(ClientesResponse { data: clientes, total, page, limit })
}

pub async fn get_by_id(
    State(state): State<Arc<Mutex<AppState>>>,
    Path(nome): Path<String>,
) -> Json<serde_json::Value> {
    let state = state.lock().await;

    let pedidos: Vec<serde_json::Value> = sqlx::query_as::<_, (String, Option<f64>, Option<String>)>(
        "SELECT id, total, data FROM bling_pedidos_venda_ecommerce WHERE contato_nome = ? ORDER BY data DESC LIMIT 50"
    )
    .bind(&nome)
    .fetch_all(&state.db)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(|(id, total, data)| serde_json::json!({ "id": id, "total": total, "data": data }))
    .collect();

    Json(serde_json::json!({
        "nome": nome,
        "pedidos": pedidos,
        "total_pedidos": pedidos.len()
    }))
}
