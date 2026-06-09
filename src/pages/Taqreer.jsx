import { useState, useEffect } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import { fetchList, KEYS } from '../api/listCache';
import ErrorBanner from '../components/ErrorBanner';
import SearchInput from '../components/SearchInput';

const TRACK_TYPES = [
  { value: 'ashra_majlis', label: 'Majalis' },
  { value: 'dars', label: 'Dars' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'lecture', label: 'Lecture' },
];
const ASHRA_DAYS = Array.from({ length: 10 }, (_, i) => i + 1);
const emptyForm = { name: '', bio: '', image_url: null };

const typeLabel = (v) => TRACK_TYPES.find(t => t.value === v)?.label ?? v;

export default function Taqreer() {
  const [ulemas, setUlemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selectedUlema, setSelectedUlema] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchUlemas(); }, []);

  const fetchUlemas = (force = false) => fetchList({
    key: KEYS.ULEMAS,
    url: '/ulemas',
    force,
    setData: setUlemas,
    setLoading,
    setError: setFetchError,
    errorFallback: 'Ulema load nahi hue. 2 minute wait karein.',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('bio', form.bio || '');
      if (imageFile) fd.append('image', imageFile);
      if (editId) await client.post(`/ulemas/${editId}`, fd);
      else await client.post('/ulemas', fd);
      resetForm(); fetchUlemas();
    } catch (err) {
      setSaveError(formatApiError(err, 'Ulema save nahi hua.'));
    } finally { setSaving(false); }
  };

  const handleEdit = (u) => {
    setForm({ name: u.name, bio: u.bio || '', image_url: u.image_url || null });
    setEditId(u.id); setImageFile(null); setShowForm(true); setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Ulema aur uske tamam audio delete ho jayenge. Sure?')) return;
    try {
      await client.delete(`/ulemas/${id}`);
      fetchUlemas();
      if (selectedUlema?.id === id) setSelectedUlema(null);
    } catch (err) {
      alert(formatApiError(err, 'Ulema delete nahi hua.'));
    }
  };

  const resetForm = () => { setForm(emptyForm); setEditId(null); setImageFile(null); setShowForm(false); setSaveError(''); };

  if (selectedUlema) {
    return (
      <UlemaTracks
        ulema={selectedUlema}
        onBack={() => { setSelectedUlema(null); fetchUlemas(); }}
        onUlemaUpdated={(updated) => {
          setSelectedUlema(updated);
          setUlemas(prev => prev.map(u => (u.id === updated.id ? updated : u)));
        }}
      />
    );
  }

  const q = search.toLowerCase();
  const filtered = search ? ulemas.filter(u => u.name?.toLowerCase().includes(q)) : ulemas;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Taqreer</h2>
          <p className="page-subtitle">{ulemas.length} ulema · {filtered.length} shown</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Ulema ka naam dhundhein..." width={210} />
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(p => !p); }}>
            {showForm ? '✕ Cancel' : '+ Add Ulema'}
          </button>
        </div>
      </div>
      <ErrorBanner error={fetchError} onRetry={fetchUlemas} />

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 22 }}>
            <div className="accent-bar" />
            <h3 className="section-title">{editId ? 'Ulema Edit Karein' : 'Naya Ulema'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Ulema Ka Naam *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Bio (optional)</label>
                <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Ulema Ki Image {editId ? '(naya upload optional)' : ''}</label>
                <input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }} onChange={e => setImageFile(e.target.files[0])} />
                {(imageFile || form.image_url) && (
                  <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url} alt="" style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', marginTop: 10, border: '1px solid var(--divider)' }} />
                )}
              </div>
            </div>
            {saveError && <div className="err-banner" style={{ marginTop: 16 }}>{saveError}</div>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Karein' : 'Add Ulema'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? <GridSkeleton /> : filtered.length === 0 ? (
        <EmptyState text={search ? `"${search}" se koi ulema nahi mila` : 'Koi ulema nahi. Oopar se add karein.'} />
      ) : (
        <div style={grid}>
          {filtered.map(u => (
            <div key={u.id} style={card}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,67,.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={coverImg}>
                {u.image_url
                  ? <img src={u.image_url} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--grey-dark)" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                }
                <div style={coverOverlay} />
              </div>
              <div style={{ padding: '14px 14px 12px' }}>
                <span style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14 }}>{u.name}</span>
                <div style={{ margin: '6px 0 8px' }}>
                  <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>{u.total_tracks} audio</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button type="button" style={tracksBtn} onClick={() => setSelectedUlema(u)}>
                    🎙️ Content Manage Karein
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="tbl-btn tbl-btn-edit" style={{ flex: 1, textAlign: 'center', padding: '8px 12px' }} onClick={() => handleEdit(u)}>Edit</button>
                    <button type="button" className="tbl-btn tbl-btn-delete" style={{ flex: 1, textAlign: 'center', padding: '8px 12px' }} onClick={() => handleDelete(u.id)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UlemaTracks({ ulema, onBack, onUlemaUpdated }) {
  const [ulemaInfo, setUlemaInfo] = useState(ulema);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUlemaForm, setShowUlemaForm] = useState(false);
  const [ulemaForm, setUlemaForm] = useState({ name: ulema.name, bio: ulema.bio || '', image_url: ulema.image_url || null });
  const [ulemaImageFile, setUlemaImageFile] = useState(null);
  const [ulemaSaving, setUlemaSaving] = useState(false);
  const [ulemaSaveError, setUlemaSaveError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [trackType, setTrackType] = useState('ashra_majlis');
  const [dayNumber, setDayNumber] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [audioPreview, setAudioPreview] = useState(null);
  const [trackImageUrl, setTrackImageUrl] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => { fetchTracks(); }, [ulemaInfo.id]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/ulemas/${ulemaInfo.id}/tracks`);
      setTracks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const trackMatchesUpload = (track, uploadTitle, uploadDay) => {
    if (!track || track.title !== uploadTitle) return false;
    if (!uploadDay) return true;
    return String(track.day_number ?? '') === String(uploadDay);
  };

  const resetUlemaForm = () => {
    setUlemaForm({ name: ulemaInfo.name, bio: ulemaInfo.bio || '', image_url: ulemaInfo.image_url || null });
    setUlemaImageFile(null);
    setUlemaSaveError('');
    setShowUlemaForm(false);
  };

  const handleUlemaSubmit = async (e) => {
    e.preventDefault();
    setUlemaSaving(true);
    setUlemaSaveError('');
    try {
      const fd = new FormData();
      fd.append('name', ulemaForm.name);
      fd.append('bio', ulemaForm.bio || '');
      if (ulemaImageFile) fd.append('image', ulemaImageFile);
      const { data } = await client.post(`/ulemas/${ulemaInfo.id}`, fd);
      setUlemaInfo(data);
      onUlemaUpdated?.(data);
      resetUlemaForm();
    } catch (err) {
      setUlemaSaveError(formatApiError(err, 'Ulema update nahi hua.'));
    } finally {
      setUlemaSaving(false);
    }
  };

  const resetTrackForm = () => {
    setEditId(null);
    setTitle('');
    setTrackType('ashra_majlis');
    setDayNumber('');
    setAudioFile(null);
    setImageFile(null);
    setAudioPreview(null);
    setTrackImageUrl(null);
    setShowForm(false);
    setSaveError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId && !audioFile) { setSaveError('Audio file required'); return; }
    setSaving(true); setSaveError('');
    const uploadTitle = title;
    const uploadDay = dayNumber;
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('type', trackType);
      if (dayNumber && trackType === 'ashra_majlis') fd.append('day_number', dayNumber);
      if (audioFile) fd.append('audio', audioFile);
      if (imageFile) fd.append('image', imageFile);
      if (editId) await client.post(`/ulema-tracks/${editId}`, fd);
      else await client.post(`/ulemas/${ulemaInfo.id}/tracks`, fd);
      resetTrackForm();
      await fetchTracks();
    } catch (err) {
      try {
        const { data: latest } = await client.get(`/ulemas/${ulemaInfo.id}/tracks`);
        const rows = Array.isArray(latest) ? latest : [];
        setTracks(rows);
        if (!editId && rows.some(t => trackMatchesUpload(t, uploadTitle, uploadDay))) {
          resetTrackForm();
          return;
        }
      } catch {
        // Keep the original upload error below.
      }
      setSaveError(formatApiError(err, 'Audio save nahi hua.'));
    } finally { setSaving(false); }
  };

  const handleEdit = (t) => {
    setEditId(t.id);
    setTitle(t.title);
    setTrackType(t.type);
    setDayNumber(t.day_number ? String(t.day_number) : '');
    setAudioFile(null);
    setImageFile(null);
    setAudioPreview(t.audio_url || null);
    setTrackImageUrl(t.image_url || null);
    setShowForm(true);
    setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Audio delete karein?')) return;
    try {
      await client.delete(`/ulema-tracks/${id}`);
      if (editId === id) resetTrackForm();
      fetchTracks();
    } catch (err) {
      alert(formatApiError(err, 'Audio delete nahi hua.'));
    }
  };

  const visibleTracks = filterType === 'all' ? tracks : tracks.filter(t => t.type === filterType);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <button onClick={onBack} style={{ background: 'none', color: 'var(--gold)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: 0 }}>← Taqreer</button>
          <h2 className="page-title">{ulemaInfo.name}</h2>
          <p className="page-subtitle">{tracks.length} total audio</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-cancel" style={{ padding: '10px 16px' }} onClick={() => {
            if (showUlemaForm) resetUlemaForm();
            else { setShowForm(false); resetTrackForm(); setShowUlemaForm(true); }
          }}>{showUlemaForm ? '✕ Cancel Edit' : '✏️ Ulema Edit'}</button>
          <button type="button" className="btn-primary" onClick={() => { if (showForm) resetTrackForm(); else { setShowUlemaForm(false); setShowForm(true); } }}>
            {showForm ? '✕ Cancel' : '+ Audio Upload'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button type="button" className={filterType === 'all' ? 'btn-primary' : 'btn-cancel'} style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setFilterType('all')}>All ({tracks.length})</button>
        {TRACK_TYPES.map(t => {
          const count = tracks.filter(tr => tr.type === t.value).length;
          return (
            <button key={t.value} type="button" className={filterType === t.value ? 'btn-primary' : 'btn-cancel'} style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => setFilterType(t.value)}>
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {showUlemaForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 20 }}><div className="accent-bar" /><h3 className="section-title">Ulema Edit Karein</h3></div>
          <form onSubmit={handleUlemaSubmit}>
            <div className="form-grid-2">
              <div style={{ gridColumn: 'span 2' }}><label className="form-label">Naam *</label><input className="form-input" value={ulemaForm.name} onChange={e => setUlemaForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div style={{ gridColumn: 'span 2' }}><label className="form-label">Bio</label><textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={ulemaForm.bio} onChange={e => setUlemaForm(p => ({ ...p, bio: e.target.value }))} /></div>
              <div><label className="form-label">Image</label><input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }} onChange={e => setUlemaImageFile(e.target.files[0])} />
                {(ulemaImageFile || ulemaForm.image_url) && <img src={ulemaImageFile ? URL.createObjectURL(ulemaImageFile) : ulemaForm.image_url} alt="" style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', marginTop: 10, border: '1px solid var(--divider)' }} />}
              </div>
            </div>
            {ulemaSaveError && <div className="err-banner" style={{ marginTop: 16 }}>{ulemaSaveError}</div>}
            <div className="form-actions"><button type="button" className="btn-cancel" onClick={resetUlemaForm}>Cancel</button><button type="submit" className="btn-save" disabled={ulemaSaving}>{ulemaSaving ? 'Saving...' : 'Update'}</button></div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 20 }}><div className="accent-bar" /><h3 className="section-title">{editId ? 'Audio Edit' : 'Naya Audio Upload'}</h3></div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div><label className="form-label">Type *</label>
                <select className="form-input" value={trackType} onChange={e => setTrackType(e.target.value)} required>
                  {TRACK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div><label className="form-label">Title *</label><input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required /></div>
              {trackType === 'ashra_majlis' && (
                <div><label className="form-label">Ashra Ka Din (optional)</label>
                  <select className="form-input" value={dayNumber} onChange={e => setDayNumber(e.target.value)}>
                    <option value="">Select...</option>
                    {ASHRA_DAYS.map(d => <option key={d} value={d}>Din {d}</option>)}
                  </select>
                </div>
              )}
              <div><label className="form-label">Audio {editId ? '(optional)' : '*'}</label>
                <input type="file" accept="audio/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }} onChange={e => { const f = e.target.files[0]; setAudioFile(f); if (audioPreview?.startsWith('blob:')) URL.revokeObjectURL(audioPreview); setAudioPreview(f ? URL.createObjectURL(f) : null); }} required={!editId} />
                {audioPreview && <audio controls src={audioPreview} style={{ marginTop: 10, width: '100%', height: 36, accentColor: 'var(--gold)' }} />}
              </div>
              <div><label className="form-label">Cover Image (optional)</label><input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }} onChange={e => setImageFile(e.target.files[0])} /></div>
            </div>
            {saveError && <div className="err-banner" style={{ marginTop: 16 }}>{saveError}</div>}
            {saving && <p style={{ color: 'var(--emerald-light)', fontSize: 13, marginTop: 12 }}>⬆ Uploading...</p>}
            <div className="form-actions"><button type="button" className="btn-cancel" onClick={resetTrackForm}>Cancel</button><button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Upload'}</button></div>
          </form>
        </div>
      )}

      {playing && <audio autoPlay src={playing} onEnded={() => setPlaying(null)} style={{ display: 'none' }} />}

      {loading ? <TableSkeleton /> : visibleTracks.length === 0 ? (
        <EmptyState text="Koi audio nahi. Oopar se upload karein." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr>{['#', 'Type', 'Title', 'Din', 'Duration', 'Preview', 'Actions'].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {visibleTracks.map((t, i) => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--grey-dark)', fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ fontSize: 12 }}>{typeLabel(t.type)}</td>
                  <td style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13 }}>{t.title}</td>
                  <td style={{ fontSize: 12 }}>{t.day_number ? `Din ${t.day_number}` : '—'}</td>
                  <td style={{ fontSize: 12 }}>{t.duration || '—'}</td>
                  <td><button className="tbl-btn tbl-btn-play" onClick={() => setPlaying(playing === t.audio_url ? null : t.audio_url)}>{playing === t.audio_url ? '■ Stop' : '▶ Play'}</button></td>
                  <td><div style={{ display: 'flex', gap: 6 }}><button className="tbl-btn tbl-btn-edit" onClick={() => handleEdit(t)}>Edit</button><button className="tbl-btn tbl-btn-delete" onClick={() => handleDelete(t.id)}>Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--grey-dark)" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <p style={{ color: 'var(--grey)', fontSize: 14 }}>{text}</p>
    </div>
  );
}

function TableSkeleton() {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{[1,2,3].map(i => <div key={i} style={{ height: 52, background: 'var(--bg-card)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite', border: '1px solid var(--divider)' }} />)}<style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style></div>;
}

function GridSkeleton() {
  return <div style={grid}>{[1,2,3,4,5,6].map(i => <div key={i} style={{ ...card, height: 220, animation: 'pulse 1.5s ease-in-out infinite' }} />)}<style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style></div>;
}

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 };
const card = { background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: 16, overflow: 'hidden', transition: 'border-color .2s, transform .2s' };
const coverImg = { width: '100%', height: 115, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' };
const coverOverlay = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(4,12,6,.7), transparent)' };
const tracksBtn = { flex: 1, background: 'linear-gradient(135deg, rgba(212,168,67,.2), rgba(212,168,67,.08))', color: 'var(--gold)', border: '1px solid rgba(212,168,67,.3)', borderRadius: 8, padding: '6px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer' };
