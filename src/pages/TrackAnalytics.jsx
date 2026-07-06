import { useEffect, useState, useMemo } from 'react';
import client from '../api/client';
import ErrorBanner from '../components/ErrorBanner';

const PlayIcon     = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>;
const SearchIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const RefreshIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>;
const SortIcon     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>;
const SortUpIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>;

const CACHE_KEY = 'kc_analytics_v1';

const TABS = [
  { key: 'all',           label: 'All',          color: '#22C55E' },
  { key: 'track',         label: 'Tracks',        color: '#EF4444' },
  { key: 'anjuman_track', label: 'Anjuman',       color: '#8B5CF6' },
  { key: 'ulema_track',   label: 'Majlis',        color: '#F97316' },
  { key: 'maulana_track', label: 'Taqreer',       color: '#06B6D4' },
  { key: 'old_nauh',      label: 'Old Nauhe',     color: '#D97706' },
  { key: 'podcast',       label: 'Podcast',       color: '#EC4899' },
];

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

function TrackRow({ rank, item }) {
  const tab = TABS.find(t => t.key === item.type) || TABS[0];
  return (
    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700, width: 40 }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
      </td>
      <td style={{ padding: '10px 8px', width: 44 }}>
        {item.image_url ? (
          <img src={item.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: 6, background: `${tab.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🎵</div>
        )}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.title}
        </div>
        {item.subtitle && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
            {item.subtitle}
          </div>
        )}
      </td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{
          display: 'inline-block', padding: '3px 9px', borderRadius: 100,
          background: `${tab.color}18`, border: `1px solid ${tab.color}33`,
          color: tab.color, fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
          textTransform: 'uppercase',
        }}>
          {tab.label}
        </span>
      </td>
      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#22C55E', fontWeight: 800, fontSize: 14 }}>
          <PlayIcon />{formatCount(item.play_count)}
        </span>
      </td>
    </tr>
  );
}

export default function TrackAnalytics() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('all');
  const [search, setSearch]   = useState('');
  const [sort, setSort]       = useState('plays_desc');

  const readCache = () => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)); } catch { return null; }
  };

  const fetchData = async () => {
    const cached = readCache();
    if (cached) setData(cached);
    setLoading(true);
    setError('');
    try {
      const r = await client.get('/admin/analytics');
      setData(r.data);
      localStorage.setItem(CACHE_KEY, JSON.stringify(r.data));
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 401 || status === 403 ? 'Session expire ho gaya — dobara login karein.' :
        status === 500 ? 'Server error (500) — backend logs check karein.' :
        `API error (${status ?? 'network'}) — check karein`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const allItems = useMemo(() => {
    if (!data) return [];
    return [
      ...(data.tracks || []),
      ...(data.anjuman_tracks || []),
      ...(data.ulema_tracks || []),
      ...(data.maulana_tracks || []),
      ...(data.old_nauhs || []),
      ...(data.podcasts || []),
    ];
  }, [data]);

  const filtered = useMemo(() => {
    let items = tab === 'all' ? allItems : allItems.filter(i => i.type === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i =>
        i.title?.toLowerCase().includes(q) ||
        i.subtitle?.toLowerCase().includes(q)
      );
    }
    if (sort === 'plays_desc') items = [...items].sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
    else if (sort === 'plays_asc') items = [...items].sort((a, b) => (a.play_count || 0) - (b.play_count || 0));
    else if (sort === 'title') items = [...items].sort((a, b) => a.title?.localeCompare(b.title));
    return items;
  }, [allItems, tab, search, sort]);

  const totalPlays = data?.total_plays ?? 0;
  const topTrackPlays = filtered[0]?.play_count ?? 0;
  const tabCount = tab === 'all' ? allItems.length
    : allItems.filter(i => i.type === tab).length;

  return (
    <div style={{ padding: '28px 24px', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-.4px' }}>
            Track Analytics
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '4px 0 0' }}>
            Saare tracks ke play counts — categories wise
          </p>
        </div>
        <button
          onClick={fetchData}
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

      {/* Stat Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Plays" value={totalPlays} color="#22C55E" />
        <StatCard label="Total Tracks" value={allItems.length} color="#06B6D4" />
        <StatCard label="Top Track Plays" value={topTrackPlays} color="#F97316" />
        <StatCard label="Showing" value={filtered.length} color="#8B5CF6" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${tab === t.key ? t.color : 'rgba(255,255,255,0.08)'}`,
              background: tab === t.key ? `${t.color}18` : 'transparent',
              color: tab === t.key ? t.color : 'rgba(255,255,255,0.5)',
              transition: 'all .15s',
            }}
          >
            {t.label}
            {t.key !== 'all' && data && (
              <span style={{ marginLeft: 5, opacity: 0.6 }}>
                ({(data[t.key === 'track' ? 'tracks' : t.key === 'anjuman_track' ? 'anjuman_tracks'
                  : t.key === 'ulema_track' ? 'ulema_tracks' : t.key === 'maulana_track' ? 'maulana_tracks'
                  : t.key === 'old_nauh' ? 'old_nauhs' : 'podcasts'] || []).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '8px 14px',
        }}>
          <SearchIcon />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Track ya reciter search karein..."
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: '#fff', fontSize: 13, width: '100%',
            }}
          />
        </div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '8px 14px', color: 'rgba(255,255,255,0.7)',
            fontSize: 13, cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="plays_desc">Most Played ↓</option>
          <option value="plays_asc">Least Played ↑</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {/* Table */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        {loading && !data ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            Loading tracks...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
            Koi track nahi mila
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>#</th>
                  <th style={{ padding: '10px 8px', width: 44 }}></th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Track</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '.08em', textTransform: 'uppercase' }}>Type</th>
                  <th
                    onClick={() => setSort(sort === 'plays_desc' ? 'plays_asc' : 'plays_desc')}
                    style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#22C55E', letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Plays {sort === 'plays_asc' ? <SortUpIcon /> : <SortIcon />}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <TrackRow key={`${item.type}-${item.id}`} rank={idx + 1} item={item} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 14 }}>
          {filtered.length} tracks — {tab === 'all' ? 'Saari categories' : TABS.find(t => t.key === tab)?.label}
        </p>
      )}
    </div>
  );
}
