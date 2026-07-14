import { NavLink } from 'react-router-dom';
import { Home, Users, ShoppingCart, TrendingUp, FileText } from 'lucide-react';

export default function Layout({ children }) {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ padding: '0 1.5rem 1.5rem' }}>
          <h2 style={{ color: 'var(--primary)', fontSize: '1.5rem', fontWeight: '700' }}>
            Luna Tráfego
          </h2>
          <p style={{ color: 'var(--gray)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Gestão de Marketing
          </p>
        </div>

        <nav>
          <ul className="nav-menu">
            <li className="nav-item">
              <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <Home size={20} />
                <span>Dashboard</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/clientes" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <Users size={20} />
                <span>Clientes</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/pedidos" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <ShoppingCart size={20} />
                <span>Pedidos</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/trafego" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <TrendingUp size={20} />
                <span>Tráfego</span>
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/relatorios" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                <FileText size={20} />
                <span>Relatórios</span>
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
