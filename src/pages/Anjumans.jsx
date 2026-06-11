import { useState, useEffect } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import { fetchList, KEYS } from '../api/listCache';
import ErrorBanner from '../components/ErrorBanner';
import SearchInput from '../components/SearchInput';
import AudioProcessor from '../components/AudioProcessor';

const OCCASIONS = ['Muharram', 'Safar', 'Chehlum', 'Wiladat', 'Shahadat', 'General'];
const emptyForm = { name: '', state: '', city: '', bio: '', is_verified: false, image_url: null };

export default function Anjumans() {
  const [anjumans, setAnjumans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selectedAnjuman, setSelectedAnjuman] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAnjumans(); }, []);

  const fetchAnjumans = (force = false) => fetchList({
    key: KEYS.ANJUMANS,
    url: '/anjumans',
    force,
    setData: setAnjumans,
    setLoading,
    setError: setFetchError,
    errorFallback: 'Anjumans load nahi hue. 2 minute wait karein.',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('state', form.state);
      fd.append('city', form.city);
      fd.append('bio', form.bio || '');
      fd.append('is_verified', form.is_verified ? '1' : '0');
      if (imageFile) fd.append('image', imageFile);
      if (editId) await client.post(`/anjumans/${editId}`, fd);
      else await client.post('/anjumans', fd);
      resetForm(); fetchAnjumans(true);
    } catch (err) {
      setSaveError(formatApiError(err, 'Anjuman save nahi hua.'));
    } finally { setSaving(false); }
  };

  const handleEdit = (a) => {
    setForm({ name: a.name, state: a.state || '', city: a.city, bio: a.bio || '', is_verified: !!a.is_verified, image_url: a.image_url || null });
    setEditId(a.id); setImageFile(null); setShowForm(true); setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Anjuman aur uske tamam tracks delete ho jayenge. Sure?')) return;
    try {
      await client.delete(`/anjumans/${id}`);
      fetchAnjumans();
      if (selectedAnjuman?.id === id) setSelectedAnjuman(null);
    } catch (err) {
      alert(formatApiError(err, 'Anjuman delete nahi hua.'));
    }
  };

  const resetForm = () => { setForm(emptyForm); setEditId(null); setImageFile(null); setShowForm(false); setSaveError(''); };

  if (selectedAnjuman) {
    return (
      <AnjumanTracks
        anjuman={selectedAnjuman}
        onBack={() => { setSelectedAnjuman(null); fetchAnjumans(true); }}
        onAnjumanUpdated={(updated) => {
          setSelectedAnjuman(updated);
          setAnjumans(prev => prev.map(a => (a.id === updated.id ? updated : a)));
        }}
      />
    );
  }

  const q = search.toLowerCase();
  const filtered = search
    ? anjumans.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.state?.toLowerCase().includes(q) ||
        a.city?.toLowerCase().includes(q)
      )
    : anjumans;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Anjumans</h2>
          <p className="page-subtitle">{anjumans.length} total · {filtered.length} shown</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Naam, state ya city se dhundhein..."
            width={210}
          />
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(p => !p); }}>
            {showForm ? '✕ Cancel' : '+ Add Anjuman'}
          </button>
        </div>
      </div>
      <ErrorBanner error={fetchError} onRetry={() => fetchAnjumans(true)} />

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 22 }}>
            <div className="accent-bar" />
            <h3 className="section-title">{editId ? 'Anjuman Edit Karein' : 'Naya Anjuman'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Anjuman Ka Naam *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">State *</label>
                <input className="form-input" placeholder="e.g. Bihar, Uttar Pradesh" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">City *</label>
                <input className="form-input" placeholder="e.g. Patna, Lucknow" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Bio (optional)</label>
                <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Cover Image {editId ? '(naya upload optional)' : ''}</label>
                <input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }} onChange={e => setImageFile(e.target.files[0])} />
                {(imageFile || form.image_url) && (
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : form.image_url}
                    alt=""
                    style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', marginTop: 10, border: '1px solid var(--divider)' }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: 28 }}>
                <button type="button"
                  onClick={() => setForm(p => ({ ...p, is_verified: !p.is_verified }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: form.is_verified ? 'rgba(22,163,74,.12)' : 'var(--bg-surface)',
                    border: `1px solid ${form.is_verified ? 'rgba(22,163,74,.4)' : 'var(--divider)'}`,
                    color: form.is_verified ? 'var(--emerald-light)' : 'var(--grey)',
                    borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    transition: 'all .15s', width: '100%',
                  }}>
                  <span style={{ fontSize: 16 }}>{form.is_verified ? '✅' : '⬜'}</span>
                  Verified Anjuman
                </button>
              </div>
            </div>
            {saveError && <div className="err-banner" style={{ marginTop: 16 }}>{saveError}</div>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Karein' : 'Add Anjuman'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <GridSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState text={search ? `"${search}" se koi anjuman nahi mili` : 'Koi anjuman nahi mili. Oopar se add karein.'} />
      ) : (
        <div style={grid}>
          {filtered.map(a => (
            <div key={a.id} style={card}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,67,.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.transform = 'none'; }}
            >
              {/* Cover image */}
              <div style={coverImg}>
                {a.image_url
                  ? <img src={a.image_url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--grey-dark)" strokeWidth="1.5">
                      <path d="M3 22h18M9 22V8l3-6 3 6v14M5 22V12l-2-2M19 22V12l2-2"/>
                      <line x1="9" y1="11" x2="15" y2="11"/>
                    </svg>
                }
                <div style={coverOverlay} />
                {a.is_verified && (
                  <div style={verifiedBadge}>✓ Verified</div>
                )}
              </div>

              <div style={{ padding: '14px 14px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{a.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: 'var(--gold)', fontSize: 12 }}>📍 {a.city}</span>
                  {a.state && <>
                    <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>·</span>
                    <span style={{ color: 'var(--grey)', fontSize: 11 }}>{a.state}</span>
                  </>}
                  <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>·</span>
                  <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>{a.total_tracks} tracks</span>
                </div>
                {a.bio && <p style={{ color: 'var(--grey)', fontSize: 12, lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.bio}</p>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <button type="button" style={tracksBtn} onClick={() => setSelectedAnjuman(a)}>
                    🎵 Tracks Manage Karein
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="tbl-btn tbl-btn-edit" style={{ flex: 1, textAlign: 'center', padding: '8px 12px' }} onClick={() => handleEdit(a)}>Edit</button>
                    <button type="button" className="tbl-btn tbl-btn-delete" style={{ flex: 1, textAlign: 'center', padding: '8px 12px' }} onClick={() => handleDelete(a.id)}>Delete</button>
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

function AnjumanTracks({ anjuman, onBack, onAnjumanUpdated }) {
  const [anjumanInfo, setAnjumanInfo] = useState(anjuman);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAnjumanForm, setShowAnjumanForm] = useState(false);
  const [anjumanForm, setAnjumanForm] = useState({
    name: anjuman.name,
    state: anjuman.state || '',
    city: anjuman.city,
    bio: anjuman.bio || '',
    is_verified: !!anjuman.is_verified,
    image_url: anjuman.image_url || null,
  });
  const [anjumanImageFile, setAnjumanImageFile] = useState(null);
  const [anjumanSaving, setAnjumanSaving] = useState(false);
  const [anjumanSaveError, setAnjumanSaveError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [audioPreview, setAudioPreview] = useState(null);
  const [trackImageUrl, setTrackImageUrl] = useState(null);
  const [playing, setPlaying] = useState(null);

  useEffect(() => { fetchTracks(); }, [anjumanInfo.id]);

  const fetchTracks = () => {
    setLoading(true);
    client.get(`/anjumans/${anjumanInfo.id}/tracks`)
      .then(r => setTracks(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const resetAnjumanForm = () => {
    setAnjumanForm({
      name: anjumanInfo.name,
      state: anjumanInfo.state || '',
      city: anjumanInfo.city,
      bio: anjumanInfo.bio || '',
      is_verified: !!anjumanInfo.is_verified,
      image_url: anjumanInfo.image_url || null,
    });
    setAnjumanImageFile(null);
    setAnjumanSaveError('');
    setShowAnjumanForm(false);
  };

  const handleAnjumanSubmit = async (e) => {
    e.preventDefault();
    setAnjumanSaving(true);
    setAnjumanSaveError('');
    try {
      const fd = new FormData();
      fd.append('name', anjumanForm.name);
      fd.append('state', anjumanForm.state);
      fd.append('city', anjumanForm.city);
      fd.append('bio', anjumanForm.bio || '');
      fd.append('is_verified', anjumanForm.is_verified ? '1' : '0');
      if (anjumanImageFile) fd.append('image', anjumanImageFile);
      const { data } = await client.post(`/anjumans/${anjumanInfo.id}`, fd);
      setAnjumanInfo(data);
      onAnjumanUpdated?.(data);
      resetAnjumanForm();
    } catch (err) {
      setAnjumanSaveError(formatApiError(err, 'Anjuman update nahi hua.'));
    } finally {
      setAnjumanSaving(false);
    }
  };

  const resetTrackForm = () => {
    setEditId(null);
    setTitle('');
    setOccasion('');
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
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('occasion', occasion);
      if (audioFile) fd.append('audio', audioFile);
      if (imageFile) fd.append('image', imageFile);
      if (editId) await client.post(`/anjuman-tracks/${editId}`, fd);
      else await client.post(`/anjumans/${anjumanInfo.id}/tracks`, fd);
      resetTrackForm();
      fetchTracks();
    } catch (err) {
      setSaveError(formatApiError(err, 'Track save nahi hua.'));
    } finally { setSaving(false); }
  };

  const handleEdit = (t) => {
    setEditId(t.id);
    setTitle(t.title);
    setOccasion(t.occasion || '');
    setAudioFile(null);
    setImageFile(null);
    setAudioPreview(t.audio_url || null);
    setTrackImageUrl(t.image_url || null);
    setShowForm(true);
    setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Track delete karein?')) return;
    try {
      await client.delete(`/anjuman-tracks/${id}`);
      if (editId === id) resetTrackForm();
      fetchTracks();
    } catch (err) {
      alert(formatApiError(err, 'Track delete nahi hua.'));
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <button onClick={onBack} style={{ background: 'none', color: 'var(--gold)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: 0 }}>
            ← Anjumans
          </button>
          <h2 className="page-title">{anjumanInfo.name}</h2>
          <p className="page-subtitle">📍 {anjumanInfo.city}{anjumanInfo.state ? `, ${anjumanInfo.state}` : ''} · {tracks.length} tracks</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-cancel"
            style={{ padding: '10px 16px' }}
            onClick={() => {
              if (showAnjumanForm) resetAnjumanForm();
              else {
                setShowForm(false);
                resetTrackForm();
                setShowAnjumanForm(true);
              }
            }}
          >
            {showAnjumanForm ? '✕ Cancel Edit' : '✏️ Anjuman Edit'}
          </button>
          <button type="button" className="btn-primary" onClick={() => { if (showForm) resetTrackForm(); else { setShowAnjumanForm(false); setShowForm(true); } }}>
            {showForm ? '✕ Cancel' : '+ Track Upload'}
          </button>
        </div>
      </div>

      {showAnjumanForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 20 }}>
            <div className="accent-bar" />
            <h3 className="section-title">Anjuman Edit Karein</h3>
          </div>
          <form onSubmit={handleAnjumanSubmit}>
            <div className="form-grid-2">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Anjuman Ka Naam *</label>
                <input className="form-input" value={anjumanForm.name} onChange={e => setAnjumanForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">State *</label>
                <input className="form-input" placeholder="e.g. Bihar, Uttar Pradesh" value={anjumanForm.state} onChange={e => setAnjumanForm(p => ({ ...p, state: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">City *</label>
                <input className="form-input" placeholder="e.g. Patna, Lucknow" value={anjumanForm.city} onChange={e => setAnjumanForm(p => ({ ...p, city: e.target.value }))} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Bio (optional)</label>
                <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={anjumanForm.bio} onChange={e => setAnjumanForm(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Cover Image (optional)</label>
                <input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }} onChange={e => setAnjumanImageFile(e.target.files[0])} />
                {(anjumanImageFile || anjumanForm.image_url) && (
                  <img
                    src={anjumanImageFile ? URL.createObjectURL(anjumanImageFile) : anjumanForm.image_url}
                    alt=""
                    style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', marginTop: 10, border: '1px solid var(--divider)' }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', paddingTop: 28 }}>
                <button
                  type="button"
                  onClick={() => setAnjumanForm(p => ({ ...p, is_verified: !p.is_verified }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: anjumanForm.is_verified ? 'rgba(22,163,74,.12)' : 'var(--bg-surface)',
                    border: `1px solid ${anjumanForm.is_verified ? 'rgba(22,163,74,.4)' : 'var(--divider)'}`,
                    color: anjumanForm.is_verified ? 'var(--emerald-light)' : 'var(--grey)',
                    borderRadius: 10, padding: '10px 16px', fontSize: 13, fontWeight: 600,
                    transition: 'all .15s', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{anjumanForm.is_verified ? '✅' : '⬜'}</span>
                  Verified Anjuman
                </button>
              </div>
            </div>
            {anjumanSaveError && <div className="err-banner" style={{ marginTop: 16 }}>{anjumanSaveError}</div>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetAnjumanForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={anjumanSaving}>
                {anjumanSaving ? 'Saving...' : 'Update Karein'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 20 }}>
            <div className="accent-bar" />
            <h3 className="section-title">{editId ? 'Track Edit Karein' : 'Naya Track Upload'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div>
                <label className="form-label">Track Title *</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Occasion</label>
                <select className="form-input" value={occasion} onChange={e => setOccasion(e.target.value)}>
                  <option value="">Select...</option>
                  {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Audio File {editId ? '(optional — naya upload)' : '* (MP3/WAV)'}</label>
                <input type="file" accept="audio/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }}
                  onChange={e => {
                    const f = e.target.files[0];
                    setAudioFile(f);
                    if (audioPreview?.startsWith('blob:')) URL.revokeObjectURL(audioPreview);
                    setAudioPreview(f ? URL.createObjectURL(f) : null);
                  }}
                  required={!editId} />
                {audioPreview && <audio controls src={audioPreview} style={{ marginTop: 10, width: '100%', height: 36, accentColor: 'var(--gold)' }} />}
                <AudioProcessor
                  file={audioFile}
                  onProcessed={(processedFile, processedUrl) => {
                    setAudioFile(processedFile);
                    if (audioPreview?.startsWith('blob:')) URL.revokeObjectURL(audioPreview);
                    setAudioPreview(processedUrl);
                  }}
                />
              </div>
              <div>
                <label className="form-label">Cover Image (optional)</label>
                <input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }} onChange={e => setImageFile(e.target.files[0])} />
                {(imageFile || trackImageUrl) && (
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : trackImageUrl}
                    alt=""
                    style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', marginTop: 10, border: '1px solid var(--divider)' }}
                  />
                )}
              </div>
            </div>
            {saveError && <div className="err-banner" style={{ marginTop: 16 }}>{saveError}</div>}
            {saving && <p style={{ color: 'var(--emerald-light)', fontSize: 13, marginTop: 12 }}>⬆ Uploading to Cloudinary... please wait</p>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetTrackForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update Track' : 'Upload Track'}
              </button>
            </div>
          </form>
        </div>
      )}

      {playing && <audio autoPlay src={playing} onEnded={() => setPlaying(null)} style={{ display: 'none' }} />}

      {loading ? <TableSkeleton /> : tracks.length === 0 ? (
        <EmptyState text="Koi track nahi. Oopar se upload karein." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {['#', 'Cover + Title', 'Occasion', 'Duration', 'Plays', 'Preview', 'Actions'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {tracks.map((t, i) => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--grey-dark)', fontWeight: 700 }}>{i + 1}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {t.image_url
                        ? <img src={t.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                        : <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--grey-dark)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                          </div>
                      }
                      <span style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13 }}>{t.title}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>{t.occasion || '—'}</td>
                  <td style={{ fontSize: 12 }}>{t.duration || '—'}</td>
                  <td>
                    <span style={{ background: 'rgba(22,163,74,.1)', color: 'var(--emerald-light)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{t.play_count}</span>
                  </td>
                  <td>
                    <button className="tbl-btn tbl-btn-play" onClick={() => setPlaying(playing === t.audio_url ? null : t.audio_url)}>
                      {playing === t.audio_url ? '■ Stop' : '▶ Play'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="tbl-btn tbl-btn-edit" onClick={() => handleEdit(t)}>Edit</button>
                      <button className="tbl-btn tbl-btn-delete" onClick={() => handleDelete(t.id)}>Delete</button>
                    </div>
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

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--grey-dark)" strokeWidth="1.5">
          <path d="M3 22h18M9 22V8l3-6 3 6v14M5 22V12l-2-2M19 22V12l2-2"/>
        </svg>
      </div>
      <p style={{ color: 'var(--grey)', fontSize: 14 }}>{text}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {[1,2,3].map(i => <div key={i} style={{ height: 52, background: 'var(--bg-card)', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite', border: '1px solid var(--divider)' }} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div style={grid}>
      {[1,2,3,4,5,6].map(i => <div key={i} style={{ ...card, height: 220, animation: 'pulse 1.5s ease-in-out infinite' }} />)}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 14,
};

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: 16,
  overflow: 'hidden',
  transition: 'border-color .2s, transform .2s',
};

const coverImg = {
  width: '100%',
  height: 115,
  background: 'var(--bg-surface)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
};

const coverOverlay = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(to top, rgba(4,12,6,.7), transparent)',
};

const verifiedBadge = {
  position: 'absolute',
  top: 8, right: 8,
  background: 'rgba(212,168,67,.9)',
  color: '#000',
  fontSize: 10,
  fontWeight: 700,
  padding: '3px 8px',
  borderRadius: 20,
};

const tracksBtn = {
  flex: 1,
  background: 'linear-gradient(135deg, rgba(212,168,67,.2), rgba(212,168,67,.08))',
  color: 'var(--gold)',
  border: '1px solid rgba(212,168,67,.3)',
  borderRadius: 8,
  padding: '6px 10px',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  transition: 'opacity .15s',
};
