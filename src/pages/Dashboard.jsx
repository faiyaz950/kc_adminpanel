import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

// SVG icon components
const MusicIcon   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>;
const MicIcon     = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>;
const PeopleIcon  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const ChevronIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;
const AddTrackIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const AddReciterIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>;
const UsersIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const AnjumanIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22h18M9 22V8l3-6 3 6v14M5 22V12l-2-2M19 22V12l2-2"/><line x1="9" y1="11" x2="15" y2="11"/></svg>;
const RefreshIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;

const CAT_META = {
  dua:      { label: 'Duas',      color: '#06B6D4', bg: 'rgba(6,182,212,.08)',   border: 'rgba(6,182,212,.2)',   icon: '🤲' },
  noha:     { label: 'Nauhe',     color: '#EF4444', bg: 'rgba(239,68,68,.08)',   border: 'rgba(239,68,68,.2)',   icon: '💧' },
  manqabat: { label: 'Manqabat',  color: '#8B5CF6', bg: 'rgba(139,92,246,.08)', border: 'rgba(139,92,246,.2)',  icon: '✨' },
  naat:     { label: 'Masaib',    color: '#F97316', bg: 'rgba(249,115,22,.08)',  border: 'rgba(249,115,22,.2)',  icon: '🎵' },
  ziyarat:  { label: 'Ziyarat',   color: '#10B981', bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.2)',  icon: '🕌' },
  kids:     { label: 'Kids',      color: '#F59E0B', bg: 'rgba(245,158,11,.08)',  border: 'rgba(245,158,11,.2)',  icon: '🌟' },
  tarana:   { label: 'Tarana',    color: '#EC4899', bg: 'rgba(236,72,153,.08)',  border: 'rgba(236,72,153,.2)',  icon: '🚩' },
};

const QUICK = [
  { to: '/tracks',   icon: AddTrackIcon,   label: 'Track Add Karein',    color: 'var(--gold)' },
  { to: '/reciters', icon: AddReciterIcon, label: 'Reciter Add Karein',  color: 'var(--emerald-light)' },
  { to: '/anjumans', icon: AnjumanIcon,    label: 'Anjuman Add Karein',  color: '#8B5CF6' },
  { to: '/users',    icon: UsersIcon,      label: 'Users Dekhein',       color: '#06B6D4' },
];

const SUMMARY_CACHE_KEY = 'kc_admin_summary_v1';

export default function Dashboard() {
  const [stats, setStats] = useState({ tracks: 0, reciters: 0, anjumans: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const navigate = useNavigate();

  const readSummaryCache = () => {
    try {
      const raw = localStorage.getItem(SUMMARY_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const fetchStats = async () => {
    const cached = readSummaryCache();
    if (cached) setStats(cached);

    setLoading(true);
    setApiError('');

    try {
      const r = await client.get('/admin/summary');
      setStats(r.data);
      localStorage.setItem(SUMMARY_CACHE_KEY, JSON.stringify(r.data));
      setApiError('');
    } catch (err) {
      if (cached) {
        setApiError('Live stats load nahi hue — purane numbers dikha rahe hain. Dobara Try karein.');
      } else {
        const status = err?.response?.status;
        setApiError(
          status === 500
            ? 'Server error (500) — backend mein koi issue hai. Laravel logs check karein.'
            : status === 429
            ? 'Server busy (429). 1 minute wait karein, phir Dobara Try karein.'
            : status === 403 || status === 401
            ? 'Session expire ho gaya — dobara login karein.'
            : `API error (${status ?? 'network'}) — URL: ${import.meta.env.VITE_API_URL}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const statCards = [
    { label: 'Total Tracks',     value: stats.tracks,   icon: <MusicIcon />,   color: 'var(--gold)',          bg: 'rgba(212,168,67,.1)',  border: 'rgba(212,168,67,.3)',  href: '/tracks',   borderLeft: '#D4A843' },
    { label: 'Reciters',         value: stats.reciters, icon: <MicIcon />,     color: 'var(--emerald-light)', bg: 'rgba(34,197,94,.1)',   border: 'rgba(34,197,94,.3)',   href: '/reciters', borderLeft: '#22C55E' },
    { label: 'Anjumans',         value: stats.anjumans, icon: <AnjumanIcon />, color: '#8B5CF6',              bg: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.3)', href: '/anjumans', borderLeft: '#8B5CF6' },
    { label: 'Registered Users', value: stats.users,    icon: <PeopleIcon />,  color: '#06B6D4',              bg: 'rgba(6,182,212,.1)',   border: 'rgba(6,182,212,.3)',   href: '/users',    borderLeft: '#06B6D4' },
  ];

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="page-wrapper page-fade-in">
      <style>{`
        @keyframes countUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stat-value { animation: countUp .4s .1s both; }
        .dash-stat-card {
          background: var(--bg-card);
          border: 1px solid var(--divider);
          border-radius: 16px;
          padding: 22px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          transition: transform .2s, box-shadow .2s, border-color .2s;
          position: relative;
          overflow: hidden;
        }
        .dash-stat-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          border-radius: 16px 0 0 16px;
          background: var(--card-accent, #22C55E);
        }
        .dash-stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(0,0,0,.4), var(--shadow-glow);
        }
        .dash-cat-card {
          border: 1px solid;
          border-radius: 16px;
          padding: 20px 18px;
          transition: transform .2s, box-shadow .2s;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .dash-cat-card::after {
          content: '';
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(to right, var(--cat-line, #22C55E), transparent);
        }
        .dash-cat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,.35);
        }
        .dash-quick-card {
          background: var(--bg-card);
          border: 1px solid var(--divider);
          border-radius: 16px;
          padding: 22px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          transition: border-color .15s, transform .15s, box-shadow .15s;
          text-decoration: none;
        }
        .dash-quick-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,.35);
        }
      `}</style>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--emerald-light)', boxShadow: '0 0 10px var(--emerald)' }} />
            <h2 className="page-title">Dashboard</h2>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-card)', border: '1px solid var(--divider)',
              color: 'var(--grey)', borderRadius: 10, padding: '7px 14px',
              fontSize: 12, fontWeight: 600,
              transition: 'border-color .15s, color .15s',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <span style={{ display: 'inline-flex', animation: loading ? 'kspin .7s linear infinite' : 'none' }}><RefreshIcon /></span>
            Refresh
          </button>
        </div>
        <p className="page-subtitle" style={{ marginLeft: 20 }}>
          Khush aamdeed, <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{user.name || 'Admin'}</span> — Karbala Connect ka live overview
        </p>
      </div>

      <ErrorBanner error={apiError} onRetry={fetchStats} />

      {/* Quick Stats header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span className="gradient-text" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>Quick Stats</span>
        <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
      </div>

      {loading ? <LoadingPulse /> : (
        <>
          {/* Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 36 }}>
            {statCards.map((card, i) => (
              <div
                key={card.label}
                className="dash-stat-card"
                style={{ '--card-accent': card.borderLeft, animationDelay: `${i * 0.07}s` }}
                onClick={() => navigate(card.href)}
              >
                <div style={{
                  width: 50, height: 50, borderRadius: 14, flexShrink: 0,
                  background: card.bg, border: `1px solid ${card.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: card.color,
                }}>
                  {card.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="stat-value" style={{ fontSize: 34, fontWeight: 800, color: card.color, lineHeight: 1 }}>
                    {card.value.toLocaleString()}
                  </div>
                  <div style={{ color: 'var(--grey)', fontSize: 12, marginTop: 5 }}>{card.label}</div>
                </div>
                <div style={{ color: 'var(--grey-dark)', flexShrink: 0 }}>
                  <ChevronIcon />
                </div>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div style={{ marginBottom: 36 }}>
            <div className="section-title-row">
              <div className="accent-bar" />
              <h3 className="section-title">Categories</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              {Object.entries(CAT_META).map(([id, m]) => (
                <div
                  key={id}
                  className="dash-cat-card"
                  style={{ background: m.bg, borderColor: m.border, '--cat-line': m.color }}
                  onClick={() => navigate('/tracks')}
                >
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{m.icon}</div>
                  <div style={{ color: m.color, fontSize: 14, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ color: 'var(--grey)', fontSize: 11, marginTop: 4 }}>Tracks manage karein</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="section-title-row">
              <div className="accent-bar" style={{ background: 'linear-gradient(to bottom, var(--gold-light), var(--gold))' }} />
              <h3 className="section-title">Quick Actions</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 12 }}>
              {QUICK.map((q, i) => {
                const Icon = q.icon;
                return (
                  <Link
                    key={i}
                    to={q.to}
                    className="dash-quick-card"
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = q.color;
                      e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,.35), 0 0 0 1px ${q.color}22`;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--divider)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div style={{
                      width: 46, height: 46, borderRadius: 13,
                      background: `${q.color}15`, border: `1px solid ${q.color}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: q.color,
                    }}>
                      <Icon />
                    </div>
                    <span style={{ color: 'var(--grey-light)', fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>
                      {q.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function LoadingPulse() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 94, borderRadius: 16 }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="skeleton" style={{ height: 96, borderRadius: 16 }} />
        ))}
      </div>
    </div>
  );
}
