import { useEffect, useState } from 'react';
import { getRelatorioVendas, getTopClientes } from '../services/api';
import { FileText, Download } from 'lucide-react';

export default function Relatorios() {
  const [loading, setLoading] = useState(true);
  const [vendas, setVendas] = useState([]);
  const [topClientes, setTopClientes] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [vendasRes, topRes] = await Promise.all([
        getRelatorioVendas(),
        getTopClientes(10)
      ]);

      setVendas(vendasRes.data.data || []);
      setTopClientes(topRes.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Relatórios</h1>
        <p>Análises e exportações de dados</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <FileText size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Top 10 Clientes
          </h2>
          <button className="btn btn-primary">
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cliente</th>
                  <th>Total de Pedidos</th>
                  <th>Valor Total</th>
                  <th>Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {topClientes.map((cliente, index) => (
                  <tr key={index}>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{index + 1}</td>
                    <td>{cliente.cliente}</td>
                    <td>{cliente.total_pedidos}</td>
                    <td>R$ {parseFloat(cliente.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>R$ {parseFloat(cliente.ticket_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <FileText size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
            Vendas por Dia
          </h2>
          <button className="btn btn-primary">
            <Download size={16} />
            Exportar CSV
          </button>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Origem</th>
                  <th>Total de Pedidos</th>
                  <th>Valor Total</th>
                  <th>Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {vendas.slice(0, 30).map((venda, index) => (
                  <tr key={index}>
                    <td>{venda.dia}</td>
                    <td>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: venda.origem === 'E-commerce' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(156, 39, 176, 0.1)',
                        color: venda.origem === 'E-commerce' ? 'var(--info)' : 'var(--secondary)'
                      }}>
                        {venda.origem}
                      </span>
                    </td>
                    <td>{venda.total_pedidos}</td>
                    <td>R$ {parseFloat(venda.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>R$ {parseFloat(venda.ticket_medio || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
