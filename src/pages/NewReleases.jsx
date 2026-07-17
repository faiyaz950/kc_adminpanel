import { useState, useEffect, useRef } from 'react';
import client from '../api/client';

// ─── New Releases — home screen ke "New releases" section ke cards ────────────

const RELEASE_TYPES = ['Single', 'EP', 'Album'];

export default function NewReleases() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm());
  const [editId, setEditId]     = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview]   = useState(null);

  // Track picker — already-uploaded reciter tracks, browsable (no typing required)
  const [allTracks, setAllTracks]       = useState([]);
  const [tracksLoaded, setTracksLoaded] = useState(false);
  const [trackQuery, setTrackQuery]     = useState('');
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [pickedTrack, setPickedTrack]   = useState(null); // { id, title, reciter_name, image_url }
  const pickerRef = useRef(null);

  function emptyForm() {
    return { title: '', release_type: 'Single', artists: '', is_active: true, sort_order: 0 };
  }

  const load = () => {
    setLoading(true);
    client.get('/admin/new-releases')
      .then(r => setReleases(r.data))
      .catch(() => setError('New releases load nahi hue'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Uploaded tracks ek baar load karke rakhte hain — dropdown turant khulta hai
  const loadTracksIfNeeded = () => {
    if (tracksLoaded) return;
    setTracksLoaded(true);
    client.get('/tracks')
      .then(r => setAllTracks(Array.isArray(r.data) ? r.data : []))
      .catch(() => setAllTracks([]));
  };

  useEffect(() => {
    const onClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const trackResults = (() => {
    const q = trackQuery.trim().toLowerCase();
    const list = !q
      ? allTracks
      : allTracks.filter(t =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.reciter_name || t.reciter?.name || '').toLowerCase().includes(q)
        );
    return list.slice(0, 40);
  })();

  const openAdd = () => {
    setEditId(null);
    setForm({ ...emptyForm(), sort_order: releases.length });
    setImageFile(null);
    setPreview(null);
    setPickedTrack(null);
    setTrackQuery('');
    setPickerOpen(false);
    setShowForm(true);
    loadTracksIfNeeded();
  };

  const openEdit = (r) => {
    setEditId(r.id);
    setForm({
      title: r.title || '',
      release_type: r.release_type || 'Single',
      artists: r.artists || '',
      is_active: r.is_active,
      sort_order: r.sort_order,
    });
    setImageFile(null);
    setPreview(r.image_url);
    setPickedTrack(r.track_id ? { id: r.track_id, title: `Track #${r.track_id}`, reciter_name: '', _placeholder: true } : null);
    setTrackQuery('');
    setPickerOpen(false);
    setShowForm(true);
    loadTracksIfNeeded();
  };

  // Edit form khulne par jo track pehle se linked hai, uski asli details fill karo
  useEffect(() => {
    if (pickedTrack?._placeholder && allTracks.length > 0) {
      const match = allTracks.find(t => String(t.id) === String(pickedTrack.id));
      if (match) setPickedTrack(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTracks]);

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Title zaroori hai'); return; }
    if (!editId && !imageFile) { setError('Cover image select karein'); return; }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      fd.append('release_type', form.release_type);
      if (form.artists) fd.append('artists', form.artists.trim());
      fd.append('is_active', form.is_active ? '1' : '0');
      fd.append('sort_order', String(form.sort_order));
      fd.append('track_id', pickedTrack ? String(pickedTrack.id) : '');
      fd.append('track_type', pickedTrack ? 'track' : '');
      if (imageFile) fd.append('image', imageFile);
      if (editId) {
        await client.post(`/new-releases/${editId}`, fd);
      } else {
        await client.post('/new-releases', fd);
      }
      setShowForm(false);
      setImageFile(null);
      load();
    } catch {
      setError('Save fail — image format check karein (JPEG/PNG/WebP, max 5MB)');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r) => {
    try {
      const fd = new FormData();
      fd.append('is_active', r.is_active ? '0' : '1');
      await client.post(`/new-releases/${r.id}`, fd);
      load();
    } catch { setError('Update fail'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Ye release delete karein?')) return;
    try {
      await client.delete(`/new-releases/${id}`);
      load();
    } catch { setError('Delete fail'); }
  };

  const inputStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--divider)',
    borderRadius: 10, color: 'var(--white)', padding: '10px 14px',
    fontSize: 13, width: '100%', outline: 'none',
  };
  const labelStyle = { color: 'var(--grey)', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 };

  return (
    <div className="page-wrapper" style={{ maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800, margin: 0 }}>New Releases</h1>
          <p style={{ color: 'var(--grey)', fontSize: 13, margin: '4px 0 0' }}>
            Home screen ke "New releases" section ke cards manage karein
          </p>
        </div>
        <button onClick={openAdd} style={{
          background: 'linear-gradient(135deg, var(--emerald), var(--emerald-light))',
          color: '#fff', border: 'none', borderRadius: 10,
          padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Release
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Add / Edit Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--divider)',
          borderRadius: 16, padding: 24, marginBottom: 24,
        }}>
          <h3 style={{ color: 'var(--white)', fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>
            {editId ? 'Edit Release' : 'New Release Add Karein'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>Title *</label>
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Hussain Kehtay Hain"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select
                value={form.release_type}
                onChange={e => setForm({ ...form, release_type: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {RELEASE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Artists</label>
              <input
                value={form.artists}
                onChange={e => setForm({ ...form, artists: e.target.value })}
                placeholder="e.g. Nadeem Sarwar, Ali Shanawar"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input
                type="number"
                min="0"
                value={form.sort_order}
                onChange={e => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Cover image */}
          <div style={{ marginTop: 16 }}>
            <label style={labelStyle}>Cover Image {editId ? '(change karne ke liye select karein)' : '*'} — square best lagti hai</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {preview && (
                <img src={preview} alt="cover preview" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--divider)' }} />
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImageFile(f);
                  setPreview(URL.createObjectURL(f));
                }}
                style={{ color: 'var(--grey)', fontSize: 13 }}
              />
            </div>
          </div>

          {/* Track link */}
          <div style={{ marginTop: 16, maxWidth: 460 }}>
            <label style={labelStyle}>Link an uploaded track (optional — tap par ye play hoga)</label>
            {pickedTrack ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.3)',
                borderRadius: 10, padding: '8px 10px',
              }}>
                {pickedTrack.image_url && (
                  <img src={pickedTrack.image_url} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                )}
                <span style={{ color: 'var(--emerald-light)', fontSize: 13, fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {pickedTrack.title}{(pickedTrack.reciter_name || pickedTrack.reciter?.name) ? ` — ${pickedTrack.reciter_name || pickedTrack.reciter?.name}` : ''}
                </span>
                <button onClick={() => setPickedTrack(null)} style={{ background: 'none', border: 'none', color: 'var(--grey)', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
              </div>
            ) : (
              <div ref={pickerRef} style={{ position: 'relative' }}>
                <input
                  value={trackQuery}
                  onChange={e => setTrackQuery(e.target.value)}
                  onFocus={() => { setPickerOpen(true); loadTracksIfNeeded(); }}
                  placeholder="Uploaded tracks browse karein ya search karein…"
                  style={inputStyle}
                />
                {pickerOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                    background: 'var(--bg-elevated, #122214)', border: '1px solid var(--divider)',
                    borderRadius: 10, marginTop: 4, overflow: 'hidden', maxHeight: 300, overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,.4)',
                  }}>
                    {!tracksLoaded || (tracksLoaded && allTracks.length === 0 && trackResults.length === 0) ? (
                      <div style={{ padding: '14px 12px', color: 'var(--grey)', fontSize: 12.5, textAlign: 'center' }}>
                        {tracksLoaded ? 'Koi uploaded track nahi mili' : 'Loading tracks…'}
                      </div>
                    ) : trackResults.length === 0 ? (
                      <div style={{ padding: '14px 12px', color: 'var(--grey)', fontSize: 12.5, textAlign: 'center' }}>
                        Is search se koi track nahi mili
                      </div>
                    ) : (
                      trackResults.map(t => (
                        <div
                          key={t.id}
                          onClick={() => { setPickedTrack(t); setTrackQuery(''); setPickerOpen(false); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--divider)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {t.image_url ? (
                            <img src={t.image_url} alt="" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg-surface)', flexShrink: 0 }} />
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ color: 'var(--white)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                            <div style={{ color: 'var(--grey)', fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.reciter_name || t.reciter?.name || ''}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--white)', fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm({ ...form, is_active: e.target.checked })}
              />
              Active (app me dikhega)
            </label>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowForm(false)} style={{
              background: 'var(--bg-surface)', color: 'var(--grey)', border: '1px solid var(--divider)',
              borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{
              background: 'linear-gradient(135deg, #F0C355, #D4A843)',
              color: '#1A1205', border: 'none', borderRadius: 10,
              padding: '10px 24px', fontWeight: 800, fontSize: 13,
              cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey)' }}>Loading…</div>
      ) : releases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--grey)' }}>
          <p style={{ margin: 0, fontSize: 14 }}>Abhi koi new release nahi hai — "Add Release" se pehla card banayein</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {releases.map(r => (
            <div key={r.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--divider)',
              borderRadius: 14, overflow: 'hidden', opacity: r.is_active ? 1 : 0.5,
            }}>
              <img src={r.image_url} alt={r.title} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: 12 }}>
                <div style={{ color: 'var(--white)', fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.title}
                </div>
                <div style={{ color: 'var(--grey)', fontSize: 11.5, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.release_type}{r.artists ? ` • ${r.artists}` : ''}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {r.track_id && (
                    <span style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', color: 'var(--emerald-light)', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 6px' }}>
                      ▶ linked
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => toggleActive(r)} title={r.is_active ? 'Hide from app' : 'Show in app'} style={miniBtn}>
                    {r.is_active ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => openEdit(r)} style={miniBtn}>Edit</button>
                  <button onClick={() => handleDelete(r.id)} style={{ ...miniBtn, color: 'var(--red)', borderColor: 'rgba(239,68,68,.3)' }}>Del</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const miniBtn = {
  background: 'var(--bg-surface)', color: 'var(--grey-light)',
  border: '1px solid var(--divider)', borderRadius: 8,
  padding: '4px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
};
