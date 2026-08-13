import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, Handshake, Columns3 } from 'lucide-react';
import { useEffect } from 'react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/organizations', label: 'Organizations', icon: Building2 },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/deals', label: 'Deals', icon: Handshake },
  { to: '/pipeline', label: 'Pipeline', icon: Columns3 },
];

export default function Layout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark">C</span>
          <div>
            <div className="brand-name">Personal CRM</div>
            <div className="brand-tag">Private sales workspace</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">Local · SQLite · v1.0</div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
