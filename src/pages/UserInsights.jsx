import { useEffect, useState } from 'react';
import client from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

const PlayIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>;
const RefreshIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;

const USER_CACHE_KEY = 'kc_analytics_users_v1';

const REGISTERED_COLOR = '#06B6D4';
const GUEST_COLOR = '#F97316';

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ', ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toString();
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${color}22`,
      borderRadius: 14,
      padding: '16px 20px',
      display: 'flex', flexDirection: 'column', gap: 4,
      flex: '1 1 150px', minWidth: 140,
    }}>
      <span style={{ fontSize: 11, color: color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</span>
      <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{formatCount(value)}</span>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
      <span style={{ width: 9, height: 9, borderRadius: 3, background: color, display: 'inline-block' }} />
      {label}
    </span>
  );
}

function DailyPlaysChart({ dailyPlays }) {
  const max = Math.max(1, ...dailyPlays.map(d => d.total));
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 16, padding: '18px 20px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Pichle 14 din — plays (registered vs guest)</span>
        <div style={{ display: 'flex', gap: 14 }}>
          <LegendDot color={REGISTERED_COLOR} label="Registered" />
          <LegendDot color={GUEST_COLOR} label="Guest" />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 140 }}>
        {dailyPlays.map(d => {
          const total = d.total || 0;
          const regH = total ? (d.registered / max) * 120 : 0;
          const guestH = total ? (d.guest / max) * 120 : 0;
          return (
            <div
              key={d.date}
              title={`${formatShortDate(d.date)} — ${total} plays (${d.registered} registered, ${d.guest} guest)`}
              style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', height: '100%', cursor: 'default' }}
            >
              <div style={{ width: '100%', maxWidth: 22, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 120 }}>
                {regH > 0 && (
                  <div style={{
                    width: '100%', height: regH, background: REGISTERED_COLOR,
                    borderRadius: guestH > 0 ? '0 0 2px 2px' : '4px 4px 2px 2px',
                  }} />
                )}
                {guestH > 0 && (
                  <div style={{
                    width: '100%', height: guestH, background: GUEST_COLOR,
                    borderRadius: '4px 4px 0 0', marginBottom: regH > 0 ? 2 : 0,
                  }} />
                )}
                {total === 0 && <div style={{ width: '100%', height: 2, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />}
              </div>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 6, whiteSpace: 'nowrap' }}>
                {formatShortDate(d.date)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopGuestRow({ rank, guest }) {
  const shortId = guest.device_id ? guest.device_id.slice(0, 8) : '—';
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, width: 40 }}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
      </td>
      <td style={{ padding: '10px 8px', width: 44 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(249,115,22,.2), rgba(249,115,22,.05))',
          border: '1px solid rgba(249,115,22,.3)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: GUEST_COLOR, fontWeight: 800, fontSize: 13,
        }}>
          👤
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Guest</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>device: {shortId}…</div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {guest.favorite_track || '—'}
        </div>
        {guest.favorite_track && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{guest.favorite_track_plays}x played</div>
        )}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
        {formatDateTime(guest.last_played_at)}
      </td>
      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: GUEST_COLOR, fontWeight: 800, fontSize: 14 }}>
          <PlayIcon />{formatCount(guest.play_count)}
        </span>
      </td>
    </tr>
  );
}

function TopUserRow({ rank, user }) {
  const initial = (user.name || user.email || '?')[0]?.toUpperCase() || '?';
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, width: 40 }}>
        {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
      </td>
      <td style={{ padding: '10px 8px', width: 44 }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(212,168,67,.2), rgba(212,168,67,.05))',
          border: '1px solid rgba(212,168,67,.3)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', color: '#D4A843', fontWeight: 800, fontSize: 13,
        }}>
          {initial}
        </div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{user.name || 'N/A'}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{user.email}</div>
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.favorite_track || '—'}
        </div>
        {user.favorite_track && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{user.favorite_track_plays}x played</div>
        )}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
        {formatDateTime(user.last_played_at)}
      </td>
      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: REGISTERED_COLOR, fontWeight: 800, fontSize: 14 }}>
          <PlayIcon />{formatCount(user.play_count)}
        </span>
      </td>
    </tr>
  );
}

export default function UserInsights() {
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUserStats = async () => {
    try {
      const cached = JSON.parse(localStorage.getItem(USER_CACHE_KEY));
      if (cached) setUserStats(cached);
    } catch { /* ignore cache read errors */ }
    setLoading(true);
    setError('');
    try {
      const r = await client.get('/admin/analytics/users');
      setUserStats(r.data);
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(r.data));
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 401 || status === 403 ? 'Session expire ho gaya — dobara login karein.' :
        `User analytics load nahi hui (${status ?? 'network'})`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUserStats(); }, []);

  return (
    <div style={{ padding: '28px 24px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-.4px' }}>
            User Insights
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '4px 0 0' }}>
            Kitne users ne play kiya, kaun sabse zyada active hai, aur guest vs registered split
          </p>
        </div>
        <button
          onClick={fetchUserStats}
          disabled={loading}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 10,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
            color: '#22C55E', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          <RefreshIcon /> {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <ErrorBanner message={error} />}

      {loading && !userStats ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          Loading user insights...
        </div>
      ) : userStats && userStats.total_tracked_plays === 0 ? (
        <div style={{
          padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16,
        }}>
          Abhi tak koi tracked play nahi hai — yeh naya feature hai, jaise-jaise app use hoga yahan data dikhega.
        </div>
      ) : userStats ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <StatCard label="Users Played" value={userStats.users_played} color="#8B5CF6" />
            <StatCard label="Guest Users" value={userStats.guest_devices_played} color={GUEST_COLOR} />
            <StatCard label="Registered Plays" value={userStats.registered_plays} color={REGISTERED_COLOR} />
            <StatCard label="Guest Plays" value={userStats.guest_plays} color={GUEST_COLOR} />
            <StatCard label="Total Tracked Plays" value={userStats.total_tracked_plays} color="#22C55E" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <DailyPlaysChart dailyPlays={userStats.daily_plays || []} />
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Top Registered Users</div>
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, overflow: 'hidden', marginBottom: 20,
          }}>
            {(userStats.top_users || []).length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Abhi tak kisi registered user ne track play nahi ki
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>#</th>
                      <th style={{ padding: '10px 8px', width: 44 }}></th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>User</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Favorite Track</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Last Played</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: REGISTERED_COLOR, letterSpacing: '.08em', textTransform: 'uppercase' }}>Plays</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userStats.top_users.map((u, idx) => (
                      <TopUserRow key={u.user_id} rank={idx + 1} user={u} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Top Guest Users</div>
          <div style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {(userStats.top_guests || []).length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
                Abhi tak kisi guest ne track play nahi ki
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>#</th>
                      <th style={{ padding: '10px 8px', width: 44 }}></th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Guest</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Favorite Track</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Last Played</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: GUEST_COLOR, letterSpacing: '.08em', textTransform: 'uppercase' }}>Plays</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userStats.top_guests.map((g, idx) => (
                      <TopGuestRow key={g.device_id} rank={idx + 1} guest={g} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {userStats.tracking_since && (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 14 }}>
              Tracking start: {formatDateTime(userStats.tracking_since)} se — is se pehle ke plays record nahi hain
            </p>
          )}
        </>
      ) : null}
    </div>
  );
}
