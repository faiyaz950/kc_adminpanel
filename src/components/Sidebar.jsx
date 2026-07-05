import { NavLink } from 'react-router-dom';
import client from '../api/client';
import kcLogo from '../assets/kc_logo.png';

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
    to: '/home-settings', label: 'Home Setting',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
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
    to: '/anjuman-submissions', label: 'Anjuman Requests',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  },
  {
    to: '/ashra-majlis', label: 'Ashra Majlis',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  },
  {
    to: '/taqreer', label: 'Taqreer',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>,
  },
  {
    to: '/users', label: 'Users',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    to: '/messages', label: 'Messages',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  },
  {
    to: '/old-nauhakhwans', label: 'Old Nauhakhwans',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>,
  },
  {
    to: '/old-nauhs', label: "Old's Nauhe",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    to: '/popups', label: 'Popups',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>,
  },
  {
    to: '/audio-ads', label: 'Audio Ads',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>,
  },
  {
    to: '/old-nauha', label: "Nauhe Lyrics",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  },
  {
    to: '/podcasts', label: 'Podcasts',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="11" r="3"/><path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9s-9-4.03-9-9a9 9 0 0 1 9-9z"/><path d="M12 14v7M8 21h8"/></svg>,
  },
  {
    to: '/track-analytics', label: 'Track Analytics',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
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
          background: linear-gradient(180deg, #0A1A0C 0%, #020704 100%);
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
        #kc-sidebar::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--emerald-light), var(--gold), transparent);
          opacity: 0.6;
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
        .sidebar-nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          transition: all .15s;
          text-decoration: none;
          color: var(--grey);
          border-left: 2px solid transparent;
          position: relative;
        }
        .sidebar-nav-link:hover {
          background: rgba(34,197,94,.06);
          color: var(--grey-light);
        }
        .sidebar-nav-link.active {
          background: linear-gradient(90deg, rgba(34,197,94,.14), rgba(34,197,94,.03));
          color: var(--emerald-light);
          border-left-color: var(--emerald-light);
          box-shadow: inset 3px 0 12px rgba(34,197,94,.08);
        }
        .sidebar-logout-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 12px 8px;
          padding: 10px 14px;
          background: rgba(239,68,68,.06);
          color: var(--red);
          border: 1px solid rgba(239,68,68,.18);
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          width: calc(100% - 16px);
          transition: background .15s, border-color .15s, transform .1s;
        }
        .sidebar-logout-btn:hover {
          background: rgba(239,68,68,.12);
          border-color: rgba(239,68,68,.35);
          transform: translateX(2px);
        }
      `}</style>

      <aside id="kc-sidebar" className={isOpen ? 'open' : ''}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(22,163,74,.08), transparent 70%)', pointerEvents: 'none' }} />

        {/* Brand */}
        <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 16px 18px', borderBottom: '1px solid var(--divider)', position: 'relative' }}>
          <div style={{
            width: 58, height: 58, borderRadius: '50%',
            overflow: 'hidden', flexShrink: 0,
            border: '2px solid rgba(212,168,67,.45)',
            boxShadow: '0 0 0 3px rgba(212,168,67,.08), 0 0 16px rgba(212,168,67,.18)',
            background: '#0A1A0C',
          }}>
            <img src={kcLogo} alt="Karbala Connect" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scale(1.25)', transformOrigin: 'center center' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--gold)', fontWeight: 800, fontSize: 13 }}>Karbala Connect</div>
            <div style={{ color: 'var(--grey-dark)', fontSize: 10, marginTop: 1 }}>Admin Panel</div>
          </div>
          <button className="close-btn" onClick={onClose} style={{ background: 'none', color: 'var(--grey)', fontSize: 16, padding: 4, alignItems: 'center' }}>✕</button>
        </div>

        {/* Nav — scrollable */}
        <div className="sidebar-nav">
          <div style={{ color: 'var(--grey-dark)', fontSize: 9, fontWeight: 700, letterSpacing: '1.4px', padding: '18px 18px 8px' }}>MENU</div>
          <nav style={{ padding: '0 8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) => 'sidebar-nav-link' + (isActive ? ' active' : '')}
              >
                <span style={{ flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--divider), transparent)', margin: '0 16px' }} />

          <button onClick={handleLogout} className="sidebar-logout-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Logout</span>
          </button>

          <div style={{ color: 'var(--grey-dark)', fontSize: 10, textAlign: 'center', padding: '4px 16px 14px' }}>
            v1.0 · Karbala Connect
          </div>
        </div>
      </aside>
    </>
  );
}
