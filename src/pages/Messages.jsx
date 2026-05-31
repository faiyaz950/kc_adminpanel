import { useState, useEffect } from 'react';
import client from '../api/client';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    client.get('/team-messages')
      .then(r => setMessages(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = messages.filter(m =>
    m.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.message?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Team Messages</h2>
          <p className="page-subtitle">{messages.length} messages received</p>
        </div>
        <div style={searchWrap}>
          <svg width="15" height="15" style={searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="User ya message se dhundhein..."
            style={searchInput}
          />
        </div>
      </div>

      <div style={statsRow}>
        <StatPill label="Total" value={messages.length} color="var(--gold)" bg="rgba(212,168,67,.1)" border="rgba(212,168,67,.25)" />
        <StatPill label="Filtered" value={filtered.length} color="var(--emerald-light)" bg="rgba(22,163,74,.1)" border="rgba(22,163,74,.25)" />
      </div>

      {loading ? (
        <TableSkeleton />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--grey)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: 12 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p style={{ margin: 0, fontSize: 14 }}>Koi message nahi mila</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 24px 24px' }}>
          {filtered.map(m => (
            <div key={m.id} style={card}>
              {/* User info row */}
              <div style={userRow}>
                <div style={avatar}>
                  {m.user?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={userName}>{m.user?.name || 'Unknown'}</span>
                    <span style={badge}>#{m.user?.id}</span>
                  </div>
                  <span style={userEmail}>{m.user?.email || '-'}</span>
                </div>
                <span style={dateChip}>{formatDate(m.created_at)}</span>
              </div>
              {/* Message */}
              <div style={msgBox}>
                <p style={msgText}>{m.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, color, bg, border }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color, fontWeight: 700, fontSize: 18 }}>{value}</span>
      <span style={{ color: 'var(--grey)', fontSize: 12 }}>{label}</span>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 24px 24px' }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{ ...card, opacity: 0.5 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--divider)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '30%', height: 12, background: 'var(--divider)', borderRadius: 6, marginBottom: 6 }} />
              <div style={{ width: '50%', height: 10, background: 'var(--divider)', borderRadius: 6 }} />
            </div>
          </div>
          <div style={{ marginTop: 12, height: 50, background: 'var(--divider)', borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}

const searchWrap = {
  position: 'relative', display: 'flex', alignItems: 'center',
};
const searchIcon = {
  position: 'absolute', left: 12, color: 'var(--grey)', pointerEvents: 'none',
};
const searchInput = {
  background: 'var(--bg-surface)', border: '1px solid var(--divider)',
  borderRadius: 10, padding: '9px 14px 9px 36px', color: 'var(--white)',
  fontSize: 13, outline: 'none', width: 240,
};
const statsRow = {
  display: 'flex', gap: 10, padding: '0 24px 20px',
};
const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: 16,
  padding: 18,
};
const userRow = {
  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
};
const avatar = {
  width: 40, height: 40, borderRadius: '50%',
  background: 'linear-gradient(135deg, rgba(22,163,74,.25), rgba(22,163,74,.1))',
  border: '1px solid rgba(22,163,74,.3)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'var(--emerald-light)', fontWeight: 700, fontSize: 16,
  flexShrink: 0,
};
const userName = {
  color: 'var(--white)', fontWeight: 600, fontSize: 14,
};
const badge = {
  background: 'rgba(212,168,67,.1)', border: '1px solid rgba(212,168,67,.25)',
  borderRadius: 6, padding: '1px 6px', color: 'var(--gold)', fontSize: 11, fontWeight: 600,
};
const userEmail = {
  color: 'var(--grey)', fontSize: 12,
};
const dateChip = {
  color: 'var(--grey)', fontSize: 11, whiteSpace: 'nowrap', marginLeft: 'auto',
};
const msgBox = {
  background: 'var(--bg-surface)', borderRadius: 10, padding: '12px 14px',
  borderLeft: '3px solid var(--emerald)',
};
const msgText = {
  color: 'var(--grey-light, #cbd5e1)', fontSize: 13, margin: 0, lineHeight: 1.6,
  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};
