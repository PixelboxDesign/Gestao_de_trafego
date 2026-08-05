import { useEffect, useState, useCallback } from "react";

interface Cliente {
  nome: string;
  telefone: string | null;
  uf: string | null;
  cidade: string | null;
  email: string | null;
  fonte: string | null;
}

interface ClientesResponse {
  data: Cliente[];
  total: number;
  page: number;
  limit: number;
}

const API = "http://localhost:3001";

// Detecta a porta correta tentando 3001, 3002, 3003...
async function detectarPorta(): Promise<string> {
  for (const port of [3001, 3002, 3003, 3004]) {
    try {
      const res = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(500) });
      if (res.ok) return `http://localhost:${port}`;
    } catch { /* porta não disponível */ }
  }
  return API; // fallback
}

export default function AbaClientes() {
  const [clientes, setClientes]       = useState<Cliente[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [somenteTel, setSomenteTel]   = useState(false);
  const [deduplicar, setDeduplicar]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [apiBase, setApiBase]         = useState(API);

  // Filtros dropdown
  const [uf, setUf]         = useState("");
  const [cidade, setCidade] = useState("");
  const [fonte, setFonte]   = useState("");

  // Opções dos dropdowns
  const [ufs, setUfs]         = useState<string[]>([]);
  const [cidades, setCidades] = useState<string[]>([]);
  const [fontes, setFontes]   = useState<string[]>([]);

  const LIMIT = 100;

  // Detecta porta e carrega dropdowns
  useEffect(() => {
    detectarPorta().then(base => {
      setApiBase(base);
      fetch(`${base}/api/clientes/filtros/ufs`).then(r => r.json()).then(setUfs).catch(() => {});
      fetch(`${base}/api/clientes/filtros/cidades`).then(r => r.json()).then(setCidades).catch(() => {});
      fetch(`${base}/api/clientes/filtros/fontes`).then(r => r.json()).then(setFontes).catch(() => {});
      // carrega clientes iniciais
      carregarComBase(base, 1, "", false, "", "", "", false);
    });
  }, []);

  const carregarComBase = useCallback(async (
    base: string,
    pg: number,
    busca: string,
    apenasTel: boolean,
    ufFiltro: string,
    cidadeFiltro: string,
    fonteFiltro: string,
    dedup: boolean,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pg), limit: String(LIMIT) });
      if (busca)        params.set("search", busca);
      if (apenasTel)    params.set("somente_com_telefone", "true");
      if (ufFiltro)     params.set("uf", ufFiltro);
      if (cidadeFiltro) params.set("cidade", cidadeFiltro);
      if (fonteFiltro)  params.set("fonte", fonteFiltro);
      if (dedup)        params.set("deduplicar", "true");

      const res = await fetch(`${base}/api/clientes?${params}`);
      const json: ClientesResponse = await res.json();
      setClientes(json.data);
      setTotal(json.total);
      setPage(pg);
    } catch (e) {
      console.error("Erro ao carregar clientes:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const carregar = useCallback((
    pg = 1,
    busca = search,
    apenasTel = somenteTel,
    ufFiltro = uf,
    cidadeFiltro = cidade,
    fonteFiltro = fonte,
    dedup = deduplicar,
  ) => {
    carregarComBase(apiBase, pg, busca, apenasTel, ufFiltro, cidadeFiltro, fonteFiltro, dedup);
  }, [apiBase, search, somenteTel, uf, cidade, fonte, deduplicar, carregarComBase]);

  function buscar() {
    setSearch(searchInput);
    carregar(1, searchInput, somenteTel, uf, cidade, fonte, deduplicar);
  }

  const totalPages = Math.ceil(total / LIMIT);

  const selectStyle: React.CSSProperties = {
    background: "var(--bg3)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    color: "var(--text)",
    fontSize: 12,
    padding: "0.45rem 0.6rem",
    outline: "none",
    cursor: "pointer",
    minWidth: 120,
  };

  return (
    <>
      {/* Toolbar linha 1: busca + checkbox */}
      <div className="toolbar">
        <input
          className="input"
          placeholder="Buscar por nome..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && buscar()}
          style={{ width: 220 }}
        />
        <button className="btn btn-primary" onClick={buscar}>Buscar</button>
        {search && (
          <button className="btn btn-secondary" onClick={() => {
            setSearchInput(""); setSearch("");
            carregar(1, "", somenteTel, uf, cidade, fonte, deduplicar);
          }}>✕</button>
        )}

        <label style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          padding: "4px 10px", borderRadius: 6,
          border: `1px solid ${somenteTel ? "var(--success)" : "var(--border)"}`,
          background: somenteTel ? "rgba(34,197,94,0.08)" : "transparent",
          color: somenteTel ? "var(--success)" : "var(--text2)", fontSize: 12, fontWeight: 600,
        }}>
          <input type="checkbox" checked={somenteTel}
            onChange={e => { setSomenteTel(e.target.checked); carregar(1, search, e.target.checked, uf, cidade, fonte, deduplicar); }}
            style={{ accentColor: "var(--success)" }} />
          📞 Com telefone
        </label>

        <label style={{
          display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          padding: "4px 10px", borderRadius: 6,
          border: `1px solid ${deduplicar ? "var(--warning)" : "var(--border)"}`,
          background: deduplicar ? "rgba(245,158,11,0.08)" : "transparent",
          color: deduplicar ? "var(--warning)" : "var(--text2)", fontSize: 12, fontWeight: 600,
        }}>
          <input type="checkbox" checked={deduplicar}
            onChange={e => {
              const val = e.target.checked;
              setDeduplicar(val);
              // deduplicar implica ter telefone
              if (val) setSomenteTel(true);
              carregar(1, search, val ? true : somenteTel, uf, cidade, fonte, val);
            }}
            style={{ accentColor: "var(--warning)" }} />
          🔀 Sem duplicatas
        </label>

        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text2)" }}>
          {loading ? "Carregando..." : `${total.toLocaleString("pt-BR")} clientes`}
        </span>
      </div>

      {/* Toolbar linha 2: dropdowns */}
      <div className="toolbar" style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem", gap: "0.75rem" }}>
        {/* UF */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>UF</span>
          <select style={selectStyle} value={uf} onChange={e => {
            setUf(e.target.value);
            carregar(1, search, somenteTel, e.target.value, cidade, fonte, deduplicar);
          }}>
            <option value="">Todos</option>
            {ufs.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {/* Cidade */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Cidade</span>
          <select style={{ ...selectStyle, minWidth: 180 }} value={cidade} onChange={e => {
            setCidade(e.target.value);
            carregar(1, search, somenteTel, uf, e.target.value, fonte, deduplicar);
          }}>
            <option value="">Todas</option>
            {cidades.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Fonte */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text2)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fonte</span>
          <select style={selectStyle} value={fonte} onChange={e => {
            setFonte(e.target.value);
            carregar(1, search, somenteTel, uf, cidade, e.target.value, deduplicar);
          }}>
            <option value="">Todas</option>
            {fontes.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* Limpar filtros */}
        {(uf || cidade || fonte) && (
          <button className="btn btn-secondary" style={{ marginLeft: "auto" }} onClick={() => {
            setUf(""); setCidade(""); setFonte("");
            carregar(1, search, somenteTel, "", "", "", deduplicar);
          }}>
            ✕ Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Telefone</th>
              <th>UF</th>
              <th>Cidade</th>
              <th>E-mail</th>
              <th>Fonte</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "var(--text2)" }}>
                {loading ? "Carregando..." : "Nenhum cliente encontrado"}
              </td></tr>
            ) : clientes.map((c, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{c.nome}</td>
                <td style={{ color: c.telefone ? "var(--success)" : "var(--text2)", fontWeight: c.telefone ? 600 : 400 }}>
                  {c.telefone || "—"}
                </td>
                <td>{c.uf || "—"}</td>
                <td>{c.cidade || "—"}</td>
                <td style={{ color: "var(--text2)", fontSize: 11 }}>{c.email || "—"}</td>
                <td>
                  <span className="badge badge-info" style={{ fontSize: 10 }}>{c.fonte || "—"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "0.5rem", background: "var(--bg2)", flexShrink: 0 }}>
        <button className="btn btn-secondary" onClick={() => carregar(1, search, somenteTel, uf, cidade, fonte, deduplicar)} disabled={page <= 1 || loading}>«</button>
        <button className="btn btn-secondary" onClick={() => carregar(page - 1, search, somenteTel, uf, cidade, fonte, deduplicar)} disabled={page <= 1 || loading}>‹</button>
        <span style={{ fontSize: 12, color: "var(--text2)", minWidth: 100, textAlign: "center" }}>{page} / {totalPages || 1}</span>
        <button className="btn btn-secondary" onClick={() => carregar(page + 1, search, somenteTel, uf, cidade, fonte, deduplicar)} disabled={page >= totalPages || loading}>›</button>
        <button className="btn btn-secondary" onClick={() => carregar(totalPages, search, somenteTel, uf, cidade, fonte, deduplicar)} disabled={page >= totalPages || loading}>»</button>
      </div>
    </>
  );
}
