import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search, Users, Database, Download, RefreshCw,
  AlertCircle, ChevronLeft, ChevronRight,
  Phone, ShoppingBag, X, Package, Calendar, DollarSign,
} from 'lucide-react';
import { getTodosClientes, getClientePedidos } from '../services/api';

const PAGE_SIZE = 200;

const fmtData  = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtReal  = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtQtd   = (v) => Number(v || 0).toLocaleString('pt-BR');

// ─── Modal de pedidos + produtos ─────────────────────────────────────────────
function ModalPedidos({ cliente, onClose }) {
  const [loading,      setLoading]      = useState(true);
  const [erro,         setErro]         = useState(null);
  const [dados,        setDados]        = useState(null);
  const [pedidoAberto, setPedidoAberto] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErro(null);
      try {
        const r = await getClientePedidos(cliente.nome);
        if (!cancelled) setDados(r.data);
      } catch (e) {
        if (!cancelled) setErro(e.response?.data?.message || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cliente.nome]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff',borderRadius:12,width:'100%',maxWidth:800,maxHeight:'88vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'1rem' }}>
          <div>
            <div style={{ display:'flex',alignItems:'center',gap:'0.6rem',marginBottom:'0.25rem' }}>
              <ShoppingBag size={20} color="var(--primary)" />
              <h2 style={{ margin:0,fontSize:'1.1rem',fontWeight:700 }}>{cliente.nome}</h2>
            </div>
            <div style={{ display:'flex',gap:'1.25rem',fontSize:'0.82rem',color:'var(--gray)' }}>
              {cliente.telefone && <span style={{ display:'flex',alignItems:'center',gap:'0.3rem' }}><Phone size={13} />{cliente.telefone}</span>}
              {cliente.email    && <span>{cliente.email}</span>}
              {cliente.cidade   && <span>{cliente.cidade}{cliente.estado ? ` / ${cliente.estado}` : ''}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',padding:'0.25rem',borderRadius:6,color:'var(--gray)' }} title="Fechar (ESC)">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY:'auto',flex:1,padding:'1rem 1.5rem' }}>
          {loading && <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'3rem',gap:'0.75rem',color:'var(--gray)' }}><div className="spinner" /> Buscando pedidos...</div>}
          {erro    && <div style={{ background:'#fdecea',border:'1px solid #f44336',borderRadius:8,padding:'1rem',color:'#c62828',fontSize:'0.9rem' }}>{erro}</div>}

          {!loading && !erro && dados && (
            <>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'0.75rem',marginBottom:'1.25rem' }}>
                {[
                  { icon:<ShoppingBag size={18}/>, label:'Pedidos',     valor:fmtQtd(dados.totalPedidos),           cor:'var(--primary)' },
                  { icon:<DollarSign  size={18}/>, label:'Total gasto', valor:`R$ ${fmtReal(dados.totalGasto)}`,    cor:'var(--success)' },
                  { icon:<DollarSign  size={18}/>, label:'Ticket médio',valor:`R$ ${fmtReal(dados.ticketMedio)}`,   cor:'var(--info)' },
                ].map((s,i) => (
                  <div key={i} style={{ background:'#f8f9fa',borderRadius:8,padding:'0.85rem 1rem',display:'flex',gap:'0.6rem',alignItems:'center' }}>
                    <span style={{ color:s.cor }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize:'1rem',fontWeight:700,color:s.cor,lineHeight:1 }}>{s.valor}</div>
                      <div style={{ fontSize:'0.75rem',color:'var(--gray)',marginTop:'0.2rem' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {dados.pedidos.length === 0
                ? <p style={{ textAlign:'center',color:'var(--gray)',padding:'2rem' }}>Nenhum pedido encontrado.</p>
                : (
                  <div style={{ display:'flex',flexDirection:'column',gap:'0.6rem' }}>
                    {dados.pedidos.map(pedido => {
                      const chave = `${pedido.origem}-${pedido.pedido_id}`;
                      const aberto = pedidoAberto === chave;
                      return (
                        <div key={chave} style={{ border:'1px solid var(--border)',borderRadius:8,overflow:'hidden' }}>
                          <div onClick={() => setPedidoAberto(aberto ? null : chave)}
                               style={{ display:'grid',gridTemplateColumns:'1fr auto auto auto auto',gap:'1rem',alignItems:'center',padding:'0.75rem 1rem',cursor:'pointer',background:aberto?'#f0f4ff':'#fff' }}>
                            <div style={{ display:'flex',alignItems:'center',gap:'0.5rem' }}>
                              <Package size={15} color="var(--primary)" />
                              <span style={{ fontWeight:600,fontSize:'0.875rem' }}>Pedido #{pedido.pedido_id}</span>
                              <span style={{ padding:'0.15rem 0.5rem',borderRadius:10,fontSize:'0.72rem',fontWeight:600,background:pedido.origem==='E-commerce'?'rgba(33,150,243,0.12)':'rgba(76,175,80,0.12)',color:pedido.origem==='E-commerce'?'#1565c0':'#388e3c' }}>{pedido.origem}</span>
                            </div>
                            <span style={{ fontSize:'0.82rem',color:'var(--gray)',display:'flex',alignItems:'center',gap:'0.3rem' }}><Calendar size={13}/>{fmtData(pedido.pedido_data)}</span>
                            <span style={{ fontSize:'0.82rem',color:'var(--gray)' }}>{pedido.produtos.length} {pedido.produtos.length===1?'produto':'produtos'}</span>
                            <span style={{ fontSize:'0.875rem',fontWeight:700,color:'var(--success)' }}>R$ {fmtReal(pedido.pedido_total)}</span>
                            <span style={{ fontSize:'1rem',color:'var(--gray)',userSelect:'none' }}>{aberto?'▲':'▼'}</span>
                          </div>
                          {aberto && (
                            <div style={{ borderTop:'1px solid var(--border)',background:'#fafafa' }}>
                              <table style={{ width:'100%',fontSize:'0.82rem',borderCollapse:'collapse' }}>
                                <thead>
                                  <tr style={{ background:'#f0f0f0' }}>
                                    <th style={{ padding:'0.5rem 1rem',textAlign:'left',fontWeight:600 }}>Produto</th>
                                    <th style={{ padding:'0.5rem 0.75rem',textAlign:'center',fontWeight:600 }}>Qtd</th>
                                    <th style={{ padding:'0.5rem 0.75rem',textAlign:'right',fontWeight:600 }}>Vlr Unit.</th>
                                    <th style={{ padding:'0.5rem 1rem',textAlign:'right',fontWeight:600 }}>Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pedido.produtos.map((prod,idx) => (
                                    <tr key={idx} style={{ borderTop:'1px solid #eee' }}>
                                      <td style={{ padding:'0.5rem 1rem' }}>
                                        <div style={{ fontWeight:500 }}>{prod.nome}</div>
                                        {prod.codigo && <div style={{ fontSize:'0.75rem',color:'var(--gray)' }}>Cód: {prod.codigo}</div>}
                                      </td>
                                      <td style={{ padding:'0.5rem 0.75rem',textAlign:'center' }}>{fmtQtd(prod.quantidade)}</td>
                                      <td style={{ padding:'0.5rem 0.75rem',textAlign:'right' }}>R$ {fmtReal(prod.valor_unitario)}</td>
                                      <td style={{ padding:'0.5rem 1rem',textAlign:'right',fontWeight:600 }}>R$ {fmtReal(prod.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )
              }
            </>
          )}
        </div>

        <div style={{ padding:'0.85rem 1.5rem',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'flex-end' }}>
          <button onClick={onClose} className="btn btn-secondary">Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Clientes() {
  const [loading,       setLoading]       = useState(true);
  const [erro,          setErro]          = useState(null);
  const [clientes,      setClientes]      = useState([]);
  const [total,         setTotal]         = useState(0);
  const [totalPages,    setTotalPages]    = useState(1);
  const [page,          setPage]          = useState(1);
  const [search,        setSearch]        = useState('');
  const [searchInput,   setSearchInput]   = useState('');
  const [fonte,         setFonte]         = useState('todas');
  const [fontes,        setFontes]        = useState([]);
  const [clienteSel,    setClienteSel]    = useState(null);
  // Checkbox "somente com telefone" — ATIVADO POR PADRÃO
  const [somenteTel,    setSomenteTel]    = useState(true);

  const carregar = useCallback(async (pg = 1, busca = search, apenasTel = somenteTel) => {
    setLoading(true);
    setErro(null);
    try {
      const params = { page: pg, limit: PAGE_SIZE };
      if (busca)    params.search = busca;
      if (apenasTel) params.somente_com_telefone = 'true';
      const r = await getTodosClientes(params);
      const data = r.data;
      setClientes(data?.clientes || []);
      setTotal(data?.total || 0);
      setTotalPages(data?.pagination?.totalPages || 1);
      setPage(pg);
      if (data?.resumo?.porFonte) {
        setFontes(prev => Array.from(new Set([...prev, ...Object.keys(data.resumo.porFonte)])).sort());
      }
    } catch (e) {
      setErro(e.response?.data?.message || e.response?.data?.error || e.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [search, somenteTel]);

  useEffect(() => { carregar(1, '', true); }, []);

  function buscar() {
    setSearch(searchInput);
    setFonte('todas');
    carregar(1, searchInput, somenteTel);
  }

  function limparBusca() {
    setSearchInput('');
    setSearch('');
    setFonte('todas');
    carregar(1, '', somenteTel);
  }

  function toggleSomenteTel() {
    const novo = !somenteTel;
    setSomenteTel(novo);
    setFonte('todas');
    carregar(1, search, novo);
  }

  const filtrados = useMemo(() => {
    if (fonte === 'todas') return clientes;
    return clientes.filter(c => c.fonte === fonte);
  }, [clientes, fonte]);

  function exportarCSV() {
    const linhas = [
      ['Nome', 'Telefone', 'Fonte', 'Email', 'Cidade', 'Estado'].join(','),
      ...filtrados.map(c =>
        [c.nome, c.telefone || '', c.fonte, c.email || '', c.cidade || '', c.estado || '']
          .map(v => `"${String(v || '').replace(/"/g,'""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob(['\uFEFF' + linhas.join('\n')], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clientes-luna-p${page}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  if (loading && clientes.length === 0) {
    return (
      <div style={{ display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:'1rem' }}>
        <div className="spinner" />
        <p style={{ color:'var(--gray)' }}>Buscando clientes{somenteTel ? ' com telefone' : ''}...</p>
      </div>
    );
  }

  if (erro && clientes.length === 0) {
    return (
      <div>
        <div className="header"><h1>Clientes</h1></div>
        <div style={{ background:'#fdecea',border:'1px solid #f44336',borderRadius:8,padding:'1.5rem',display:'flex',gap:'1rem' }}>
          <AlertCircle size={24} color="#c62828" style={{ flexShrink:0 }} />
          <div>
            <strong style={{ color:'#c62828',display:'block',marginBottom:'0.5rem' }}>Erro ao carregar clientes</strong>
            <code style={{ fontSize:'0.85rem',color:'#c62828' }}>{erro}</code>
            <br />
            <button onClick={() => carregar(1,'',somenteTel)} className="btn btn-primary" style={{ marginTop:'1rem' }}>Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {clienteSel && <ModalPedidos cliente={clienteSel} onClose={() => setClienteSel(null)} />}

      <div>
        <div className="header">
          <h1>Clientes</h1>
          <p>Clique em um cliente para ver pedidos e produtos</p>
        </div>

        {/* Cards de resumo */}
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'1rem',marginBottom:'1.5rem' }}>
          <div className="card" style={{ padding:'1.25rem',display:'flex',alignItems:'center',gap:'1rem' }}>
            <Users size={28} color="var(--primary)" />
            <div>
              <div style={{ fontSize:'1.75rem',fontWeight:700,color:'var(--primary)',lineHeight:1 }}>{total.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize:'0.8rem',color:'var(--gray)',marginTop:'0.2rem' }}>{somenteTel ? 'Clientes com telefone' : 'Total de clientes'}</div>
            </div>
          </div>
          <div className="card" style={{ padding:'1.25rem',display:'flex',alignItems:'center',gap:'1rem' }}>
            <Database size={28} color="var(--success)" />
            <div>
              <div style={{ fontSize:'1.75rem',fontWeight:700,color:'var(--success)',lineHeight:1 }}>{fontes.length}</div>
              <div style={{ fontSize:'0.8rem',color:'var(--gray)',marginTop:'0.2rem' }}>Fontes de dados</div>
            </div>
          </div>
          <div className="card" style={{ padding:'1.25rem',display:'flex',alignItems:'center',gap:'1rem' }}>
            <Phone size={28} color="var(--info)" />
            <div>
              <div style={{ fontSize:'1.75rem',fontWeight:700,color:'var(--info)',lineHeight:1 }}>{filtrados.length.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize:'0.8rem',color:'var(--gray)',marginTop:'0.2rem' }}>Nesta página</div>
            </div>
          </div>
        </div>

        <div className="card">
          {/* Toolbar */}
          <div className="card-header" style={{ flexWrap:'wrap',gap:'0.75rem' }}>
            <h2 className="card-title" style={{ margin:0 }}>Lista de Clientes</h2>
            <div style={{ display:'flex',gap:'0.5rem',flexWrap:'wrap',marginLeft:'auto',alignItems:'center' }}>

              {/* ── Checkbox somente com telefone ── */}
              <label style={{ display:'flex',alignItems:'center',gap:'0.5rem',cursor:'pointer',
                              padding:'0.45rem 0.85rem',borderRadius:8,userSelect:'none',
                              border:`2px solid ${somenteTel ? 'var(--success)' : 'var(--border)'}`,
                              background: somenteTel ? 'rgba(76,175,80,0.08)' : 'white',
                              transition:'all 0.15s' }}>
                <input
                  type="checkbox"
                  checked={somenteTel}
                  onChange={toggleSomenteTel}
                  style={{ width:16,height:16,cursor:'pointer',accentColor:'var(--success)' }}
                />
                <Phone size={14} color={somenteTel ? 'var(--success)' : 'var(--gray)'} />
                <span style={{ fontSize:'0.85rem',fontWeight:600,color: somenteTel ? 'var(--success)' : 'var(--gray)' }}>
                  Somente com telefone
                </span>
              </label>

              {/* Busca */}
              <div style={{ display:'flex',gap:'0.25rem' }}>
                <div style={{ position:'relative' }}>
                  <Search size={16} style={{ position:'absolute',left:'0.65rem',top:'50%',transform:'translateY(-50%)',color:'var(--gray)',pointerEvents:'none' }} />
                  <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && buscar()}
                    style={{ paddingLeft:'2.1rem',paddingRight:'0.75rem',paddingTop:'0.5rem',paddingBottom:'0.5rem',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.875rem',width:200 }}
                  />
                </div>
                <button onClick={buscar} className="btn btn-primary" style={{ padding:'0.5rem 0.75rem' }}>Buscar</button>
                {search && <button onClick={limparBusca} className="btn btn-secondary" style={{ padding:'0.5rem 0.75rem' }}>✕</button>}
              </div>

              {/* Filtro fonte */}
              <select value={fonte} onChange={e => setFonte(e.target.value)}
                style={{ padding:'0.5rem 0.75rem',border:'1px solid var(--border)',borderRadius:8,fontSize:'0.875rem',background:'white' }}>
                <option value="todas">Todas as fontes</option>
                {fontes.map(f => <option key={f} value={f}>{f}</option>)}
              </select>

              {/* CSV */}
              <button onClick={exportarCSV} className="btn btn-success" disabled={filtrados.length===0}
                style={{ display:'flex',alignItems:'center',gap:'0.4rem' }}>
                <Download size={15} /> CSV
              </button>

              {/* Recarregar */}
              <button onClick={() => carregar(page, search, somenteTel)} className="btn btn-primary" disabled={loading}
                style={{ display:'flex',alignItems:'center',gap:'0.4rem' }}>
                <RefreshCw size={15} style={loading ? { animation:'spin 1s linear infinite' } : {}} />
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding:0 }}>
            {loading && clientes.length > 0 && (
              <div style={{ padding:'0.5rem 1.25rem',background:'#e3f2fd',fontSize:'0.85rem',color:'#1565c0',display:'flex',alignItems:'center',gap:'0.5rem' }}>
                <div className="spinner" style={{ width:16,height:16,borderWidth:2 }} /> Carregando...
              </div>
            )}

            <div className="table-container" style={{ maxHeight:'60vh',overflowY:'auto' }}>
              <table>
                <thead style={{ position:'sticky',top:0,background:'#fff',zIndex:5 }}>
                  <tr>
                    <th style={{ width:'28%' }}>Nome</th>
                    <th style={{ width:'13%' }}>Telefone</th>
                    <th style={{ width:'22%' }}>Fonte</th>
                    <th style={{ width:'20%' }}>Email</th>
                    <th style={{ width:'11%' }}>Cidade</th>
                    <th style={{ width:'6%'  }}>UF</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign:'center',padding:'3rem',color:'var(--gray)' }}>
                        {search
                          ? `Nenhum cliente encontrado para "${search}".`
                          : somenteTel
                            ? 'Nenhum cliente com telefone encontrado.'
                            : 'Nenhum cliente encontrado.'}
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((c, i) => (
                      <tr key={i} onClick={() => setClienteSel(c)} style={{ cursor:'pointer' }} title="Clique para ver pedidos">
                        <td style={{ fontWeight:600 }}>
                          <span style={{ display:'flex',alignItems:'center',gap:'0.4rem' }}>
                            {c.nome}
                            <ShoppingBag size={13} color="var(--primary)" style={{ opacity:0.45,flexShrink:0 }} />
                          </span>
                        </td>
                        <td style={{ fontSize:'0.85rem' }}>
                          {c.telefone
                            ? <span style={{ display:'flex',alignItems:'center',gap:'0.3rem',color:'var(--success)',fontWeight:600 }}>
                                <Phone size={13} />{c.telefone}
                              </span>
                            : <span style={{ color:'var(--gray)' }}>—</span>
                          }
                        </td>
                        <td>
                          <span style={{
                            padding:'0.2rem 0.6rem',borderRadius:12,fontSize:'0.75rem',fontWeight:600,display:'inline-block',
                            background:c.fonte?.includes('Tray')?'rgba(76,175,80,0.12)':'rgba(33,150,243,0.12)',
                            color:c.fonte?.includes('Tray')?'#388e3c':'#1565c0',
                          }}>
                            {c.fonte}
                          </span>
                        </td>
                        <td style={{ fontSize:'0.85rem',color:'var(--gray)' }}>{c.email  || '—'}</td>
                        <td style={{ fontSize:'0.85rem' }}>{c.cidade || '—'}</td>
                        <td style={{ fontSize:'0.85rem',fontWeight:600 }}>{c.estado || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div style={{ padding:'0.75rem 1.25rem',borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'0.5rem' }}>
              <span style={{ fontSize:'0.82rem',color:'var(--gray)' }}>
                Página {page} de {totalPages.toLocaleString('pt-BR')} — {total.toLocaleString('pt-BR')} {somenteTel ? 'clientes com telefone' : 'clientes'}
              </span>
              <div style={{ display:'flex',gap:'0.5rem',alignItems:'center' }}>
                <button onClick={() => carregar(page-1, search, somenteTel)} disabled={page<=1 || loading}
                  className="btn btn-secondary" style={{ padding:'0.4rem 0.75rem',display:'flex',alignItems:'center' }}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize:'0.875rem',minWidth:80,textAlign:'center' }}>{page} / {totalPages}</span>
                <button onClick={() => carregar(page+1, search, somenteTel)} disabled={page>=totalPages || loading}
                  className="btn btn-secondary" style={{ padding:'0.4rem 0.75rem',display:'flex',alignItems:'center' }}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
