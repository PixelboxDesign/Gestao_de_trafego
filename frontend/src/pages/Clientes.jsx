import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { getClientes } from '../services/api';

export default function Clientes() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  useEffect(() => {
    loadClientes();
  }, [pagination.page, search]);

  async function loadClientes() {
    try {
      setLoading(true);
      const response = await getClientes({ 
        page: pagination.page, 
        limit: pagination.limit,
        search 
      });
      
      setClientes(response.data.data || []);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    loadClientes();
  }

  return (
    <div>
      <div className="header">
        <h1>Clientes</h1>
        <p>Gestão de clientes e histórico</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Lista de Clientes</h2>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Search 
                size={18} 
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray)' }} 
              />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  width: '250px'
                }}
              />
            </div>
            <button type="submit" className="btn btn-primary">Buscar</button>
          </form>
        </div>

        <div className="card-body">
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((cliente, index) => (
                      <tr key={index}>
                        <td>{cliente.nome}</td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: cliente.fonte.includes('E-commerce') ? 'rgba(33, 150, 243, 0.1)' : 'rgba(156, 39, 176, 0.1)',
                            color: cliente.fonte.includes('E-commerce') ? 'var(--info)' : 'var(--secondary)'
                          }}>
                            {cliente.fonte}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ 
                marginTop: '1.5rem', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '1rem',
                borderTop: '1px solid var(--border)'
              }}>
                <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} clientes
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary"
                    disabled={pagination.page === 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  >
                    Anterior
                  </button>
                  <button 
                    className="btn btn-secondary"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
