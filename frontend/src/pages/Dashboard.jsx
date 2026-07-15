import { useEffect, useState } from 'react';
import { Users, ShoppingCart, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { getClienteStats, getPedidoStats, getTopClientes } from '../services/api';

const fmt  = (n) => Number(n || 0).toLocaleString('pt-BR');
const fmtR = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard() {
  const [loading, setLoading]   = useState(true);
  const [erros,   setErros]     = useState([]);
  const [stats,   setStats]     = useState({ totalClientes: 0, totalPedidos: 0, valorTotal: 0, ticketMedio: 0 });
  const [topClientes, setTopClientes] = useState([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setErros([]);
    const novosErros = [];

    // Cada endpoint independente — falha individual não bloqueia os outros
    let totalClientes = 0;
    try {
      const r = await getClienteStats();
      totalClientes = r.data?.totalClientes || 0;
    } catch (e) {
      novosErros.push(`Clientes: ${e.response?.data?.message || e.message}`);
    }

    let totalPedidos = 0, valorTotal = 0, ticketMedio = 0;
    try {
      const r = await getPedidoStats();
      const s = r.data?.stats || [];
      totalPedidos = s.reduce((acc, x) => acc + Number(x.total_pedidos || 0), 0);
      valorTotal   = s.reduce((acc, x) => acc + Number(x.valor_total   || 0), 0);
      ticketMedio  = totalPedidos > 0 ? valorTotal / totalPedidos : 0;
    } catch (e) {
      novosErros.push(`Pedidos: ${e.response?.data?.message || e.message}`);
    }

    let top = [];
    try {
      const r = await getTopClientes(5);
      top = r.data?.data || [];
    } catch (e) {
      novosErros.push(`Top clientes: ${e.response?.data?.message || e.message}`);
    }

    setStats({ totalClientes, totalPedidos, valorTotal, ticketMedio });
    setTopClientes(top);
    setErros(novosErros);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
        <div className="spinner" />
        <p style={{ color: 'var(--gray)' }}>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h1>Dashboard</h1>
        <p>Visão geral do desempenho</p>
      </div>

      {/* Erros não-críticos */}
      {erros.length > 0 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
          <AlertCircle size={18} color="#856404" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong style={{ color: '#856404' }}>Alguns dados não carregaram:</strong>
            <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.25rem', color: '#856404', fontSize: '0.85rem' }}>
              {erros.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Cards de stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary"><Users size={24} /></div>
          <div className="stat-content">
            <h3>Total de Clientes</h3>
            <p>{fmt(stats.totalClientes)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success"><ShoppingCart size={24} /></div>
          <div className="stat-content">
            <h3>Total de Pedidos</h3>
            <p>{fmt(stats.totalPedidos)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon info"><DollarSign size={24} /></div>
          <div className="stat-content">
            <h3>Valor Total</h3>
            <p>R$ {fmtR(stats.valorTotal)}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning"><TrendingUp size={24} /></div>
          <div className="stat-content">
            <h3>Ticket Médio</h3>
            <p>R$ {fmtR(stats.ticketMedio)}</p>
          </div>
        </div>
      </div>

      {/* Top clientes */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Top 5 Clientes por Valor</h2>
          <button onClick={loadData} className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}>
            🔄 Atualizar
          </button>
        </div>
        <div className="card-body">
          {topClientes.length === 0 ? (
            <p style={{ color: 'var(--gray)', textAlign: 'center', padding: '2rem' }}>Nenhum dado disponível</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Cliente</th>
                    <th>Pedidos</th>
                    <th>Valor Total</th>
                    <th>Ticket Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {topClientes.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{c.cliente}</td>
                      <td>{fmt(c.total_pedidos)}</td>
                      <td>R$ {fmtR(c.valor_total)}</td>
                      <td>R$ {fmtR(c.ticket_medio)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
