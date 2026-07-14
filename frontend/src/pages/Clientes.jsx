import { useEffect, useState } from 'react';
import { Search, Users, Database, Filter } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://gestao-de-trafego.onrender.com/api';

export default function Clientes() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [clientesFiltrados, setClientesFiltrados] = useState([]);
  const [search, setSearch] = useState('');
  const [fonteFilter, setFonteFilter] = useState('todas');
  const [resumo, setResumo] = useState(null);
  const [fontes, setFontes] = useState([]);

  useEffect(() => {
    loadTodosClientes();
  }, []);

  useEffect(() => {
    filtrarClientes();
  }, [search, fonteFilter, clientes]);

  async function loadTodosClientes() {
    try {
      setLoading(true);
      console.log('🔍 Buscando TODOS os clientes...');
      
      const response = await fetch(`${API_URL}/todos-clientes`);
      const data = await response.json();
      
      console.log(`✅ ${data.total} clientes encontrados!`);
      
      setClientes(data.clientes || []);
      setClientesFiltrados(data.clientes || []);
      setResumo(data.resumo);
      
      // Extrair fontes únicas para filtro
      if (data.resumo && data.resumo.porFonte) {
        setFontes(Object.keys(data.resumo.porFonte));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar clientes:', error);
      alert('Erro ao carregar clientes. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  }

  function filtrarClientes() {
    let resultado = [...clientes];

    // Filtro por busca
    if (search.trim()) {
      resultado = resultado.filter(c => 
        c.nome.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.cidade?.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtro por fonte
    if (fonteFilter !== 'todas') {
      resultado = resultado.filter(c => c.fonte === fonteFilter);
    }

    setClientesFiltrados(resultado);
  }

  function exportarCSV() {
    const csv = [
      ['Nome', 'Fonte', 'Email', 'Telefone', 'Cidade', 'Estado'],
      ...clientesFiltrados.map(c => [
        c.nome,
        c.fonte,
        c.email || '',
        c.telefone || '',
        c.cidade || '',
        c.estado || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-luna-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  return (
    <div>
      <div className="header">
        <h1>📋 Todos os Clientes</h1>
        <p>Lista completa de clientes de TODAS as tabelas (15+ fontes)</p>
      </div>

      {/* Cards de Resumo */}
      {resumo && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem', 
          marginBottom: '1.5rem' 
        }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Users size={32} color="var(--primary)" />
              <div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--primary)' }}>
                  {resumo.totalClientes.toLocaleString('pt-BR')}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>Total de Clientes</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Database size={32} color="var(--success)" />
              <div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>
                  {resumo.fontes}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>Fontes de Dados</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Filter size={32} color="var(--info)" />
              <div>
                <p style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--info)' }}>
                  {clientesFiltrados.length.toLocaleString('pt-BR')}
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>Filtrados</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <h2 className="card-title">Lista Completa</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
            {/* Busca */}
            <div style={{ position: 'relative' }}>
              <Search 
                size={18} 
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)' }} 
              />
              <input
                type="text"
                placeholder="Buscar por nome, email ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  width: '280px'
                }}
              />
            </div>

            {/* Filtro por Fonte */}
            <select
              value={fonteFilter}
              onChange={(e) => setFonteFilter(e.target.value)}
              style={{
                padding: '0.625rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="todas">Todas as Fontes</option>
              {fontes.map(fonte => (
                <option key={fonte} value={fonte}>{fonte}</option>
              ))}
            </select>

            {/* Botão Exportar */}
            <button 
              onClick={exportarCSV} 
              className="btn btn-success"
              disabled={clientesFiltrados.length === 0}
            >
              📥 Exportar CSV
            </button>

            {/* Botão Recarregar */}
            <button 
              onClick={loadTodosClientes} 
              className="btn btn-primary"
              disabled={loading}
            >
              🔄 Recarregar
            </button>
          </div>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading" style={{ padding: '4rem' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '1rem', color: 'var(--gray)' }}>
                Buscando em 15+ tabelas... Isso pode levar alguns segundos.
              </p>
            </div>
          ) : (
            <>
              <div className="table-container" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table>
                  <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
                    <tr>
                      <th style={{ width: '30%' }}>Nome</th>
                      <th style={{ width: '25%' }}>Fonte</th>
                      <th style={{ width: '20%' }}>Email</th>
                      <th style={{ width: '15%' }}>Cidade</th>
                      <th style={{ width: '10%' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray)' }}>
                          {search || fonteFilter !== 'todas' 
                            ? '🔍 Nenhum cliente encontrado com os filtros aplicados' 
                            : '📭 Nenhum cliente encontrado'}
                        </td>
                      </tr>
                    ) : (
                      clientesFiltrados.map((cliente, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: '600' }}>{cliente.nome}</td>
                          <td>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: cliente.fonte.includes('E-commerce') 
                                ? 'rgba(33, 150, 243, 0.1)' 
                                : cliente.fonte.includes('Distribuição')
                                ? 'rgba(156, 39, 176, 0.1)'
                                : 'rgba(76, 175, 80, 0.1)',
                              color: cliente.fonte.includes('E-commerce') 
                                ? 'var(--info)' 
                                : cliente.fonte.includes('Distribuição')
                                ? 'var(--secondary)'
                                : 'var(--success)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '200px',
                              display: 'inline-block'
                            }} title={cliente.fonte}>
                              {cliente.fonte}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>
                            {cliente.email || '—'}
                          </td>
                          <td style={{ fontSize: '0.875rem' }}>{cliente.cidade || '—'}</td>
                          <td style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                            {cliente.estado || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>
                  {clientesFiltrados.length === clientes.length 
                    ? `Mostrando todos os ${clientes.length.toLocaleString('pt-BR')} clientes`
                    : `Mostrando ${clientesFiltrados.length.toLocaleString('pt-BR')} de ${clientes.length.toLocaleString('pt-BR')} clientes`
                  }
                </p>
                
                {resumo && (
                  <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>
                    {resumo.fontes} fontes de dados varridas
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
