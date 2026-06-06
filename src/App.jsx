import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tracks from './pages/Tracks';
import Reciters from './pages/Reciters';
import Anjumans from './pages/Anjumans';
import Users from './pages/Users';
import Messages from './pages/Messages';
import Popups from './pages/Popups';
import Sidebar from './components/Sidebar';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
            zIndex: 99, backdropFilter: 'blur(2px)',
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main id="kc-main" style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        minHeight: '100vh',
        background: 'var(--bg-dark)',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {/* Mobile topbar — shown via CSS */}
        <div id="mobile-topbar" style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          height: 56,
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--divider)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}
          >
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--white)', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--white)', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 22, height: 2, background: 'var(--white)', borderRadius: 2 }} />
          </button>
          <span style={{ color: 'var(--gold)', fontWeight: 800, fontSize: 15, letterSpacing: '-0.2px' }}>
            Karbala Connect
          </span>
          <div style={{ width: 34 }} />
        </div>

        {children}
      </main>

      <style>{`
        @media (max-width: 768px) {
          #mobile-topbar { display: flex !important; }
          #kc-main { margin-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  if (user === undefined) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg-dark)', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid var(--emerald)',
          borderTopColor: 'transparent',
          animation: 'kspin .7s linear infinite',
        }} />
        <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: 'var(--grey)', fontSize: 12 }}>Loading...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!user ? (
        <Login onLogin={setUser} />
      ) : (
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tracks" element={<Tracks />} />
            <Route path="/reciters" element={<Reciters />} />
            <Route path="/anjumans" element={<Anjumans />} />
            <Route path="/users" element={<Users />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/popups" element={<Popups />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      )}
    </BrowserRouter>
  );
}
