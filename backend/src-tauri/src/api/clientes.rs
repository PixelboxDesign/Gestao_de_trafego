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
    pub fonte: Option<String>,
    pub somente_com_telefone: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ClientesResponse {
    pub data: Vec<Cliente>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
}

// Subquery base reutilizada em dados e count
fn base_union_sql() -> &'static str {
    r#"
        SELECT
            TRIM(contato_nome) as nome,
            NULL               as telefone,
            NULL               as estado,
            NULL               as cidade,
            NULL               as email,
            'Bling E-commerce' as fonte
        FROM bling_pedidos_venda_ecommerce
        WHERE contato_nome IS NOT NULL

        UNION ALL

        SELECT TRIM(name), NULL, state, city, email, 'Tray E-commerce'
        FROM clientes_tray_ecommerce
        WHERE name IS NOT NULL

        UNION ALL

        SELECT TRIM(dest_nome), dest_telefone, dest_uf, dest_municipio, NULL, 'XML Interno'
        FROM nfe_xml_importado
        WHERE dest_nome IS NOT NULL

        UNION ALL

        SELECT TRIM(nome), telefone, NULL, cidade, NULL, 'Contatos'
        FROM contatos_xlsx
        WHERE nome IS NOT NULL
    "#
}

pub async fn list(
    State(state): State<Arc<Mutex<AppState>>>,
    Query(params): Query<ClienteQuery>,
) -> Json<ClientesResponse> {
    let page   = params.page.unwrap_or(1);
    let limit  = params.limit.unwrap_or(100).min(500);
    let offset = (page - 1) * limit;

    let state = state.lock().await;

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
    if let Some(ref fonte) = params.fonte {
        where_parts.push(format!("fonte = '{}'", fonte.replace("'", "\\'")));
    }
    if params.somente_com_telefone.unwrap_or(false) {
        where_parts.push("telefone IS NOT NULL AND TRIM(telefone) != ''".to_string());
    }

    let where_clause = where_parts.join(" AND ");
    let base = base_union_sql();

    // Query de dados — usa CAST para garantir tipos corretos nos NULLs
    let sql = format!(
        r#"SELECT nome, telefone, estado as uf, cidade, email, fonte FROM (
            SELECT
                TRIM(contato_nome) as nome,
                CAST(NULL AS CHAR) as telefone,
                CAST(NULL AS CHAR) as estado,
                CAST(NULL AS CHAR) as cidade,
                CAST(NULL AS CHAR) as email,
                'Bling E-commerce' as fonte
            FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
            UNION ALL
            SELECT TRIM(name), CAST(NULL AS CHAR), state, city, email, 'Tray E-commerce'
            FROM clientes_tray_ecommerce WHERE name IS NOT NULL
            UNION ALL
            SELECT TRIM(dest_nome), dest_telefone, dest_uf, dest_municipio, CAST(NULL AS CHAR), 'XML Interno'
            FROM nfe_xml_importado WHERE dest_nome IS NOT NULL
            UNION ALL
            SELECT TRIM(nome), telefone, CAST(NULL AS CHAR), cidade, CAST(NULL AS CHAR), 'Contatos'
            FROM contatos_xlsx WHERE nome IS NOT NULL
        ) AS todos
        WHERE {where_clause}
        ORDER BY nome ASC
        LIMIT {limit} OFFSET {offset}"#
    );

    // Query de count — usa CAST para garantir que NULL as telefone seja reconhecido
    let count_sql = format!(
        r#"SELECT COUNT(*) FROM (
            SELECT
                TRIM(contato_nome) as nome,
                CAST(NULL AS CHAR) as telefone,
                CAST(NULL AS CHAR) as estado,
                CAST(NULL AS CHAR) as cidade,
                CAST(NULL AS CHAR) as email,
                'Bling E-commerce' as fonte
            FROM bling_pedidos_venda_ecommerce WHERE contato_nome IS NOT NULL
            UNION ALL
            SELECT TRIM(name), CAST(NULL AS CHAR), state, city, email, 'Tray E-commerce'
            FROM clientes_tray_ecommerce WHERE name IS NOT NULL
            UNION ALL
            SELECT TRIM(dest_nome), dest_telefone, dest_uf, dest_municipio, CAST(NULL AS CHAR), 'XML Interno'
            FROM nfe_xml_importado WHERE dest_nome IS NOT NULL
            UNION ALL
            SELECT TRIM(nome), telefone, CAST(NULL AS CHAR), cidade, CAST(NULL AS CHAR), 'Contatos'
            FROM contatos_xlsx WHERE nome IS NOT NULL
        ) AS todos WHERE {where_clause}"#
    );

    let clientes: Vec<Cliente> = sqlx::query_as(&sql)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

    let total: i64 = match sqlx::query_scalar(&count_sql)
        .fetch_one(&state.db)
        .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("Erro no COUNT: {:?}\nSQL: {}", e, &count_sql[..300.min(count_sql.len())]);
            0
        }
    };

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

/// Retorna lista de UFs únicas para o dropdown
pub async fn list_ufs(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Json<Vec<String>> {
    let state = state.lock().await;
    let sql = r#"
        SELECT DISTINCT estado FROM (
            SELECT state as estado FROM clientes_tray_ecommerce WHERE state IS NOT NULL AND TRIM(state) != ''
            UNION ALL
            SELECT dest_uf FROM nfe_xml_importado WHERE dest_uf IS NOT NULL AND TRIM(dest_uf) != ''
        ) t
        ORDER BY estado ASC
    "#;
    let rows: Vec<(String,)> = sqlx::query_as(sql)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();
    Json(rows.into_iter().map(|(v,)| v).collect())
}

/// Retorna lista de cidades únicas para o dropdown (top 500 por volume)
pub async fn list_cidades(
    State(state): State<Arc<Mutex<AppState>>>,
) -> Json<Vec<String>> {
    let state = state.lock().await;
    let sql = r#"
        SELECT cidade, COUNT(*) as total FROM (
            SELECT city as cidade FROM clientes_tray_ecommerce WHERE city IS NOT NULL AND TRIM(city) != ''
            UNION ALL
            SELECT dest_municipio FROM nfe_xml_importado WHERE dest_municipio IS NOT NULL AND TRIM(dest_municipio) != ''
            UNION ALL
            SELECT cidade FROM contatos_xlsx WHERE cidade IS NOT NULL AND TRIM(cidade) != ''
        ) t
        GROUP BY cidade
        ORDER BY total DESC, cidade ASC
        LIMIT 500
    "#;
    let rows: Vec<(String, i64)> = sqlx::query_as(sql)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();
    Json(rows.into_iter().map(|(v, _)| v).collect())
}

/// Retorna as fontes disponíveis (fixas)
pub async fn list_fontes() -> Json<Vec<String>> {
    Json(vec![
        "Bling E-commerce".to_string(),
        "Tray E-commerce".to_string(),
        "XML Interno".to_string(),
        "Contatos".to_string(),
    ])
}
