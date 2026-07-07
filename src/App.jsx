import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import kcLogo from './assets/kc_logo.png';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { prefetchTracksBootstrap } from './api/prefetch';
import { purgeBadCache } from './api/listCache';

// Lazy-load all heavy pages for faster initial load
const Dashboard     = lazy(() => import('./pages/Dashboard'));
const Tracks        = lazy(() => import('./pages/Tracks'));
const HomeSettings = lazy(() => import('./pages/HomeSettings'));
const FeaturedAlbums= lazy(() => import('./pages/FeaturedAlbums'));
const HomeNauhakhwans = lazy(() => import('./pages/HomeNauhakhwans'));
const HomeUlemas = lazy(() => import('./pages/HomeUlemas'));
const Reciters      = lazy(() => import('./pages/Reciters'));
const Anjumans      = lazy(() => import('./pages/Anjumans'));
const AnjumanSubmissions = lazy(() => import('./pages/AnjumanSubmissions'));
const AshraMajlis   = lazy(() => import('./pages/AshraMajlis'));
const Taqreer       = lazy(() => import('./pages/Taqreer'));
const Users         = lazy(() => import('./pages/Users'));
const Messages      = lazy(() => import('./pages/Messages'));
const Popups        = lazy(() => import('./pages/Popups'));
const AudioAds      = lazy(() => import('./pages/AudioAds'));
const OldNauhs      = lazy(() => import('./pages/OldNauhs'));
const OldNauhakhwans = lazy(() => import('./pages/OldNauhakhwans'));
const OldNauha      = lazy(() => import('./pages/OldNauha'));
const Podcasts      = lazy(() => import('./pages/Podcasts'));
const TrackAnalytics = lazy(() => import('./pages/TrackAnalytics'));
const UserInsights   = lazy(() => import('./pages/UserInsights'));
const LyricsSync     = lazy(() => import('./pages/LyricsSync'));
const TrackComments  = lazy(() => import('./pages/TrackComments'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid var(--emerald)',
        borderTopColor: 'transparent',
        animation: 'kspin .7s linear infinite',
      }} />
      <span style={{ color: 'var(--grey)', fontSize: 12 }}>Loading...</span>
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflowY = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflowY = ''; };
  }, [sidebarOpen]);

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
        {/* Mobile topbar */}
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
          <img
            src={kcLogo}
            alt="Karbala Connect"
            style={{ height: 40, width: 40, borderRadius: '50%', objectFit: 'cover', objectPosition: 'center', border: '2px solid rgba(212,168,67,.45)', boxShadow: '0 0 10px rgba(212,168,67,.15)' }}
          />
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
    purgeBadCache();
    const stored = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (stored && token) {
      try {
        setUser(JSON.parse(stored));
        prefetchTracksBootstrap();
      } catch {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    prefetchTracksBootstrap(true);
  };

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
        <Login onLogin={handleLogin} />
      ) : (
        <Layout>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/"               element={<Dashboard />} />
                <Route path="/tracks"         element={<Tracks />} />
                <Route path="/home-settings"      element={<HomeSettings />} />
                <Route path="/featured-albums"    element={<Navigate to="/home-settings?tab=albums" replace />} />
                <Route path="/home-nauhakhwans"   element={<Navigate to="/home-settings?tab=nauhakhwans" replace />} />
                <Route path="/home-ulemas"        element={<Navigate to="/home-settings?tab=ulemas" replace />} />
                <Route path="/home-categories"    element={<Navigate to="/home-settings?tab=categories" replace />} />
                <Route path="/reciters"       element={<Reciters />} />
                <Route path="/anjumans"       element={<Anjumans />} />
                <Route path="/anjuman-submissions" element={<AnjumanSubmissions />} />
                <Route path="/ashra-majlis"   element={<AshraMajlis />} />
                <Route path="/taqreer"        element={<Taqreer />} />
                <Route path="/users"          element={<Users />} />
                <Route path="/messages"       element={<Messages />} />
                <Route path="/popups"         element={<Popups />} />
                <Route path="/audio-ads"      element={<AudioAds />} />
                <Route path="/old-nauhs"      element={<OldNauhs />} />
                <Route path="/old-nauhakhwans" element={<OldNauhakhwans />} />
                <Route path="/old-nauha"      element={<OldNauha />} />
                <Route path="/podcasts"        element={<Podcasts />} />
                <Route path="/track-analytics" element={<TrackAnalytics />} />
                <Route path="/user-insights"   element={<UserInsights />} />
                <Route path="/lyrics-sync"     element={<LyricsSync />} />
                <Route path="/track-comments"  element={<TrackComments />} />
                <Route path="*"              element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </Layout>
      )}
    </BrowserRouter>
  );
}
