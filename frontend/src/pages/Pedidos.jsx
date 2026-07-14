import { useEffect, useState } from 'react';
import { getPedidos } from '../services/api';
import { format } from 'date-fns';

export default function Pedidos() {
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [filtroOrigem, setFiltroOrigem] = useState('');

  useEffect(() => {
    loadPedidos();
  }, [pagination.page, filtroOrigem]);

  async function loadPedidos() {
    try {
      setLoading(true);
      const params = { 
        page: pagination.page, 
        limit: pagination.limit 
      };
      if (filtroOrigem) params.origem = filtroOrigem;

      const response = await getPedidos(params);
      setPedidos(response.data.data || []);
      setPagination(prev => ({ ...prev, ...response.data.pagination }));
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="header">
        <h1>Pedidos</h1>
        <p>Histórico de pedidos e vendas</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Lista de Pedidos</h2>
          <select 
            value={filtroOrigem}
            onChange={(e) => {
              setFiltroOrigem(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            style={{
              padding: '0.625rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              fontSize: '0.875rem'
            }}
          >
            <option value="">Todas as origens</option>
            <option value="ecommerce">E-commerce</option>
            <option value="distribuicao">Distribuição</option>
          </select>
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
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Data</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidos.map((pedido) => (
                      <tr key={pedido.id}>
                        <td>{pedido.id}</td>
                        <td>{pedido.cliente}</td>
                        <td>{pedido.data ? format(new Date(pedido.data), 'dd/MM/yyyy') : '-'}</td>
                        <td>R$ {parseFloat(pedido.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: pedido.status > 0 ? 'rgba(76, 175, 80, 0.1)' : 'rgba(158, 158, 158, 0.1)',
                            color: pedido.status > 0 ? 'var(--success)' : 'var(--gray)'
                          }}>
                            {pedido.status > 0 ? 'Concluído' : 'Pendente'}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: pedido.origem === 'E-commerce' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(156, 39, 176, 0.1)',
                            color: pedido.origem === 'E-commerce' ? 'var(--info)' : 'var(--secondary)'
                          }}>
                            {pedido.origem}
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
                  Página {pagination.page} de {pagination.totalPages}
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
