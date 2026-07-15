import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Users, Database, Download, RefreshCw, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodosClientes } from '../services/api';

const PAGE_SIZE = 200;

export default function Clientes() {
  const [loading,  setLoading]  = useState(true);
  const [erro,     setErro]     = useState(null);
  const [clientes, setClientes] = useState([]);
  const [total,    setTotal]    = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [fonte,    setFonte]    = useState('todas');
  const [fontes,   setFontes]   = useState([]);

  const carregar = useCallback(async (pg = 1, busca = search) => {
    setLoading(true);
    setErro(null);
    try {
      const params = { page: pg, limit: PAGE_SIZE };
      if (busca) params.search = busca;
      const r = await getTodosClientes(params);
      const data = r.data;
      setClientes(data?.clientes || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.pagination?.totalPages || 1);
      setPage(pg);
      // Fontes únicas acumuladas
      if (data?.resumo?.porFonte) {
        setFontes(prev => {
          const set = new Set([...prev, ...Object.keys(data.resumo.porFonte)]);
          return Array.from(set).sort();
        });
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Erro desconhecido';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { carregar(1, ''); }, []);

  function buscar() {
    setSearch(searchInput);
    setFonte('todas');
    carregar(1, searchInput);
  }

  function limparBusca() {
    setSearchInput('');
    setSearch('');
    setFonte('todas');
    carregar(1, '');
  }

  // Filtragem por fonte é local (dentro da página atual)
  const filtrados = useMemo(() => {
    if (fonte === 'todas') return clientes;
    return clientes.filter(c => c.fonte === fonte);
  }, [clientes, fonte]);

  function exportarCSV() {
    const linhas = [
      ['Nome', 'Fonte', 'Email', 'Cidade', 'Estado'].join(','),
      ...filtrados.map(c =>
        [c.nome, c.fonte, c.email || '', c.cidade || '', c.estado || '']
          .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clientes-luna-p${page}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  // ── Loading inicial ───────────────────────────────────────
  if (loading && clientes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--gray)' }}>Buscando clientes em todas as tabelas...</p>
      </div>
    );
  }

  // ── Erro ─────────────────────────────────────────────────
  if (erro && clientes.length === 0) {
    return (
      <div>
        <div className="header"><h1>Clientes</h1></div>
        <div style={{ background: '#fdecea', border: '1px solid #f44336', borderRadius: 8, padding: '1.5rem', display: 'flex', gap: '1rem' }}>
          <AlertCircle size={24} color="#c62828" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#c62828', display: 'block', marginBottom: '0.5rem' }}>Erro ao carregar clientes</strong>
            <code style={{ fontSize: '0.85rem', color: '#c62828' }}>{erro}</code>
            <br />
            <button onClick={() => carregar(1, '')} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Clientes</h1>
        <p>Lista completa de todas as fontes de dados</p>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Users size={28} color="var(--primary)" />
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>
              {total.toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.2rem' }}>Total de clientes</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Database size={28} color="var(--success)" />
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--success)', lineHeight: 1 }}>
              {fontes.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.2rem' }}>Fontes de dados</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Search size={28} color="var(--info)" />
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--info)', lineHeight: 1 }}>
              {filtrados.length.toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.2rem' }}>Nesta página</div>
          </div>
        </div>
      </div>

      <div className="card">
        {/* Toolbar */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Lista Completa</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto', alignItems: 'center' }}>
            {/* Busca com botão */}
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscar()}
                  style={{ paddingLeft: '2.1rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', width: 200 }}
                />
              </div>
              <button onClick={buscar} className="btn btn-primary" style={{ padding: '0.5rem 0.75rem' }}>Buscar</button>
              {search && <button onClick={limparBusca} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>✕</button>}
            </div>

            {/* Filtro fonte (local) */}
            <select value={fonte} onChange={e => setFonte(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', background: 'white' }}>
              <option value="todas">Todas as fontes</option>
              {fontes.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            <button onClick={exportarCSV} className="btn btn-success" disabled={filtrados.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={15} /> CSV
            </button>
            <button onClick={() => carregar(page, search)} className="btn btn-primary" disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={15} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {/* Indicador de carregamento de página */}
          {loading && clientes.length > 0 && (
            <div style={{ padding: '0.5rem 1.25rem', background: '#e3f2fd', fontSize: '0.85rem', color: '#1565c0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Carregando...
            </div>
          )}

          <div className="table-container" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            <table>
              <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 5 }}>
                <tr>
                  <th style={{ width: '32%' }}>Nome</th>
                  <th style={{ width: '26%' }}>Fonte</th>
                  <th style={{ width: '22%' }}>Email</th>
                  <th style={{ width: '12%' }}>Cidade</th>
                  <th style={{ width: '8%'  }}>UF</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray)' }}>
                      {search ? `Nenhum cliente encontrado para "${search}".` : 'Nenhum cliente encontrado.'}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{c.nome}</td>
                      <td>
                        <span style={{
                          padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, display: 'inline-block',
                          background: c.fonte?.includes('Tray') ? 'rgba(76,175,80,0.12)' : 'rgba(33,150,243,0.12)',
                          color:      c.fonte?.includes('Tray') ? '#388e3c'               : '#1565c0',
                        }}>
                          {c.fonte}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--gray)' }}>{c.email  || '—'}</td>
                      <td style={{ fontSize: '0.85rem' }}>{c.cidade || '—'}</td>
                      <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.estado || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação + rodapé */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--gray)' }}>
              Página {page} de {totalPages.toLocaleString('pt-BR')} — {total.toLocaleString('pt-BR')} clientes no total
            </span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={() => carregar(page - 1, search)} disabled={page <= 1 || loading}
                className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center' }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.875rem', minWidth: 80, textAlign: 'center' }}>
                {page} / {totalPages}
              </span>
              <button onClick={() => carregar(page + 1, search)} disabled={page >= totalPages || loading}
                className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center' }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
