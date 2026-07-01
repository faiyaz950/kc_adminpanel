import { useState, useEffect, useMemo } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import {
  readBootstrapCache,
  readStaleBootstrapCache,
  writeBootstrap,
  sanitizeList,
} from '../api/listCache';
import ErrorBanner from '../components/ErrorBanner';
import SearchInput from '../components/SearchInput';
import AudioProcessor from '../components/AudioProcessor';
import YoutubeConverter from '../components/YoutubeConverter';
import { StorageBadges } from '../components/StorageBadge';

const CATEGORIES = ['dua', 'noha', 'manqabat', 'naat', 'ziyarat', 'kids', 'tarana', 'marsiya', 'soz', 'salam'];
const LANGUAGES = {
  dua:      ['Arabic', 'Urdu', 'Hindi', 'Farsi'],
  noha:     ['Urdu', 'Punjabi', 'Hindi', 'Farsi'],
  manqabat: ['Urdu', 'Punjabi', 'Arabic', 'Hindi', 'Farsi'],
  marsiya:  ['Urdu', 'Punjabi', 'Hindi', 'Farsi'],
  soz:      ['Urdu', 'Punjabi', 'Hindi', 'Farsi'],
  salam:    ['Urdu', 'Punjabi', 'Hindi', 'Farsi'],
  naat:     ['Urdu', 'Punjabi', 'Arabic', 'Hindi', 'English', 'Farsi'],
  ziyarat:  ['Arabic', 'Urdu', 'Farsi'],
  kids:     ['Urdu', 'Hindi', 'English', 'Farsi'],
  tarana:   ['Urdu', 'Hindi', 'Punjabi', 'Farsi'],
};
const OCCASIONS = {
  dua:      ['Subah', 'Shaam', 'Jumma', 'Muharram', 'Ramzan', 'Hajj', 'Ziarat'],
  noha:     ['Muharram', 'Safar', 'Chehlum', 'Wiladat', 'Shahadat'],
  manqabat: ['Wiladat', 'Urs', 'Muharram', 'Ramzan'],
  marsiya:  ['Muharram', 'Safar', 'Chehlum', 'Wiladat', 'Shahadat'],
  soz:      ['Muharram', 'Safar', 'Chehlum', 'Wiladat', 'Shahadat'],
  salam:    ['Muharram', 'Safar', 'Chehlum', 'Wiladat', 'Shahadat'],
  naat:     ['Rabi ul Awwal', 'Ramzan', 'Jumma', 'Eid'],
  ziyarat:  ['Muharram', 'Safar', 'Wiladat', 'Ziarat', 'General'],
  kids:     ['Muharram', 'Wiladat', 'Ramzan', 'General'],
  tarana:   ['Muharram', 'Wiladat', 'Independence Day', 'General'],
};
const CAT_LABELS = { naat: 'Masaib', marsiya: 'Marsiya', soz: 'Soz', salam: 'Salam' };
const catLabel = c => {
  if (!c) return '—';
  return CAT_LABELS[c] || (c.charAt(0).toUpperCase() + c.slice(1));
};

const CAT_COLORS = {
  dua:      { color: '#06B6D4', bg: 'rgba(6,182,212,.12)',   border: 'rgba(6,182,212,.3)'   },
  noha:     { color: '#EF4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)'   },
  manqabat: { color: '#8B5CF6', bg: 'rgba(139,92,246,.12)', border: 'rgba(139,92,246,.3)'  },
  marsiya:  { color: '#7F1D1D', bg: 'rgba(127,29,29,.12)',  border: 'rgba(127,29,29,.3)'  },
  soz:      { color: '#D97706', bg: 'rgba(217,119,6,.12)', border: 'rgba(217,119,6,.3)' },
  salam:    { color: '#F59E0B', bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.3)' },
  naat:     { color: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.3)'  },
  ziyarat:  { color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)'  },
  kids:     { color: '#F59E0B', bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.3)'  },
  tarana:   { color: '#EC4899', bg: 'rgba(236,72,153,.12)',  border: 'rgba(236,72,153,.3)'  },
};

const formatPlayCount = (n) => {
  const count = Number(n) || 0;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
};

const defaultLanguage = (category) => (LANGUAGES[category] || ['Urdu'])[0];

const resolveLanguage = (category, language) => {
  const options = LANGUAGES[category] || [];
  if (language && options.includes(language)) return language;
  return defaultLanguage(category);
};

const CURRENT_YEAR = new Date().getFullYear();
const TRACK_YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => CURRENT_YEAR - i);

const emptyForm = { title: '', category: 'dua', reciter_id: '', reciter_name: '', language: defaultLanguage('dua'), occasion: '', year: '', is_featured: false, lyrics: '' };

export default function Tracks() {
  const [tracks, setTracks] = useState([]);
  const [reciters, setReciters] = useState([]);
  const [filterCat, setFilterCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [previewTrackId, setPreviewTrackId] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [filterReciter, setFilterReciter] = useState(null);

  // Notification state
  const [notifyTrack, setNotifyTrack] = useState(null);
  const [notifySending, setNotifySending] = useState(false);
  const [notifyResult, setNotifyResult] = useState(null);

  useEffect(() => { fetchTracks(); }, []);

  const applyTracksPayload = (tracks, reciters) => {
    setTracks(sanitizeList(tracks));
    setReciters(sanitizeList(reciters));
  };

  const loadBootstrap = async () => {
    try {
      const res = await client.get('/tracks/bootstrap');
      return res.data;
    } catch (err) {
      if (err?.response?.status === 404) {
        const tracksRes = await client.get('/tracks');
        const recitersRes = await client.get('/reciters');
        return { tracks: tracksRes.data, reciters: recitersRes.data };
      }
      throw err;
    }
  };

  const fetchTracks = async (force = false) => {
    const staleCache = readStaleBootstrapCache();
    const freshCache = !force ? readBootstrapCache() : null;

    if (staleCache) {
      applyTracksPayload(staleCache.tracks, staleCache.reciters);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (freshCache && !force) {
      setFetchError('');
      return;
    }

    setFetchError('');

    try {
      const data = await loadBootstrap();
      applyTracksPayload(data.tracks, data.reciters);
      writeBootstrap(data.tracks, data.reciters);
      setFetchError('');
    } catch (err) {
      if (staleCache) {
        applyTracksPayload(staleCache.tracks, staleCache.reciters);
        setFetchError('Server busy — saved data dikha rahe hain. 5 minute baad refresh karein.');
      } else {
        setFetchError(formatApiError(err, 'Tracks load nahi hue. 2 minute wait karein, phir Dobara Try karein.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId && !audioFile) {
      setSaveError('Naya track ke liye MP3 / audio file zaroori hai.');
      return;
    }
    const language = resolveLanguage(form.category, form.language);
    if (!language) {
      setSaveError('Language select karein.');
      return;
    }
    setSaving(true); setSaveError('');
    try {
      const fd = new FormData();
      const payload = { ...form, language };
      ['title', 'category', 'reciter_id', 'reciter_name', 'language', 'occasion', 'year', 'lyrics'].forEach(k => fd.append(k, payload[k] ?? ''));
      fd.append('is_featured', form.is_featured ? '1' : '0');
      if (audioFile) fd.append('audio', audioFile);
      if (imageFile) fd.append('image', imageFile);
      if (editId) await client.post(`/tracks/${editId}`, fd);
      else await client.post('/tracks', fd);
      resetForm(); fetchTracks(true);
    } catch (err) {
      console.error('[tracks save]', err.response?.status, err.response?.data || err.message);
      setSaveError(formatApiError(err, 'Track save nahi hua.'));
    } finally { setSaving(false); }
  };

  const handleEdit = (track) => {
    setForm({
      ...track,
      year: track.year ? String(track.year) : '',
      language: resolveLanguage(track.category, track.language),
    });
    setEditId(track.id); setShowForm(true);
    setAudioFile(null); setImageFile(null); setAudioPreviewUrl(null); setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yeh track delete karna chahte ho?')) return;
    try {
      await client.delete(`/tracks/${id}`);
      fetchTracks(true);
    } catch (err) {
      alert(formatApiError(err, 'Track delete nahi hua.'));
    }
  };

  const resetForm = () => {
    setForm(emptyForm); setEditId(null); setShowForm(false);
    setAudioFile(null); setImageFile(null); setAudioPreviewUrl(null); setSaveError('');
  };

  const handleSendNotification = async () => {
    if (!notifyTrack) return;
    setNotifySending(true);
    setNotifyResult(null);
    try {
      const res = await client.post('/admin/notifications/send-track', {
        track_id:   notifyTrack.id,
        track_type: 'track',
        title:      notifyTrack.title,
        reciter:    notifyTrack.reciter_name || '',
        image_url:  notifyTrack.image_url || '',
      });
      setNotifyResult({ success: true, sent: res.data.sent ?? 0, failed: res.data.failed ?? 0 });
    } catch (err) {
      setNotifyResult({ success: false, error: formatApiError(err, 'Notification send nahi hua.') });
    } finally {
      setNotifySending(false);
    }
  };

  const setReciter = (id) => {
    const r = reciters.find(r => r.id == id);
    if (r) setForm(f => ({ ...f, reciter_id: r.id, reciter_name: r.name }));
  };

  const recitersWithTracks = useMemo(() => {
    const map = new Map();
    for (const t of tracks) {
      const name = (t.reciter_name || '').trim();
      if (!name && !t.reciter_id) continue;
      const key = t.reciter_id ? `id:${t.reciter_id}` : `name:${name.toLowerCase()}`;
      if (!map.has(key)) {
        const r = reciters.find(rec => rec.id == t.reciter_id);
        map.set(key, {
          key,
          id: t.reciter_id || null,
          name: name || r?.name || 'Unknown',
          image_url: r?.image_url || null,
          trackCount: 0,
        });
      }
      map.get(key).trackCount += 1;
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks, reciters]);

  const matchesReciter = (track, rec) => {
    if (rec.id) return track.reciter_id == rec.id;
    return (track.reciter_name || '').trim().toLowerCase() === rec.name.toLowerCase();
  };

  const q = search.toLowerCase();
  const filtered = tracks.filter(t => {
    if (filterCat && t.category !== filterCat) return false;
    if (filterReciter && !matchesReciter(t, filterReciter)) return false;
    if (!q) return true;
    return (
      t.title?.toLowerCase().includes(q) ||
      t.reciter_name?.toLowerCase().includes(q)
    );
  });

  const filteredPlays = useMemo(
    () => filtered.reduce((sum, t) => sum + (Number(t.play_count) || 0), 0),
    [filtered],
  );

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tracks</h2>
          <p className="page-subtitle">
            {tracks.length} total · {filtered.length} shown · {formatPlayCount(filteredPlays)} plays
            {filterReciter ? ` · ${filterReciter.name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Title ya reciter se dhundhein..."
            width={220}
          />
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(p => !p); }}>
            {showForm ? '✕ Cancel' : '+ Add Track'}
          </button>
        </div>
      </div>
      <ErrorBanner error={fetchError} onRetry={() => fetchTracks(true)} />

      {/* Reciters with tracks — round filter cards */}
      {!loading && recitersWithTracks.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Reciters ({recitersWithTracks.length})
            </span>
            {filterReciter && (
              <button
                type="button"
                onClick={() => setFilterReciter(null)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: 'rgba(212,168,67,.12)', color: 'var(--gold)',
                  border: '1px solid rgba(212,168,67,.35)',
                }}
              >
                ✕ Filter hataein — sab dikhao
              </button>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              gap: 14,
              overflowX: 'auto',
              paddingBottom: 6,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {recitersWithTracks.map(r => {
              const active = filterReciter?.key === r.key;
              const initials = r.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setFilterReciter(active ? null : r)}
                  title={`${r.name} — ${r.trackCount} track${r.trackCount !== 1 ? 's' : ''}`}
                  style={{
                    flex: '0 0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    width: 76,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: `2.5px solid ${active ? 'var(--gold)' : 'var(--divider)'}`,
                      boxShadow: active ? '0 0 0 3px rgba(212,168,67,.2)' : 'none',
                      background: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'border-color .15s, box-shadow .15s',
                    }}
                  >
                    {r.image_url ? (
                      <img src={r.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ color: active ? 'var(--gold)' : 'var(--grey)', fontSize: 18, fontWeight: 800 }}>
                        {initials || '?'}
                      </span>
                    )}
                  </div>
                  <span
                    style={{
                      color: active ? 'var(--gold)' : 'var(--grey-light)',
                      fontSize: 10,
                      fontWeight: active ? 700 : 600,
                      textAlign: 'center',
                      lineHeight: 1.25,
                      maxWidth: 76,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {r.name}
                  </span>
                  <span style={{ color: 'var(--grey-dark)', fontSize: 9, marginTop: -4 }}>
                    {r.trackCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 22 }}>
            <div className="accent-bar" />
            <h3 className="section-title">{editId ? 'Track Edit Karein' : 'Naya Track Add Karein'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <FormField label="Title *">
                <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </FormField>
              <FormField label="Category">
                <select
                  className="form-input"
                  value={form.category}
                  onChange={e => {
                    const category = e.target.value;
                    setForm(f => ({
                      ...f,
                      category,
                      language: resolveLanguage(category, f.language),
                      occasion: '',
                    }));
                  }}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                </select>
              </FormField>
              <FormField label="Reciter (list se chunein)">
                <select className="form-input" value={form.reciter_id} onChange={e => setReciter(e.target.value)}>
                  <option value="">-- Select Reciter --</option>
                  {reciters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </FormField>
              <FormField label="Reciter Naam (manual)">
                <input className="form-input" value={form.reciter_name || ''} onChange={e => setForm(f => ({ ...f, reciter_name: e.target.value }))} />
              </FormField>
              <FormField label="Language *">
                <select
                  className="form-input"
                  value={resolveLanguage(form.category, form.language)}
                  onChange={e => setForm(f => ({ ...f, language: e.target.value }))}
                  required
                >
                  {(LANGUAGES[form.category] || []).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </FormField>
              <FormField label="Occasion">
                <select className="form-input" value={form.occasion} onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))}>
                  <option value="">-- Select --</option>
                  {(OCCASIONS[form.category] || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="Year">
                <select className="form-input" value={form.year || ''} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}>
                  <option value="">-- Select Year --</option>
                  {TRACK_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </FormField>
              <FormField label="Featured">
                <select className="form-input" value={form.is_featured ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_featured: e.target.value === 'yes' }))}>
                  <option value="no">No</option>
                  <option value="yes">⭐ Yes — Featured</option>
                </select>
              </FormField>
              {editId && (
                <FormField label="Total Plays">
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--bg-surface)', border: '1px solid var(--divider)',
                  }}>
                    <PlayCountBadge count={form.play_count} />
                    <span style={{ color: 'var(--grey)', fontSize: 12 }}>
                      App se kitni baar play hua
                    </span>
                  </div>
                </FormField>
              )}
              <FormField label="MP3 / Audio File" fullWidth>
                <p style={{ color: 'var(--grey)', fontSize: 11, marginBottom: 8 }}>
                  Duration MP3 se automatically detect hogi — manually set karne ki zaroorat nahi.
                </p>
                <YoutubeConverter
                  disabled={saving}
                  onConverted={(file, previewUrl) => {
                    setAudioFile(file);
                    if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
                    setAudioPreviewUrl(previewUrl);
                    setSaveError('');
                  }}
                  onTitleSuggest={title => {
                    if (!form.title.trim()) setForm(f => ({ ...f, title }));
                  }}
                />
                <p style={{ color: 'var(--grey-dark)', fontSize: 11, margin: '12px 0 8px', textAlign: 'center' }}>
                  — ya file upload karein —
                </p>
                <input type="file" accept="audio/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }}
                  onChange={e => {
                    const f = e.target.files[0];
                    setAudioFile(f);
                    if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
                    setAudioPreviewUrl(f ? URL.createObjectURL(f) : null);
                  }} />
                {(audioPreviewUrl || form.audio_url) && (
                  <audio controls src={audioPreviewUrl || form.audio_url} key={audioPreviewUrl || form.audio_url}
                    style={{ width: '100%', height: 38, marginTop: 10, accentColor: 'var(--gold)', borderRadius: 8 }} />
                )}
                <AudioProcessor
                  file={audioFile}
                  onProcessed={(processedFile, processedUrl) => {
                    setAudioFile(processedFile);
                    if (audioPreviewUrl && audioPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
                    setAudioPreviewUrl(processedUrl);
                  }}
                />
              </FormField>
              <FormField label="Cover Image" fullWidth>
                <input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }}
                  onChange={e => setImageFile(e.target.files[0])} />
                {(imageFile || form.image_url) && (
                  <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url} alt=""
                    style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', marginTop: 10, border: '1px solid var(--divider)' }} />
                )}
              </FormField>
              <FormField label="Lyrics (optional)" fullWidth>
                <textarea className="form-input" value={form.lyrics || ''} onChange={e => setForm(f => ({ ...f, lyrics: e.target.value }))} rows={4} style={{ resize: 'vertical' }} />
              </FormField>
            </div>
            {saveError && <div className="err-banner" style={{ marginTop: 16 }}>{saveError}</div>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update Karein' : 'Track Add Karein'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter chips */}
      <div className="filter-row">
        {['', ...CATEGORIES].map(c => {
          const meta = CAT_COLORS[c];
          const active = filterCat === c;
          return (
            <button key={c} onClick={() => { setFilterCat(c); setFilterReciter(null); }}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: active ? (meta ? meta.bg : 'rgba(212,168,67,.15)') : 'var(--bg-card)',
                color:      active ? (meta ? meta.color : 'var(--gold)') : 'var(--grey)',
                border:     `1px solid ${active ? (meta ? meta.border : 'rgba(212,168,67,.4)') : 'var(--divider)'}`,
                transition: 'all .15s',
              }}>
              {c ? catLabel(c) : 'All'}
            </button>
          );
        })}
      </div>

      {/* Track list */}
      {loading ? (
        <>
          <div className="tracks-desktop"><TableSkeleton cols={10} /></div>
          <div className="tracks-mobile"><CardSkeleton /></div>
        </>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--grey)', textAlign: 'center', padding: '40px 0' }}>
          {filterReciter
            ? `${filterReciter.name} ke liye koi track nahi mila`
            : search
            ? `"${search}" se koi track nahi mila`
            : 'Koi track nahi mila'}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="tracks-desktop data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {['Cover', 'Title', 'Category', 'Reciter', 'Language', 'Year', 'Plays', 'Featured', 'Preview', 'Actions'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(track => (
                  <TrackTableRow
                    key={track.id}
                    track={track}
                    previewTrackId={previewTrackId}
                    setPreviewTrackId={setPreviewTrackId}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onNotify={t => { setNotifyTrack(t); setNotifyResult(null); }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="tracks-mobile track-cards-list">
            {filtered.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                previewTrackId={previewTrackId}
                setPreviewTrackId={setPreviewTrackId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onNotify={t => { setNotifyTrack(t); setNotifyResult(null); }}
              />
            ))}
          </div>
        </>
      )}

      {/* Notification Confirm Modal */}
      {notifyTrack && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 16, padding: 28,
            width: '100%', maxWidth: 440, border: '1px solid var(--divider)',
            boxShadow: '0 24px 60px rgba(0,0,0,.5)',
          }}>
            <h3 style={{ color: 'var(--white)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
              🔔 Push Notification Bhejein
            </h3>
            <p style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 20 }}>
              Yeh notification <b style={{ color: 'var(--white)' }}>saare installed users</b> ko jayegi. Users notification tap karenge to yeh track play hoga.
            </p>

            <div style={{
              display: 'flex', gap: 12, alignItems: 'center',
              background: 'var(--bg-surface)', borderRadius: 12, padding: 14,
              border: '1px solid var(--divider)', marginBottom: 20,
            }}>
              {notifyTrack.image_url && (
                <img src={notifyTrack.image_url} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              )}
              <div>
                <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{notifyTrack.title}</div>
                <div style={{ color: 'var(--grey)', fontSize: 12 }}>{notifyTrack.reciter_name || '—'}</div>
                <div style={{ color: 'var(--grey-dark)', fontSize: 11, marginTop: 4 }}>
                  {catLabel(notifyTrack.category)} · {notifyTrack.language || ''}
                </div>
              </div>
            </div>

            {notifyResult && (
              <div style={{
                padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13,
                background: notifyResult.success ? 'rgba(22,163,74,.12)' : 'rgba(239,68,68,.12)',
                color: notifyResult.success ? 'var(--emerald-light)' : '#f87171',
                border: `1px solid ${notifyResult.success ? 'rgba(22,163,74,.3)' : 'rgba(239,68,68,.3)'}`,
              }}>
                {notifyResult.success
                  ? notifyResult.sent === 0
                    ? `⚠️ Koi user registered nahi hai abhi — jab users naya app install karenge tab FCM token save hoga.`
                    : `✅ ${notifyResult.sent} users ko notification gayi!${notifyResult.failed > 0 ? ` (${notifyResult.failed} failed)` : ''}`
                  : `❌ ${notifyResult.error}`}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => { setNotifyTrack(null); setNotifyResult(null); }}
                disabled={notifySending}
              >
                {notifyResult?.success ? 'Bandh Karein' : 'Cancel'}
              </button>
              {!notifyResult?.success && (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSendNotification}
                  disabled={notifySending}
                  style={{ minWidth: 140 }}
                >
                  {notifySending ? 'Bhej rahe hain...' : '🔔 Notification Bhejein'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, children, fullWidth }) {
  return (
    <div className={fullWidth ? 'form-field-full' : undefined}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

function TrackCover({ track, cm, size = 36 }) {
  if (track.image_url) {
    return <img src={track.image_url} alt="" className="track-card-cover" style={{ width: size, height: size, borderRadius: size > 40 ? 10 : 8 }} />;
  }
  return (
    <div className="track-card-cover-placeholder" style={{ width: size, height: size, borderRadius: size > 40 ? 10 : 8, background: cm.bg || 'var(--bg-surface)' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={cm.color || 'var(--grey)'} strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
    </div>
  );
}

function PlayCountBadge({ count }) {
  const n = Number(count) || 0;
  return (
    <span
      title={`${n} plays`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(22,163,74,.1)',
        color: 'var(--emerald-light)',
        border: '1px solid rgba(22,163,74,.25)',
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
      {formatPlayCount(n)}
    </span>
  );
}

function YearBadge({ year }) {
  if (!year) return <span style={{ color: 'var(--grey-dark)', fontSize: 12 }}>—</span>;
  return (
    <span style={{
      background: 'var(--bg-surface)',
      color: 'var(--grey-light)',
      border: '1px solid var(--divider)',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
    }}>
      {year}
    </span>
  );
}

function CategoryBadge({ category, cm }) {
  return (
    <span style={{ background: cm.bg, color: cm.color, border: `1px solid ${cm.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {catLabel(category)}
    </span>
  );
}

function TrackTableRow({ track, previewTrackId, setPreviewTrackId, onEdit, onDelete, onNotify }) {
  const cm = CAT_COLORS[track.category] || {};
  return (
    <>
      <tr>
        <td><TrackCover track={track} cm={cm} /></td>
        <td><span style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13 }}>{track.title}</span></td>
        <td><CategoryBadge category={track.category} cm={cm} /></td>
        <td style={{ color: 'var(--grey-light)', fontSize: 13 }}>{track.reciter_name || '—'}</td>
        <td style={{ fontSize: 13 }}>{track.language || '—'}</td>
        <td><YearBadge year={track.year} /></td>
        <td><PlayCountBadge count={track.play_count} /></td>
        <td>
          {track.is_featured
            ? <span style={{ background: 'rgba(212,168,67,.12)', color: 'var(--gold)', border: '1px solid rgba(212,168,67,.3)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⭐ Yes</span>
            : <span style={{ color: 'var(--grey-dark)', fontSize: 12 }}>No</span>
          }
        </td>
        <td>
          <StorageBadges imageUrl={track.image_url} audioUrl={track.audio_url} />
        </td>
        <td>
          {track.audio_url
            ? <button type="button" className="tbl-btn tbl-btn-play" onClick={() => setPreviewTrackId(previewTrackId === track.id ? null : track.id)}>
                {previewTrackId === track.id ? '■ Stop' : '▶ Play'}
              </button>
            : <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>No audio</span>
          }
        </td>
        <td>
          <button type="button" className="tbl-btn tbl-btn-edit" onClick={() => onEdit(track)}>Edit</button>
          <button type="button" className="tbl-btn tbl-btn-delete" onClick={() => onDelete(track.id)}>Delete</button>
          <button type="button" className="tbl-btn" onClick={() => onNotify(track)}
            style={{ background: 'rgba(139,92,246,.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.3)' }}
            title="Push notification bhejein">
            🔔
          </button>
        </td>
      </tr>
      {previewTrackId === track.id && (
        <tr>
          <td colSpan={10} style={{ background: 'var(--bg-surface)', padding: '10px 16px' }}>
            <audio controls autoPlay src={track.audio_url} style={{ width: '100%', height: 36, accentColor: 'var(--gold)' }} />
          </td>
        </tr>
      )}
    </>
  );
}

function TrackCard({ track, previewTrackId, setPreviewTrackId, onEdit, onDelete, onNotify }) {
  const cm = CAT_COLORS[track.category] || {};
  const isPlaying = previewTrackId === track.id;

  return (
    <div className="track-card">
      <div className="track-card-header">
        <TrackCover track={track} cm={cm} size={52} />
        <div className="track-card-body">
          <div className="track-card-title">{track.title}</div>
          <div className="track-card-meta">{track.reciter_name || '—'}</div>
          <div className="track-card-tags">
            <CategoryBadge category={track.category} cm={cm} />
            <PlayCountBadge count={track.play_count} />
            <YearBadge year={track.year} />
            {track.language && (
              <span style={{ background: 'var(--bg-surface)', color: 'var(--grey)', border: '1px solid var(--divider)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                {track.language}
              </span>
            )}
            {track.is_featured && (
              <span style={{ background: 'rgba(212,168,67,.12)', color: 'var(--gold)', border: '1px solid rgba(212,168,67,.3)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⭐ Featured</span>
            )}
            <StorageBadges imageUrl={track.image_url} audioUrl={track.audio_url} />
          </div>
        </div>
      </div>

      {isPlaying && track.audio_url && (
        <audio controls autoPlay src={track.audio_url} className="track-card-audio" />
      )}

      <div className="track-card-actions">
        {track.audio_url && (
          <button type="button" className="tbl-btn tbl-btn-play" onClick={() => setPreviewTrackId(isPlaying ? null : track.id)}>
            {isPlaying ? '■ Stop' : '▶ Play'}
          </button>
        )}
        <button type="button" className="tbl-btn tbl-btn-edit" onClick={() => onEdit(track)}>Edit</button>
        <button type="button" className="tbl-btn tbl-btn-delete" onClick={() => onDelete(track.id)}>Delete</button>
        <button type="button" className="tbl-btn" onClick={() => onNotify(track)}
          style={{ background: 'rgba(139,92,246,.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,.3)' }}
          title="Push notification bhejein">
          🔔 Notify
        </button>
      </div>
    </div>
  );
}

function TableSkeleton({ cols }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ height: 52, background: 'var(--bg-card)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite', border: '1px solid var(--divider)' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="track-cards-list">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="track-card" style={{ height: 140, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
