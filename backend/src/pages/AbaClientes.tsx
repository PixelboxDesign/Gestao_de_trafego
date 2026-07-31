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

export default function AbaClientes() {
  const [clientes, setClientes]     = useState<Cliente[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [somenteTel, setSomenteTel] = useState(false);
  const [uf, setUf]                 = useState("");
  const [loading, setLoading]       = useState(false);

  const LIMIT = 100;

  const carregar = useCallback(async (pg = 1, busca = search, apenasTel = somenteTel, ufFiltro = uf) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pg),
        limit: String(LIMIT),
      });
      if (busca) params.set("search", busca);
      if (apenasTel) params.set("somente_com_telefone", "true");
      if (ufFiltro) params.set("uf", ufFiltro);

      const res = await fetch(`${API}/api/clientes?${params}`);
      const json: ClientesResponse = await res.json();
      setClientes(json.data);
      setTotal(json.total);
      setPage(pg);
    } catch (e) {
      console.error("Erro ao carregar clientes:", e);
    } finally {
      setLoading(false);
    }
  }, [search, somenteTel, uf]);

  useEffect(() => { carregar(1, "", false, ""); }, []);

  function buscar() {
    setSearch(searchInput);
    carregar(1, searchInput, somenteTel, uf);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      {/* Toolbar */}
      <div className="toolbar">
        {/* Busca */}
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
          <button className="btn btn-secondary" onClick={() => { setSearchInput(""); setSearch(""); carregar(1, "", somenteTel, uf); }}>✕</button>
        )}

        {/* Filtro UF */}
        <input
          className="input"
          placeholder="UF (ex: BA)"
          value={uf}
          onChange={e => { setUf(e.target.value.toUpperCase()); carregar(1, search, somenteTel, e.target.value.toUpperCase()); }}
          style={{ width: 70 }}
        />

        {/* Checkbox telefone */}
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
          padding: "4px 10px", borderRadius: 6,
          border: `1px solid ${somenteTel ? "var(--success)" : "var(--border)"}`,
          background: somenteTel ? "rgba(34,197,94,0.08)" : "transparent",
          color: somenteTel ? "var(--success)" : "var(--text2)", fontSize: 12, fontWeight: 600 }}>
          <input type="checkbox" checked={somenteTel} onChange={e => { setSomenteTel(e.target.checked); carregar(1, search, e.target.checked, uf); }} style={{ accentColor: "var(--success)" }} />
          📞 Com telefone
        </label>

        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text2)" }}>
          {loading ? "Carregando..." : `${total.toLocaleString("pt-BR")} clientes`}
        </span>
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
        <button className="btn btn-secondary" onClick={() => carregar(1, search, somenteTel, uf)} disabled={page <= 1 || loading}>«</button>
        <button className="btn btn-secondary" onClick={() => carregar(page - 1, search, somenteTel, uf)} disabled={page <= 1 || loading}>‹</button>
        <span style={{ fontSize: 12, color: "var(--text2)", minWidth: 100, textAlign: "center" }}>{page} / {totalPages || 1}</span>
        <button className="btn btn-secondary" onClick={() => carregar(page + 1, search, somenteTel, uf)} disabled={page >= totalPages || loading}>›</button>
        <button className="btn btn-secondary" onClick={() => carregar(totalPages, search, somenteTel, uf)} disabled={page >= totalPages || loading}>»</button>
      </div>
    </>
  );
}
