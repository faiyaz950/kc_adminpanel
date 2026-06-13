import { useState, useEffect } from 'react';
import client from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

const USERS_CACHE_KEY = 'kc_admin_users_v1';
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

const readUsersCache = () => {
  try {
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch { return null; }
};

const writeUsersCache = (data) => {
  try { localStorage.setItem(USERS_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
};

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fetchError, setFetchError] = useState('');

  const fetchUsers = (force = false) => {
    if (!force) {
      const cached = readUsersCache();
      if (cached) {
        setUsers(cached);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setFetchError('');
    client.get('/users')
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.data ?? []);
        setUsers(list);
        writeUsersCache(list);
      })
      .catch(err => setFetchError(
        err?.response?.status === 403
          ? 'Admin access chahiye. Dobara login karein.'
          : err?.response?.status === 429
          ? 'Server busy (429) — thodi der baad try karein.'
          : `Users load nahi hue: ${err?.response?.data?.message || err?.message || 'Network error'}`
      ))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Users</h2>
          <p className="page-subtitle">{users.length} registered users</p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', flex: '1 1 auto', justifyContent: 'flex-end' }}>
        {/* Search */}
        <div style={searchWrap}>
          <svg width="15" height="15" style={searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Naam ya email se dhundhein..."
            style={searchInput}
          />
        </div>
          <button
            onClick={() => fetchUsers(true)}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--bg-card)', border: '1px solid var(--divider)',
              color: 'var(--grey)', borderRadius: 10, padding: '9px 14px',
              fontSize: 12, fontWeight: 600, opacity: loading ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{ animation: loading ? 'kspin .7s linear infinite' : 'none' }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
      <ErrorBanner error={fetchError} onRetry={() => fetchUsers(true)} />

      {/* Stats bar */}
      <div style={statsRow}>
        <StatPill label="Total" value={users.length} color="var(--gold)" bg="rgba(212,168,67,.1)" border="rgba(212,168,67,.25)" />
        <StatPill label="Filtered" value={filtered.length} color="var(--emerald-light)" bg="rgba(22,163,74,.1)" border="rgba(22,163,74,.25)" />
      </div>

      {loading ? (
        <TableSkeleton />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {['#', 'User', 'Email', 'Favorites', 'Recently Played'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--grey)', padding: 40 }}>Koi user nahi mila</td></tr>
              )}
              {filtered.map((user, idx) => (
                <tr key={user.id}>
                  <td style={{ color: 'var(--grey-dark)', fontWeight: 700, fontSize: 12 }}>{idx + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={avatarStyle}>
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <span style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13 }}>
                        {user.name || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{user.email}</td>
                  <td>
                    <span style={favBadge}>{(user.favorites || []).length} saved</span>
                  </td>
                  <td>
                    <span style={playBadge}>{(user.recently_played || []).length} played</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color, bg, border }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: '6px 14px' }}>
      <span style={{ color, fontWeight: 800, fontSize: 16 }}>{value}</span>
      <span style={{ color: 'var(--grey)', fontSize: 12 }}>{label}</span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ height: 56, background: 'var(--bg-card)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite', border: '1px solid var(--divider)' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

const searchWrap = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  flex: '1 1 200px',
};

const searchIcon = {
  position: 'absolute',
  left: 12,
  color: 'var(--grey-dark)',
  pointerEvents: 'none',
};

const searchInput = {
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: 10,
  padding: '9px 14px 9px 36px',
  color: 'var(--white)',
  width: '100%',
  fontSize: 13,
  transition: 'border-color .15s',
};

const statsRow = {
  display: 'flex',
  gap: 10,
  marginBottom: 20,
  flexWrap: 'wrap',
};

const avatarStyle = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'linear-gradient(135deg, rgba(212,168,67,.2), rgba(212,168,67,.05))',
  border: '1px solid rgba(212,168,67,.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--gold)',
  fontWeight: 800,
  fontSize: 14,
  flexShrink: 0,
};

const favBadge = {
  background: 'rgba(239,68,68,.08)',
  color: 'var(--red)',
  border: '1px solid rgba(239,68,68,.2)',
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
};

const playBadge = {
  background: 'rgba(22,163,74,.08)',
  color: 'var(--emerald-light)',
  border: '1px solid rgba(22,163,74,.2)',
  padding: '3px 10px',
  borderRadius: 20,
  fontSize: 11,
  fontWeight: 700,
};
