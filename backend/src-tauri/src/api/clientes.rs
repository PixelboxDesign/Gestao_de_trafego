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

// Limpa o nome do cliente removendo lixo comum nos dados brutos
fn limpar_nome_str(nome: &str) -> String {
    let s = nome.trim();

    // Remove HTML entities (&#XXXXX; ou &amp; etc)
    if s.contains("&#") || s.contains("&amp;") || s.contains("&lt;") {
        return String::new();
    }

    // Remove se parece telefone (só tem números, parênteses, traços, espaços)
    let sem_fmt: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
    if sem_fmt.len() >= 8 && sem_fmt.len() == s.chars().filter(|c| c.is_ascii_digit() || *c == ' ' || *c == '-' || *c == '(' || *c == ')' || *c == '+').count() {
        return String::new();
    }

    // Remove lixo no início: pontos, vírgulas, underscores, aspas, >
    let s = s.trim_start_matches(|c: char| matches!(c, '.' | ',' | '_' | '"' | '\'' | '>' | '?' | '!' | ';'));
    let s = s.trim();

    // Se começa com número: tenta extrair apenas a parte do nome
    // Padrões: "12345678 Nome", "12.345.678 Nome", "12345678/Nome", "12345678000141Nome"
    let resultado = if s.chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false) {
        // Encontra onde começa a parte alfabética
        let pos = s.find(|c: char| c.is_alphabetic());
        match pos {
            Some(p) if p > 0 => {
                let antes = &s[..p];
                // Só remove o prefixo se for claramente um número/CPF/CNPJ (sem letras)
                if !antes.chars().any(|c| c.is_alphabetic()) {
                    s[p..].trim_start_matches(|c: char| matches!(c, ' ' | '/' | '-' | '.'))
                } else {
                    s
                }
            }
            _ => s,
        }
    } else {
        s
    };

    // Remove sufixo numérico: " 114.688.616-03" no fim
    let resultado = {
        let partes: Vec<&str> = resultado.rsplitn(2, ' ').collect();
        if partes.len() == 2 {
            let sufixo = partes[0];
            let sufixo_limpo: String = sufixo.chars().filter(|c| c.is_ascii_digit()).collect();
            // Se o sufixo tem mais de 6 dígitos e sem letras → é CPF/número → remove
            if sufixo_limpo.len() >= 6 && !sufixo.chars().any(|c| c.is_alphabetic()) {
                partes[1]
            } else {
                resultado
            }
        } else {
            resultado
        }
    };

    // Remove conteúdo entre parênteses no fim: "Nome (codigo123)"
    let resultado = if let Some(p) = resultado.rfind('(') {
        let parte = resultado[p..].trim();
        // Só remove se o conteúdo parecer código (não nome real)
        let dentro: &str = parte.trim_start_matches('(').trim_end_matches(')');
        let tem_letra = dentro.chars().any(|c| c.is_alphabetic());
        let tem_numero = dentro.chars().any(|c| c.is_ascii_digit());
        if tem_numero && (!tem_letra || dentro.len() < 6) {
            resultado[..p].trim()
        } else {
            resultado
        }
    } else {
        resultado
    };

    // Garante primeira letra maiúscula se tudo maiúsculo
    let resultado = resultado.trim().to_string();
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

    // Query de dados
    let sql = format!(
        r#"SELECT nome, telefone, estado as uf, cidade, email, fonte
           FROM ({base}) AS todos
           WHERE {where_clause}
           ORDER BY nome ASC
           LIMIT {limit} OFFSET {offset}"#
    );

    // Query de count
    let count_sql = format!(
        r#"SELECT COUNT(*) FROM ({base}) AS todos WHERE {where_clause}"#
    );

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
