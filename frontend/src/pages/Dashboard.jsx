import { useEffect, useState } from 'react';
import { Users, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react';
import { getClienteStats, getPedidoStats, getTopClientes } from '../services/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClientes: 0,
    totalPedidos: 0,
    valorTotal: 0,
    ticketMedio: 0
  });
  const [topClientes, setTopClientes] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      const [clienteRes, pedidoRes, topRes] = await Promise.all([
        getClienteStats(),
        getPedidoStats(),
        getTopClientes(5)
      ]);

      setStats({
        totalClientes: clienteRes.data.totalClientes || 0,
        totalPedidos: pedidoRes.data.stats?.[0]?.total_pedidos || 0,
        valorTotal: pedidoRes.data.stats?.reduce((sum, s) => sum + (s.valor_total || 0), 0) || 0,
        ticketMedio: pedidoRes.data.stats?.[0]?.ticket_medio || 0
      });

      setTopClientes(topRes.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
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
        <h1>Dashboard</h1>
        <p>Visão geral do desempenho</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <h3>Total de Clientes</h3>
            <p>{stats.totalClientes.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <ShoppingCart size={24} />
          </div>
          <div className="stat-content">
            <h3>Total de Pedidos</h3>
            <p>{stats.totalPedidos.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon info">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>Valor Total</h3>
            <p>R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Ticket Médio</h3>
            <p>R$ {stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Top 5 Clientes</h2>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Total de Pedidos</th>
                  <th>Valor Total</th>
                  <th>Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {topClientes.map((cliente, index) => (
                  <tr key={index}>
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
    </div>
  );
}
