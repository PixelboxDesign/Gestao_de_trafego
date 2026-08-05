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
    pub deduplicar: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ClientesResponse {
    pub data: Vec<Cliente>,
    pub total: i64,
    pub page: u32,
    pub limit: u32,
}

// Limpa o nome do cliente removendo lixo dos dados brutos
fn limpar_nome_str(nome: &str) -> String {
    let s = nome.trim();

    // 1. Descarta HTML entities
    if s.contains("&#") || s.contains("&amp;") {
        return String::new();
    }

    // 2. Descarta nomes censurados com asterisco (A*****a)
    if s.contains('*') {
        return String::new();
    }

    // 3. Descarta registros que são só números (sem nenhuma letra)
    if !s.chars().any(|c| c.is_alphabetic()) {
        return String::new();
    }

    // 4. Remove caracteres inválidos no início: . , _ " ' > ? ! ;
    let s = s.trim_start_matches(|c: char| {
        matches!(c, '.' | ',' | '_' | '"' | '\'' | '>' | '?' | '!' | ';' | '(' | ')')
    });
    let s = s.trim();

    // 5. Se começa com número: encontra onde a parte alfabética começa e remove o prefixo
    let s = if s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
        // Encontra primeira letra
        match s.char_indices().find(|(_, c)| c.is_alphabetic()) {
            Some((pos, _)) => {
                // Remove separadores antes do nome (espaço, ponto, traço, barra)
                s[pos..].trim_start_matches(|c: char| matches!(c, ' ' | '.' | '-' | '/'))
            }
            None => return String::new(), // só números, descarta
        }
    } else {
        s
    };

    // 6. Remove sufixo numérico: " 114.688.616-03" no fim (CPF no final)
    let s = {
        // Procura último espaço e verifica se o que vem depois é só número/pontos/traços
        if let Some(pos) = s.rfind(' ') {
            let sufixo = &s[pos + 1..];
            let digits: String = sufixo.chars().filter(|c| c.is_ascii_digit()).collect();
            if digits.len() >= 6 && !sufixo.chars().any(|c| c.is_alphabetic()) {
                s[..pos].trim()
            } else {
                s
            }
        } else {
            s
        }
    };

    // 7. Remove conteúdo entre parênteses que pareça código/número
    let s = if let Some(p) = s.rfind('(') {
        let dentro = s[p..].trim_start_matches('(').trim_end_matches(')').trim();
        // Remove parênteses se o conteúdo tiver mais dígitos que letras (parece código)
        let letras = dentro.chars().filter(|c| c.is_alphabetic()).count();
        let digitos = dentro.chars().filter(|c| c.is_ascii_digit()).count();
        if digitos > letras {
            s[..p].trim()
        } else {
            s
        }
    } else {
        s
    };

    let resultado = s.trim().to_string();

    // 8. Descarta se ficou muito curto ou ainda não tem letra
    if resultado.len() < 3 || !resultado.chars().any(|c| c.is_alphabetic()) {
        return String::new();
    }

    resultado
}

// Subquery base — sem REGEXP, retorna dados brutos para limpeza em Rust
fn base_union_sql() -> String {
    String::from(r#"
        SELECT
            TRIM(contato_nome)     as nome,
            CAST(NULL AS CHAR)     as telefone,
            CAST(NULL AS CHAR)     as estado,
            CAST(NULL AS CHAR)     as cidade,
            CAST(NULL AS CHAR)     as email,
            'Bling E-commerce'     as fonte
        FROM bling_pedidos_venda_ecommerce
        WHERE contato_nome IS NOT NULL

        UNION ALL

        SELECT TRIM(name), CAST(NULL AS CHAR), state, city, email, 'Tray E-commerce'
        FROM clientes_tray_ecommerce
        WHERE name IS NOT NULL

        UNION ALL

        SELECT TRIM(dest_nome), dest_telefone, dest_uf, dest_municipio, CAST(NULL AS CHAR), 'XML Interno'
        FROM nfe_xml_importado
        WHERE dest_nome IS NOT NULL

        UNION ALL

        SELECT TRIM(nome), telefone, CAST(NULL AS CHAR), cidade, CAST(NULL AS CHAR), 'Contatos'
        FROM contatos_xlsx
        WHERE nome IS NOT NULL
    "#)
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
    let deduplicar = params.deduplicar.unwrap_or(false);

    // Query de dados — com ou sem deduplicação por telefone
    let sql = if deduplicar {
        format!(
            r#"SELECT
                MIN(nome)     as nome,
                telefone,
                MIN(estado)   as uf,
                MIN(cidade)   as cidade,
                MIN(email)    as email,
                MIN(fonte)    as fonte
               FROM ({base}) AS todos
               WHERE {where_clause}
               AND telefone IS NOT NULL AND TRIM(telefone) != ''
               GROUP BY telefone
               ORDER BY nome ASC
               LIMIT {limit} OFFSET {offset}"#
        )
    } else {
        format!(
            r#"SELECT nome, telefone, estado as uf, cidade, email, fonte
               FROM ({base}) AS todos
               WHERE {where_clause}
               ORDER BY nome ASC
               LIMIT {limit} OFFSET {offset}"#
        )
    };

    // Query de count — adapta para deduplicação
    let count_sql = if deduplicar {
        format!(
            r#"SELECT COUNT(*) FROM (
                SELECT telefone FROM ({base}) AS todos
                WHERE {where_clause}
                AND telefone IS NOT NULL AND TRIM(telefone) != ''
                GROUP BY telefone
            ) AS dedup"#
        )
    } else {
        format!(
            r#"SELECT COUNT(*) FROM ({base}) AS todos WHERE {where_clause}"#
        )
    };

    let mut clientes: Vec<Cliente> = sqlx::query_as(&sql)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

    // Aplica limpeza de nome em Rust após buscar do banco
    for c in &mut clientes {
        let nome_limpo = limpar_nome_str(&c.nome);
        c.nome = if nome_limpo.len() > 2 { nome_limpo } else { c.nome.clone() };
    }

    // Remove registros cujo nome ficou vazio após limpeza
    clientes.retain(|c| c.nome.len() > 2);

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
