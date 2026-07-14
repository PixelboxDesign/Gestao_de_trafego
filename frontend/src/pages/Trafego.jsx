import { useEffect, useState } from 'react';
import { getTrafegoFacebook, getTrafegoInstagram } from '../services/api';
import { TrendingUp, MousePointerClick, Eye, DollarSign } from 'lucide-react';

export default function Trafego() {
  const [loading, setLoading] = useState(true);
  const [facebook, setFacebook] = useState({ data: [], summary: {} });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const fbRes = await getTrafegoFacebook();
      setFacebook(fbRes.data);
    } catch (error) {
      console.error('Erro ao carregar tráfego:', error);
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
        <h1>Tráfego Pago</h1>
        <p>Análise de campanhas de marketing</p>
      </div>

      <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: '600' }}>Facebook Ads</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Eye size={24} />
          </div>
          <div className="stat-content">
            <h3>Impressões</h3>
            <p>{parseInt(facebook.summary.totalImpressions || 0).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon info">
            <MousePointerClick size={24} />
          </div>
          <div className="stat-content">
            <h3>Cliques</h3>
            <p>{parseInt(facebook.summary.totalClicks || 0).toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon warning">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <h3>Investimento</h3>
            <p>R$ {parseFloat(facebook.summary.totalSpend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <h3>Conversões</h3>
            <p>{parseInt(facebook.summary.totalConversions || 0).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Métricas de Performance</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', padding: '1rem' }}>
            <div>
              <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>CTR (Click-Through Rate)</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--primary)' }}>{facebook.summary.ctr}%</p>
            </div>
            <div>
              <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>CPC (Custo por Clique)</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--info)' }}>R$ {facebook.summary.cpc}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Últimas Campanhas</h2>
        </div>
        <div className="card-body">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Anúncio</th>
                  <th>Data</th>
                  <th>Impressões</th>
                  <th>Cliques</th>
                  <th>Gasto</th>
                  <th>Conversões</th>
                </tr>
              </thead>
              <tbody>
                {facebook.data.slice(0, 20).map((ad, index) => (
                  <tr key={index}>
                    <td>{ad.ad_name}</td>
                    <td>{ad.data}</td>
                    <td>{parseInt(ad.impressions || 0).toLocaleString('pt-BR')}</td>
                    <td>{parseInt(ad.clicks || 0).toLocaleString('pt-BR')}</td>
                    <td>R$ {parseFloat(ad.spend || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td>{parseInt(ad.conversions || 0)}</td>
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
