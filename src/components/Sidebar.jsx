import { NavLink } from 'react-router-dom';
import client from '../api/client';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/tracks', label: 'Tracks', icon: '🎵' },
  { to: '/reciters', label: 'Reciters', icon: '🎤' },
  { to: '/anjumans', label: 'Anjumans', icon: '🕌' },
  { to: '/users', label: 'Users', icon: '👥' },
];

export default function Sidebar() {
  const handleLogout = async () => {
    try { await client.post('/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <span style={styles.brandIcon}>🕌</span>
        <div>
          <div style={styles.brandTitle}>Karbala Connect</div>
          <div style={styles.brandSub}>Admin Panel</div>
        </div>
      </div>

      <nav style={styles.nav}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              ...styles.navItem,
              background: isActive ? 'var(--bg-light)' : 'transparent',
              color: isActive ? 'var(--gold)' : 'var(--grey)',
              borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
            })}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button onClick={handleLogout} style={styles.logoutBtn}>
        🚪 Logout
      </button>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    background: 'var(--bg-card)',
    borderRight: '1px solid #2A1200',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    position: 'fixed',
    top: 0,
    left: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 16px',
    borderBottom: '1px solid #2A1200',
  },
  brandIcon: { fontSize: 28 },
  brandTitle: { color: 'var(--gold)', fontWeight: 700, fontSize: 13 },
  brandSub: { color: 'var(--grey)', fontSize: 11 },
  nav: { flex: 1, padding: '12px 0' },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '11px 16px',
    fontSize: 14,
    transition: 'all 0.15s',
  },
  logoutBtn: {
    margin: 12,
    padding: '10px 16px',
    background: 'transparent',
    color: 'var(--red)',
    border: '1px solid var(--red)',
    borderRadius: 8,
    fontSize: 13,
    textAlign: 'left',
  },
};
