import { useState, useEffect } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import { fetchList, KEYS } from '../api/listCache';
import ErrorBanner from '../components/ErrorBanner';
import SearchInput from '../components/SearchInput';
import AudioProcessor from '../components/AudioProcessor';

const ASHRA_DAYS = Array.from({ length: 10 }, (_, i) => i + 1);
const emptyForm = { name: '', bio: '', image_url: null };

export default function AshraMajlis() {
  const [maulanas, setMaulanas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selectedMaulana, setSelectedMaulana] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { fetchMaulanas(); }, []);

  const fetchMaulanas = (force = false) => fetchList({
    key: KEYS.MAULANAS,
    url: '/maulanas',
    force,
    setData: setMaulanas,
    setLoading,
    setError: setFetchError,
    errorFallback: 'Maulanas load nahi hue. 2 minute wait karein.',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('bio', form.bio || '');
      if (imageFile) fd.append('image', imageFile);
      if (editId) await client.post(`/maulanas/${editId}`, fd);
      else await client.post('/maulanas', fd);
      resetForm(); fetchMaulanas();
    } catch (err) {
      setSaveError(formatApiError(err, 'Maulana save nahi hua.'));
    } finally { setSaving(false); }
  };

  const handleEdit = (m) => {
    setForm({ name: m.name, bio: m.bio || '', image_url: m.image_url || null });
    setEditId(m.id); setImageFile(null); setShowForm(true); setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Maulana aur uske tamam Ashra Majlis audio delete ho jayenge. Sure?')) return;
    try {
      await client.delete(`/maulanas/${id}`);
      fetchMaulanas();
      if (selectedMaulana?.id === id) setSelectedMaulana(null);
    } catch (err) {
      alert(formatApiError(err, 'Maulana delete nahi hua.'));
    }
  };

  const resetForm = () => { setForm(emptyForm); setEditId(null); setImageFile(null); setShowForm(false); setSaveError(''); };

  if (selectedMaulana) {
    return (
      <MaulanaTracks
        maulana={selectedMaulana}
        onBack={() => { setSelectedMaulana(null); fetchMaulanas(); }}
        onMaulanaUpdated={(updated) => {
          setSelectedMaulana(updated);
          setMaulanas(prev => prev.map(m => (m.id === updated.id ? updated : m)));
        }}
      />
    );
  }

  const q = search.toLowerCase();
  const filtered = search
    ? maulanas.filter(m => m.name?.toLowerCase().includes(q))
    : maulanas;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Ashra Majlis</h2>
          <p className="page-subtitle">{maulanas.length} maulana · {filtered.length} shown</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Maulana ka naam dhundhein..."
            width={210}
          />
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(p => !p); }}>
            {showForm ? '✕ Cancel' : '+ Add Maulana'}
          </button>
        </div>
      </div>
      <ErrorBanner error={fetchError} onRetry={fetchMaulanas} />

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 22 }}>
            <div className="accent-bar" />
            <h3 className="section-title">{editId ? 'Maulana Edit Karein' : 'Naya Maulana'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Maulana Ka Naam *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Bio (optional)</label>
                <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Maulana Ki Image {editId ? '(naya upload optional)' : ''}</label>
                <input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }} onChange={e => setImageFile(e.target.files[0])} />
                {(imageFile || form.image_url) && (
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : form.image_url}
                    alt=""
                    style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', marginTop: 10, border: '1px solid var(--divider)' }}
                  />
                )}
              </div>
            </div>
            {saveError && <div className="err-banner" style={{ marginTop: 16 }}>{saveError}</div>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update Karein' : 'Add Maulana'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <GridSkeleton />
      ) : filtered.length === 0 ? (
        <EmptyState text={search ? `"${search}" se koi maulana nahi mila` : 'Koi maulana nahi. Oopar se add karein.'} />
      ) : (
        <div style={grid}>
          {filtered.map(m => (
            <div key={m.id} style={card}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,168,67,.25)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={coverImg}>
                {m.image_url
                  ? <img src={m.image_url} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--grey-dark)" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                }
                <div style={coverOverlay} />
              </div>

              <div style={{ padding: '14px 14px 12px' }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>{m.name}</span>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>{m.total_tracks} majlis audio</span>
                </div>
                {m.bio && <p style={{ color: 'var(--grey)', fontSize: 12, lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.bio}</p>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                  <button type="button" style={tracksBtn} onClick={() => setSelectedMaulana(m)}>
                    🎵 Ashra Majlis Manage Karein
                  </button>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="tbl-btn tbl-btn-edit" style={{ flex: 1, textAlign: 'center', padding: '8px 12px' }} onClick={() => handleEdit(m)}>Edit</button>
                    <button type="button" className="tbl-btn tbl-btn-delete" style={{ flex: 1, textAlign: 'center', padding: '8px 12px' }} onClick={() => handleDelete(m.id)}>Delete</button>
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

function MaulanaTracks({ maulana, onBack, onMaulanaUpdated }) {
  const [maulanaInfo, setMaulanaInfo] = useState(maulana);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMaulanaForm, setShowMaulanaForm] = useState(false);
  const [maulanaForm, setMaulanaForm] = useState({
    name: maulana.name,
    bio: maulana.bio || '',
    image_url: maulana.image_url || null,
  });
  const [maulanaImageFile, setMaulanaImageFile] = useState(null);
  const [maulanaSaving, setMaulanaSaving] = useState(false);
  const [maulanaSaveError, setMaulanaSaveError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [dayNumber, setDayNumber] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [audioPreview, setAudioPreview] = useState(null);
  const [trackImageUrl, setTrackImageUrl] = useState(null);
  const [playing, setPlaying] = useState(null);

  useEffect(() => { fetchTracks(); }, [maulanaInfo.id]);

  const fetchTracks = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/maulanas/${maulanaInfo.id}/tracks`);
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

  const resetMaulanaForm = () => {
    setMaulanaForm({
      name: maulanaInfo.name,
      bio: maulanaInfo.bio || '',
      image_url: maulanaInfo.image_url || null,
    });
    setMaulanaImageFile(null);
    setMaulanaSaveError('');
    setShowMaulanaForm(false);
  };

  const handleMaulanaSubmit = async (e) => {
    e.preventDefault();
    setMaulanaSaving(true);
    setMaulanaSaveError('');
    try {
      const fd = new FormData();
      fd.append('name', maulanaForm.name);
      fd.append('bio', maulanaForm.bio || '');
      if (maulanaImageFile) fd.append('image', maulanaImageFile);
      const { data } = await client.post(`/maulanas/${maulanaInfo.id}`, fd);
      setMaulanaInfo(data);
      onMaulanaUpdated?.(data);
      resetMaulanaForm();
    } catch (err) {
      setMaulanaSaveError(formatApiError(err, 'Maulana update nahi hua.'));
    } finally {
      setMaulanaSaving(false);
    }
  };

  const resetTrackForm = () => {
    setEditId(null);
    setTitle('');
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
      if (dayNumber) fd.append('day_number', dayNumber);
      if (audioFile) fd.append('audio', audioFile);
      if (imageFile) fd.append('image', imageFile);
      if (editId) await client.post(`/maulana-tracks/${editId}`, fd);
      else await client.post(`/maulanas/${maulanaInfo.id}/tracks`, fd);
      resetTrackForm();
      await fetchTracks();
    } catch (err) {
      try {
        const { data: latest } = await client.get(`/maulanas/${maulanaInfo.id}/tracks`);
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
    if (!window.confirm('Ashra Majlis audio delete karein?')) return;
    try {
      await client.delete(`/maulana-tracks/${id}`);
      if (editId === id) resetTrackForm();
      fetchTracks();
    } catch (err) {
      alert(formatApiError(err, 'Audio delete nahi hua.'));
    }
  };

  const toggleAds = async (t) => {
    try {
      const fd = new FormData();
      fd.append('ads_enabled', t.ads_enabled === false ? '1' : '0');
      await client.post(`/maulana-tracks/${t.id}`, fd);
      fetchTracks();
    } catch (err) {
      alert(formatApiError(err, 'Ads setting update nahi hua.'));
    }
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <button onClick={onBack} style={{ background: 'none', color: 'var(--gold)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: 0 }}>
            ← Ashra Majlis
          </button>
          <h2 className="page-title">{maulanaInfo.name}</h2>
          <p className="page-subtitle">{tracks.length} majlis audio</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn-cancel"
            style={{ padding: '10px 16px' }}
            onClick={() => {
              if (showMaulanaForm) resetMaulanaForm();
              else {
                setShowForm(false);
                resetTrackForm();
                setShowMaulanaForm(true);
              }
            }}
          >
            {showMaulanaForm ? '✕ Cancel Edit' : '✏️ Maulana Edit'}
          </button>
          <button type="button" className="btn-primary" onClick={() => { if (showForm) resetTrackForm(); else { setShowMaulanaForm(false); setShowForm(true); } }}>
            {showForm ? '✕ Cancel' : '+ Ashra Audio Upload'}
          </button>
        </div>
      </div>

      {showMaulanaForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 20 }}>
            <div className="accent-bar" />
            <h3 className="section-title">Maulana Edit Karein</h3>
          </div>
          <form onSubmit={handleMaulanaSubmit}>
            <div className="form-grid-2">
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Maulana Ka Naam *</label>
                <input className="form-input" value={maulanaForm.name} onChange={e => setMaulanaForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Bio (optional)</label>
                <textarea className="form-input" style={{ height: 80, resize: 'vertical' }} value={maulanaForm.bio} onChange={e => setMaulanaForm(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Image (optional)</label>
                <input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }} onChange={e => setMaulanaImageFile(e.target.files[0])} />
                {(maulanaImageFile || maulanaForm.image_url) && (
                  <img
                    src={maulanaImageFile ? URL.createObjectURL(maulanaImageFile) : maulanaForm.image_url}
                    alt=""
                    style={{ width: 68, height: 68, borderRadius: 10, objectFit: 'cover', marginTop: 10, border: '1px solid var(--divider)' }}
                  />
                )}
              </div>
            </div>
            {maulanaSaveError && <div className="err-banner" style={{ marginTop: 16 }}>{maulanaSaveError}</div>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetMaulanaForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={maulanaSaving}>
                {maulanaSaving ? 'Saving...' : 'Update Karein'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 20 }}>
            <div className="accent-bar" />
            <h3 className="section-title">{editId ? 'Ashra Audio Edit Karein' : 'Naya Ashra Majlis Audio'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div>
                <label className="form-label">Title *</label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Pehla Din Majlis" />
              </div>
              <div>
                <label className="form-label">Ashra Ka Din (optional)</label>
                <select className="form-input" value={dayNumber} onChange={e => setDayNumber(e.target.value)}>
                  <option value="">Select...</option>
                  {ASHRA_DAYS.map(d => <option key={d} value={d}>Din {d}</option>)}
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
            {saving && <p style={{ color: 'var(--emerald-light)', fontSize: 13, marginTop: 12 }}>⬆ Uploading... please wait</p>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetTrackForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update Audio' : 'Upload Audio'}
              </button>
            </div>
          </form>
        </div>
      )}

      {playing && <audio autoPlay src={playing} onEnded={() => setPlaying(null)} style={{ display: 'none' }} />}

      {loading ? <TableSkeleton /> : tracks.length === 0 ? (
        <EmptyState text="Koi Ashra Majlis audio nahi. Oopar se upload karein." />
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {['#', 'Cover + Title', 'Din', 'Duration', 'Plays', 'Ads', 'Preview', 'Actions'].map(h => <th key={h}>{h}</th>)}
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
                  <td style={{ fontSize: 12 }}>{t.day_number ? `Din ${t.day_number}` : '—'}</td>
                  <td style={{ fontSize: 12 }}>{t.duration || '—'}</td>
                  <td>
                    <span style={{ background: 'rgba(22,163,74,.1)', color: 'var(--emerald-light)', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{t.play_count}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="tbl-btn"
                      onClick={() => toggleAds(t)}
                      title={t.ads_enabled === false ? 'Ads on karein' : 'Ads off karein'}
                      style={{
                        color: t.ads_enabled === false ? 'var(--grey)' : 'var(--emerald-light)',
                        borderColor: t.ads_enabled === false ? 'var(--divider)' : 'rgba(22,163,74,.35)',
                        background: t.ads_enabled === false ? 'transparent' : 'rgba(22,163,74,.12)',
                      }}
                    >
                      {t.ads_enabled === false ? '🔇 Off' : '🔊 On'}
                    </button>
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
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
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
