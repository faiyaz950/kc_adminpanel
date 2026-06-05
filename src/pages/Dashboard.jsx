import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';

// SVG icon components (must be defined before QUICK / statCards)
const MusicIcon   = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>;
const MicIcon     = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>;
const PeopleIcon  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const ChevronIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>;
const AddTrackIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const AddReciterIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8"/></svg>;
const UsersIcon   = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;

const AnjumanIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 22h18M9 22V8l3-6 3 6v14M5 22V12l-2-2M19 22V12l2-2"/><line x1="9" y1="11" x2="15" y2="11"/></svg>;

const CAT_META = {
  dua:      { label: 'Duas',      color: '#06B6D4', bg: 'rgba(6,182,212,.1)',   border: 'rgba(6,182,212,.25)',   icon: '🤲' },
  noha:     { label: 'Nauhe',     color: '#EF4444', bg: 'rgba(239,68,68,.1)',   border: 'rgba(239,68,68,.25)',   icon: '💧' },
  manqabat: { label: 'Manqabat',  color: '#8B5CF6', bg: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.25)',  icon: '✨' },
  naat:     { label: 'Naats',     color: '#F97316', bg: 'rgba(249,115,22,.1)',  border: 'rgba(249,115,22,.25)',  icon: '🎵' },
  ziyarat:  { label: 'Ziyarat',   color: '#10B981', bg: 'rgba(16,185,129,.1)', border: 'rgba(16,185,129,.25)',  icon: '🕌' },
  kids:     { label: 'Kids',      color: '#F59E0B', bg: 'rgba(245,158,11,.1)',  border: 'rgba(245,158,11,.25)',  icon: '🌟' },
  tarana:   { label: 'Tarana',    color: '#EC4899', bg: 'rgba(236,72,153,.1)',  border: 'rgba(236,72,153,.25)',  icon: '🚩' },
};

const QUICK = [
  { to: '/tracks',   icon: AddTrackIcon,   label: 'Track Add Karein',    color: 'var(--gold)' },
  { to: '/reciters', icon: AddReciterIcon, label: 'Reciter Add Karein',  color: 'var(--emerald-light)' },
  { to: '/anjumans', icon: AnjumanIcon,    label: 'Anjuman Add Karein',  color: '#8B5CF6' },
  { to: '/users',    icon: UsersIcon,      label: 'Users Dekhein',       color: '#06B6D4' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ tracks: 0, reciters: 0, anjumans: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.allSettled([
      client.get('/tracks'),
      client.get('/reciters'),
      client.get('/anjumans'),
      client.get('/users'),
    ]).then(([t, r, a, u]) => {
      setStats({
        tracks:   t.status === 'fulfilled' ? t.value.data.length : 0,
        reciters: r.status === 'fulfilled' ? r.value.data.length : 0,
        anjumans: a.status === 'fulfilled' ? a.value.data.length : 0,
        users:    u.status === 'fulfilled' ? u.value.data.length : 0,
      });
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Tracks',     value: stats.tracks,   icon: <MusicIcon />,   color: 'var(--gold)',          bg: 'rgba(212,168,67,.1)',  border: 'rgba(212,168,67,.25)', href: '/tracks' },
    { label: 'Reciters',         value: stats.reciters, icon: <MicIcon />,     color: 'var(--emerald-light)', bg: 'rgba(22,163,74,.1)',   border: 'rgba(22,163,74,.25)',  href: '/reciters' },
    { label: 'Anjumans',         value: stats.anjumans, icon: <AnjumanIcon />, color: '#8B5CF6',              bg: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.25)', href: '/anjumans' },
    { label: 'Registered Users', value: stats.users,    icon: <PeopleIcon />,  color: '#06B6D4',              bg: 'rgba(6,182,212,.1)',   border: 'rgba(6,182,212,.25)',  href: '/users' },
  ];

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={dot} />
          <h2 className="page-title">Dashboard</h2>
        </div>
        <p className="page-subtitle">
          Khush aamdeed, <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{user.name || 'Admin'}</span> — Karbala Connect ka overview
        </p>
      </div>

      {loading ? <LoadingPulse /> : (
        <>
          {/* Stat Cards */}
          <div style={statsGrid}>
            {statCards.map(card => (
              <div
                key={card.label}
                onClick={() => navigate(card.href)}
                style={{ ...statCard, borderColor: card.border, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ ...iconBox, background: card.bg, border: `1px solid ${card.border}` }}>
                  <span style={{ color: card.color }}>{card.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
                  <div style={{ color: 'var(--grey)', fontSize: 12, marginTop: 5 }}>{card.label}</div>
                </div>
                <div style={{ marginLeft: 'auto', color: 'var(--grey-dark)' }}>
                  <ChevronIcon />
                </div>
              </div>
            ))}
          </div>

          {/* Categories */}
          <div style={{ marginBottom: 32 }}>
            <div className="section-title-row">
              <div className="accent-bar" style={{ background: 'linear-gradient(to bottom, var(--emerald-light), var(--emerald))' }} />
              <h3 className="section-title">Categories</h3>
            </div>
            <div style={catGrid}>
              {Object.entries(CAT_META).map(([id, m]) => (
                <div
                  key={id}
                  onClick={() => navigate('/tracks')}
                  style={{ ...catCard, background: m.bg, borderColor: m.border, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{m.icon}</div>
                  <div style={{ color: m.color, fontSize: 15, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ color: 'var(--grey)', fontSize: 11, marginTop: 4 }}>Tracks manage karein</div>
                  <div style={{ height: 2, background: `linear-gradient(to right, ${m.color}, transparent)`, marginTop: 12, borderRadius: 2 }} />
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
            <div style={quickGrid}>
              {QUICK.map((q, i) => {
                const Icon = q.icon;
                return (
                  <Link key={i} to={q.to} style={quickCard}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = q.color;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--divider)';
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <div style={{ ...quickIcon, background: `${q.color}15`, border: `1px solid ${q.color}30` }}>
                      <span style={{ color: q.color }}><Icon /></span>
                    </div>
                    <span style={{ color: 'var(--grey-light)', fontSize: 12, fontWeight: 600, textAlign: 'center', lineHeight: 1.4 }}>{q.label}</span>
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
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          flex: '1 1 200px', height: 100,
          background: 'var(--bg-card)',
          borderRadius: 16, border: '1px solid var(--divider)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

const dot = {
  width: 8, height: 8, borderRadius: '50%',
  background: 'var(--emerald-light)',
  boxShadow: '0 0 8px var(--emerald)',
};

const statsGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 16,
  marginBottom: 36,
};

const statCard = {
  background: 'var(--bg-card)',
  border: '1px solid',
  borderRadius: 16,
  padding: '22px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  transition: 'transform .2s, box-shadow .2s',
};

const iconBox = {
  width: 50,
  height: 50,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const catGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 12,
};

const catCard = {
  border: '1px solid',
  borderRadius: 16,
  padding: '20px 18px',
  transition: 'transform .2s',
};

const quickGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: 12,
};

const quickCard = {
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: 16,
  padding: '22px 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 12,
  transition: 'border-color .15s, transform .15s',
  textDecoration: 'none',
};

const quickIcon = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
