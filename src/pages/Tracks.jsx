import { useState, useEffect } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';
import SearchInput from '../components/SearchInput';

const CATEGORIES = ['dua', 'noha', 'manqabat', 'naat', 'ziyarat', 'kids', 'tarana'];
const LANGUAGES = {
  dua:      ['Arabic', 'Urdu', 'Hindi', 'Farsi'],
  noha:     ['Urdu', 'Punjabi', 'Hindi', 'Farsi'],
  manqabat: ['Urdu', 'Punjabi', 'Arabic', 'Hindi'],
  naat:     ['Urdu', 'Punjabi', 'Arabic', 'Hindi', 'English'],
  ziyarat:  ['Arabic', 'Urdu', 'Farsi'],
  kids:     ['Urdu', 'Hindi', 'English'],
  tarana:   ['Urdu', 'Hindi', 'Punjabi'],
};
const OCCASIONS = {
  dua:      ['Subah', 'Shaam', 'Jumma', 'Muharram', 'Ramzan', 'Hajj', 'Ziarat'],
  noha:     ['Muharram', 'Safar', 'Chehlum', 'Wiladat', 'Shahadat'],
  manqabat: ['Wiladat', 'Urs', 'Muharram', 'Ramzan'],
  naat:     ['Rabi ul Awwal', 'Ramzan', 'Jumma', 'Eid'],
  ziyarat:  ['Muharram', 'Safar', 'Wiladat', 'Ziarat', 'General'],
  kids:     ['Muharram', 'Wiladat', 'Ramzan', 'General'],
  tarana:   ['Muharram', 'Wiladat', 'Independence Day', 'General'],
};
const CAT_COLORS = {
  dua:      { color: '#06B6D4', bg: 'rgba(6,182,212,.12)',   border: 'rgba(6,182,212,.3)'   },
  noha:     { color: '#EF4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)'   },
  manqabat: { color: '#8B5CF6', bg: 'rgba(139,92,246,.12)', border: 'rgba(139,92,246,.3)'  },
  naat:     { color: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.3)'  },
  ziyarat:  { color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)'  },
  kids:     { color: '#F59E0B', bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.3)'  },
  tarana:   { color: '#EC4899', bg: 'rgba(236,72,153,.12)',  border: 'rgba(236,72,153,.3)'  },
};

const emptyForm = { title: '', category: 'dua', reciter_id: '', reciter_name: '', language: 'Urdu', occasion: '', duration: 0, is_featured: false, lyrics: '' };

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

  useEffect(() => { fetchTracks(); }, [filterCat]);
  useEffect(() => {
    client.get('/reciters').then(r => setReciters(r.data)).catch(() => {});
  }, []);

  const fetchTracks = () => {
    setLoading(true);
    setFetchError('');
    const params = filterCat ? { category: filterCat } : {};
    client.get('/tracks', { params })
      .then(r => { setTracks(r.data); })
      .catch(err => setFetchError(formatApiError(err, 'Tracks load nahi hue. Backend ya network check karein.')))
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      const fd = new FormData();
      ['title', 'category', 'reciter_id', 'reciter_name', 'language', 'occasion', 'lyrics'].forEach(k => fd.append(k, form[k] || ''));
      fd.append('duration', form.duration || 0);
      fd.append('is_featured', form.is_featured ? '1' : '0');
      if (audioFile) fd.append('audio', audioFile);
      if (imageFile) fd.append('image', imageFile);
      const opts = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editId) await client.post(`/tracks/${editId}`, fd, opts);
      else await client.post('/tracks', fd, opts);
      resetForm(); fetchTracks();
    } catch (err) {
      console.error('[tracks save]', err.response?.status, err.response?.data || err.message);
      setSaveError(formatApiError(err, 'Track save nahi hua.'));
    } finally { setSaving(false); }
  };

  const handleEdit = (track) => {
    setForm(track); setEditId(track.id); setShowForm(true);
    setAudioFile(null); setImageFile(null); setAudioPreviewUrl(null); setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yeh track delete karna chahte ho?')) return;
    try {
      await client.delete(`/tracks/${id}`);
      fetchTracks();
    } catch (err) {
      alert(formatApiError(err, 'Track delete nahi hua.'));
    }
  };

  const resetForm = () => {
    setForm(emptyForm); setEditId(null); setShowForm(false);
    setAudioFile(null); setImageFile(null); setAudioPreviewUrl(null); setSaveError('');
  };

  const setReciter = (id) => {
    const r = reciters.find(r => r.id == id);
    if (r) setForm(f => ({ ...f, reciter_id: r.id, reciter_name: r.name }));
  };

  const q = search.toLowerCase();
  const filtered = search
    ? tracks.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.reciter_name?.toLowerCase().includes(q)
      )
    : tracks;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Tracks</h2>
          <p className="page-subtitle">{tracks.length} total · {filtered.length} shown</p>
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
      <ErrorBanner error={fetchError} onRetry={fetchTracks} />

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
                <select className="form-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, language: '', occasion: '' }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
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
              <FormField label="Language">
                <select className="form-input" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                  {(LANGUAGES[form.category] || []).map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </FormField>
              <FormField label="Occasion">
                <select className="form-input" value={form.occasion} onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))}>
                  <option value="">-- Select --</option>
                  {(OCCASIONS[form.category] || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </FormField>
              <FormField label="Duration (seconds)">
                <input className="form-input" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} />
              </FormField>
              <FormField label="Featured">
                <select className="form-input" value={form.is_featured ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_featured: e.target.value === 'yes' }))}>
                  <option value="no">No</option>
                  <option value="yes">⭐ Yes — Featured</option>
                </select>
              </FormField>
              <FormField label="MP3 / Audio File" fullWidth>
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
            <button key={c} onClick={() => setFilterCat(c)}
              style={{
                padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                background: active ? (meta ? meta.bg : 'rgba(212,168,67,.15)') : 'var(--bg-card)',
                color:      active ? (meta ? meta.color : 'var(--gold)') : 'var(--grey)',
                border:     `1px solid ${active ? (meta ? meta.border : 'rgba(212,168,67,.4)') : 'var(--divider)'}`,
                transition: 'all .15s',
              }}>
              {c ? c.charAt(0).toUpperCase() + c.slice(1) : 'All'}
            </button>
          );
        })}
      </div>

      {/* Track list */}
      {loading ? (
        <>
          <div className="tracks-desktop"><TableSkeleton cols={8} /></div>
          <div className="tracks-mobile"><CardSkeleton /></div>
        </>
      ) : filtered.length === 0 ? (
        <p style={{ color: 'var(--grey)', textAlign: 'center', padding: '40px 0' }}>
          {search ? `"${search}" se koi track nahi mila` : 'Koi track nahi mila'}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="tracks-desktop data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {['Cover', 'Title', 'Category', 'Reciter', 'Language', 'Featured', 'Preview', 'Actions'].map(h => (
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
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="tracks-mobile track-cards-list">
            {tracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                previewTrackId={previewTrackId}
                setPreviewTrackId={setPreviewTrackId}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
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

function CategoryBadge({ category, cm }) {
  return (
    <span style={{ background: cm.bg, color: cm.color, border: `1px solid ${cm.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
      {category}
    </span>
  );
}

function TrackTableRow({ track, previewTrackId, setPreviewTrackId, onEdit, onDelete }) {
  const cm = CAT_COLORS[track.category] || {};
  return (
    <>
      <tr>
        <td><TrackCover track={track} cm={cm} /></td>
        <td><span style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13 }}>{track.title}</span></td>
        <td><CategoryBadge category={track.category} cm={cm} /></td>
        <td style={{ color: 'var(--grey-light)', fontSize: 13 }}>{track.reciter_name || '—'}</td>
        <td style={{ fontSize: 13 }}>{track.language || '—'}</td>
        <td>
          {track.is_featured
            ? <span style={{ background: 'rgba(212,168,67,.12)', color: 'var(--gold)', border: '1px solid rgba(212,168,67,.3)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⭐ Yes</span>
            : <span style={{ color: 'var(--grey-dark)', fontSize: 12 }}>No</span>
          }
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
        </td>
      </tr>
      {previewTrackId === track.id && (
        <tr>
          <td colSpan={8} style={{ background: 'var(--bg-surface)', padding: '10px 16px' }}>
            <audio controls autoPlay src={track.audio_url} style={{ width: '100%', height: 36, accentColor: 'var(--gold)' }} />
          </td>
        </tr>
      )}
    </>
  );
}

function TrackCard({ track, previewTrackId, setPreviewTrackId, onEdit, onDelete }) {
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
            {track.language && (
              <span style={{ background: 'var(--bg-surface)', color: 'var(--grey)', border: '1px solid var(--divider)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                {track.language}
              </span>
            )}
            {track.is_featured && (
              <span style={{ background: 'rgba(212,168,67,.12)', color: 'var(--gold)', border: '1px solid rgba(212,168,67,.3)', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>⭐ Featured</span>
            )}
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
