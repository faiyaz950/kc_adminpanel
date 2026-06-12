import { useState, useEffect, useMemo } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import SearchInput from '../components/SearchInput';
import ErrorBanner from '../components/ErrorBanner';

const RED = '#EF4444';
const RED_BG = 'rgba(239,68,68,.12)';
const RED_BORDER = 'rgba(239,68,68,.3)';

export default function OldNauha() {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');

  const [selected, setSelected] = useState(null);
  const [lyrics, setLyrics] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => { fetchTracks(); }, []);

  const fetchTracks = async (force = false) => {
    setLoading(true); setFetchError('');
    try {
      const res = await client.get('/old-nauhs');
      setTracks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setFetchError(formatApiError(err, 'Old Nauhe load nahi hue.'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = filterCountry ? tracks.filter(t => t.country === filterCountry) : tracks;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.nauhakhwan_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tracks, search, filterCountry]);

  const openLyricsEditor = (track) => {
    setSelected(track);
    setLyrics(track.lyrics || '');
    setSaveError('');
    setSaveSuccess(false);
  };

  const closeLyricsEditor = () => {
    setSelected(null);
    setLyrics('');
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleSaveLyrics = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError(''); setSaveSuccess(false);
    try {
      const fd = new FormData();
      fd.append('lyrics', lyrics);
      await client.post(`/old-nauhs/${selected.id}`, fd);
      setTracks(prev => prev.map(t => t.id === selected.id ? { ...t, lyrics } : t));
      setSelected(prev => ({ ...prev, lyrics }));
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(formatApiError(err, 'Lyrics save nahi hue.'));
    } finally {
      setSaving(false);
    }
  };

  const lyricsCount = tracks.filter(t => t.lyrics && t.lyrics.trim()).length;

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 32, height: 32, borderRadius: 8, background: RED_BG, border: `1px solid ${RED_BORDER}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
              </svg>
            </span>
            Old's Nauhe
          </h1>
          <p className="page-subtitle">Old nauhe mein lyrics add ya edit karein</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ background: RED_BG, border: `1px solid ${RED_BORDER}`, borderRadius: 10, padding: '8px 16px', fontSize: 13 }}>
            <span style={{ color: RED, fontWeight: 700 }}>{tracks.length}</span>
            <span style={{ color: 'var(--grey)', marginLeft: 5 }}>Total Nauhe</span>
          </div>
          <div style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 10, padding: '8px 16px', fontSize: 13 }}>
            <span style={{ color: 'var(--emerald-light)', fontWeight: 700 }}>{lyricsCount}</span>
            <span style={{ color: 'var(--grey)', marginLeft: 5 }}>With Lyrics</span>
          </div>
        </div>
      </div>

      {fetchError && <ErrorBanner message={fetchError} onRetry={fetchTracks} />}

      {/* Lyrics editor modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--divider)',
            width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto',
            padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,.6)',
          }}>
            {/* Editor header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
              {selected.image_url
                ? <img src={selected.image_url} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 52, height: 52, borderRadius: 10, background: RED_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  </div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 16, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selected.title}
                </div>
                {selected.nauhakhwan_name && (
                  <div style={{ color: 'var(--grey)', fontSize: 13 }}>{selected.nauhakhwan_name}</div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <span style={{ background: RED_BG, color: RED, border: `1px solid ${RED_BORDER}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    {selected.country}
                  </span>
                  {selected.lyrics?.trim()
                    ? <span style={{ background: 'rgba(16,185,129,.1)', color: 'var(--emerald-light)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>✓ Lyrics Maujood</span>
                    : <span style={{ background: 'rgba(107,114,128,.1)', color: 'var(--grey)', border: '1px solid var(--divider)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>Lyrics Nahi</span>
                  }
                </div>
              </div>
              <button onClick={closeLyricsEditor} style={{ background: 'transparent', border: 'none', color: 'var(--grey)', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form onSubmit={handleSaveLyrics}>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Lyrics</label>
              <textarea
                className="form-input"
                value={lyrics}
                onChange={e => setLyrics(e.target.value)}
                rows={14}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.8 }}
                placeholder="Yahan lyrics likhein..."
              />
              {saveError && <div className="err-banner" style={{ marginTop: 12 }}>{saveError}</div>}
              {saveSuccess && (
                <div style={{ marginTop: 12, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 10, padding: '10px 16px', color: 'var(--emerald-light)', fontSize: 13, fontWeight: 600 }}>
                  ✓ Lyrics save ho gayi!
                </div>
              )}
              <div className="form-actions" style={{ marginTop: 20 }}>
                <button type="button" className="btn-cancel" onClick={closeLyricsEditor}>Cancel</button>
                <button type="submit" className="btn-save" disabled={saving}>
                  {saving ? 'Saving...' : 'Lyrics Save Karein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Title ya nauhakhwan se dhundhein..." />
        <div style={{ display: 'flex', gap: 8 }}>
          {['', 'India', 'Pakistan'].map(c => (
            <button key={c} onClick={() => setFilterCountry(c)}
              style={{
                padding: '7px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: filterCountry === c ? RED_BG : 'var(--bg-card)',
                color: filterCountry === c ? RED : 'var(--grey)',
                border: `1px solid ${filterCountry === c ? RED_BORDER : 'var(--divider)'}`,
                cursor: 'pointer', transition: 'all .15s',
              }}>
              {c || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Track list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 72, borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--divider)', opacity: 0.5 + (i % 3) * 0.15 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--grey)', textAlign: 'center', padding: '60px 0' }}>
          {search ? `"${search}" se koi nauh nahi mila` : 'Koi nauh nahi mila'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(track => {
            const hasLyrics = track.lyrics && track.lyrics.trim();
            return (
              <div key={track.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'var(--bg-card)', borderRadius: 12,
                  border: '1px solid var(--divider)', padding: '12px 16px',
                  transition: 'border-color .15s',
                }}
              >
                {/* Cover */}
                {track.image_url
                  ? <img src={track.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 9, objectFit: 'cover', flexShrink: 0 }} />
                  : <div style={{ width: 48, height: 48, borderRadius: 9, background: RED_BG, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                    </div>
                }

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    {track.nauhakhwan_name && (
                      <span style={{ color: 'var(--grey)', fontSize: 12 }}>{track.nauhakhwan_name}</span>
                    )}
                    <span style={{ background: RED_BG, color: RED, border: `1px solid ${RED_BORDER}`, borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                      {track.country}
                    </span>
                    {hasLyrics
                      ? <span style={{ background: 'rgba(16,185,129,.1)', color: 'var(--emerald-light)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>✓ Lyrics</span>
                      : <span style={{ background: 'rgba(107,114,128,.08)', color: 'var(--grey-dark)', border: '1px solid var(--divider)', borderRadius: 20, padding: '1px 8px', fontSize: 10 }}>No Lyrics</span>
                    }
                  </div>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => openLyricsEditor(track)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: RED_BG, color: RED, border: `1px solid ${RED_BORDER}`,
                    borderRadius: 9, padding: '7px 14px', fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', flexShrink: 0, transition: 'all .15s',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  {hasLyrics ? 'Edit Lyrics' : 'Lyrics Add Karein'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
