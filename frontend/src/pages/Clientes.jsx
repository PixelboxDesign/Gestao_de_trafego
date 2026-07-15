import { useEffect, useState, useMemo } from 'react';
import { Search, Users, Database, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { getTodosClientes } from '../services/api';

export default function Clientes() {
  const [loading,  setLoading]  = useState(true);
  const [erro,     setErro]     = useState(null);
  const [clientes, setClientes] = useState([]);
  const [resumo,   setResumo]   = useState(null);
  const [search,   setSearch]   = useState('');
  const [fonte,    setFonte]    = useState('todas');

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const r = await getTodosClientes();
      setClientes(r.data?.clientes || []);
      setResumo(r.data?.resumo    || null);
    } catch (e) {
      const msg = e.response?.data?.message || e.response?.data?.error || e.message || 'Erro desconhecido';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  }

  // Fontes únicas para o select
  const fontes = useMemo(() => {
    const set = new Set(clientes.map(c => c.fonte).filter(Boolean));
    return Array.from(set).sort();
  }, [clientes]);

  // Filtragem local (dados já estão todos em memória)
  const filtrados = useMemo(() => {
    const s = search.trim().toLowerCase();
    return clientes.filter(c => {
      const matchFonte  = fonte === 'todas' || c.fonte === fonte;
      const matchSearch = !s || (
        (c.nome   || '').toLowerCase().includes(s) ||
        (c.email  || '').toLowerCase().includes(s) ||
        (c.cidade || '').toLowerCase().includes(s)
      );
      return matchFonte && matchSearch;
    });
  }, [clientes, search, fonte]);

  function exportarCSV() {
    const linhas = [
      ['Nome', 'Fonte', 'Email', 'Cidade', 'Estado'].join(','),
      ...filtrados.map(c =>
        [c.nome, c.fonte, c.email || '', c.cidade || '', c.estado || '']
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `clientes-luna-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--gray)' }}>Buscando clientes em todas as tabelas...</p>
      </div>
    );
  }

  // ── Erro ─────────────────────────────────────────────────
  if (erro) {
    return (
      <div>
        <div className="header"><h1>Clientes</h1></div>
        <div style={{ background: '#fdecea', border: '1px solid #f44336', borderRadius: 8, padding: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <AlertCircle size={24} color="#c62828" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: '#c62828', display: 'block', marginBottom: '0.5rem' }}>Erro ao carregar clientes</strong>
            <code style={{ fontSize: '0.85rem', color: '#c62828' }}>{erro}</code>
            <br />
            <button onClick={carregar} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Conteúdo ─────────────────────────────────────────────
  return (
    <div>
      <div className="header">
        <h1>Clientes</h1>
        <p>Lista completa de todas as fontes de dados</p>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Users size={28} color="var(--primary)" />
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>
              {(clientes.length).toLocaleString('pt-BR')}
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
            <div style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: '0.2rem' }}>Filtrados</div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        {/* Barra de ferramentas */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Lista Completa</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
            {/* Busca */}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Nome, email ou cidade..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: '2.1rem', paddingRight: '0.75rem', paddingTop: '0.5rem', paddingBottom: '0.5rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', width: 240 }}
              />
            </div>

            {/* Filtro fonte */}
            <select value={fonte} onChange={e => setFonte(e.target.value)}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.875rem', background: 'white', cursor: 'pointer' }}>
              <option value="todas">Todas as fontes</option>
              {fontes.map(f => <option key={f} value={f}>{f}</option>)}
            </select>

            {/* Exportar */}
            <button onClick={exportarCSV} className="btn btn-success" disabled={filtrados.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Download size={15} /> CSV
            </button>

            {/* Recarregar */}
            <button onClick={carregar} className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <RefreshCw size={15} /> Recarregar
            </button>
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
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
                      {search || fonte !== 'todas' ? 'Nenhum cliente encontrado com os filtros aplicados.' : 'Nenhum cliente encontrado.'}
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

          {/* Rodapé */}
          <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--gray)' }}>
            <span>
              {filtrados.length === clientes.length
                ? `${clientes.length.toLocaleString('pt-BR')} clientes`
                : `${filtrados.length.toLocaleString('pt-BR')} de ${clientes.length.toLocaleString('pt-BR')} clientes`}
            </span>
            <span>{fontes.length} fontes varridas</span>
          </div>
        </div>
      </div>
    </div>
  );
}
