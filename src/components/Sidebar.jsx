import { NavLink } from 'react-router-dom';
import client from '../api/client';

const NAV = [
  {
    to: '/', label: 'Dashboard',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  },
  {
    to: '/tracks', label: 'Tracks',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 9V3M12 21v-6M9 12H3M21 12h-6"/></svg>,
  },
  {
    to: '/reciters', label: 'Reciters',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>,
  },
  {
    to: '/anjumans', label: 'Anjumans',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 22h18M9 22V8l3-6 3 6v14M5 22V12l-2-2M19 22V12l2-2"/><line x1="9" y1="11" x2="15" y2="11"/></svg>,
  },
  {
    to: '/users', label: 'Users',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    to: '/messages', label: 'Messages',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const handleLogout = async () => {
    try { await client.post('/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
  };

  return (
    <>
      <style>{`
        #kc-sidebar {
          width: var(--sidebar-width);
          background: var(--bg-card);
          border-right: 1px solid var(--divider);
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-height: 100vh;
          position: fixed;
          top: 0; left: 0;
          z-index: 100;
          overflow: hidden;
          transition: transform .25s cubic-bezier(.4,0,.2,1);
        }
        #kc-sidebar .sidebar-brand,
        #kc-sidebar .sidebar-footer {
          flex-shrink: 0;
        }
        #kc-sidebar .sidebar-nav {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          overflow-x: hidden;
          -webkit-overflow-scrolling: touch;
        }
        #kc-sidebar .close-btn { display: none; }
        @media (max-width: 768px) {
          #kc-sidebar { width: 260px; transform: translateX(-100%); }
          #kc-sidebar.open { transform: translateX(0); }
          #kc-sidebar .close-btn { display: flex !important; }
        }
      `}</style>

      <aside id="kc-sidebar" className={isOpen ? 'open' : ''}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,163,74,.1), transparent 70%)', pointerEvents: 'none' }} />

        {/* Brand */}
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px 18px', borderBottom: '1px solid var(--divider)', position: 'relative' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(212,168,67,.2), rgba(212,168,67,.05))', border: '1px solid rgba(212,168,67,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 22h18M9 22V8l3-6 3 6v14M5 22V12l-2-2M19 22V12l2-2"/>
              <line x1="9" y1="11" x2="15" y2="11"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: 13 }}>Karbala Connect</div>
            <div style={{ color: 'var(--grey-dark)', fontSize: 10, marginTop: 1 }}>Admin Panel</div>
          </div>
          <button className="close-btn" onClick={onClose} style={{ background: 'none', color: 'var(--grey)', fontSize: 16, padding: 4, alignItems: 'center' }}>✕</button>
        </div>

        {/* Nav — scrollable so all pages stay visible on short screens */}
        <div className="sidebar-nav">
          <div style={{ color: 'var(--grey-dark)', fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', padding: '18px 18px 8px' }}>NAVIGATION</div>
          <nav style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 10,
                  transition: 'all .15s', textDecoration: 'none',
                  background: isActive ? 'linear-gradient(90deg, rgba(22,163,74,.15), rgba(22,163,74,.04))' : 'transparent',
                  color: isActive ? 'var(--emerald-light)' : 'var(--grey)',
                  borderLeft: isActive ? '2px solid var(--emerald-light)' : '2px solid transparent',
                })}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div style={{ height: 1, background: 'var(--divider)', margin: '0 16px' }} />

          {/* Logout */}
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 8px', padding: '10px 14px', background: 'rgba(239,68,68,.07)', color: 'var(--red)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, fontSize: 13, fontWeight: 600, width: 'calc(100% - 16px)', transition: 'background .15s' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>

          <div style={{ color: 'var(--grey-dark)', fontSize: 10, textAlign: 'center', padding: '6px 16px 14px' }}>
            v1.0 · Karbala Connect
          </div>
        </div>
      </aside>
    </>
  );
}
