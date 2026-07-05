import { useState, useEffect } from 'react';
import client from '../api/client';

const emptyForm = { title: '', type: 'audio', advertiser_name: '', is_active: true, weight: 1 };

export default function AudioAds() {
  const [ads, setAds]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm);
  const [editId, setEditId]     = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [preview, setPreview]   = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [intervalTracks, setIntervalTracks] = useState(4);
  const [activeType, setActiveType] = useState('audio');
  const [settingsSaving, setSettingsSaving] = useState(false);

  const load = () => {
    setLoading(true);
    client.get('/admin/audio-ads')
      .then(r => setAds(r.data))
      .catch(() => setError('Failed to load audio ads'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    client.get('/admin/app-settings')
      .then(r => {
        setGlobalEnabled(r.data?.ads_enabled_global !== false);
        setIntervalTracks(r.data?.ads_interval_tracks || 4);
        setActiveType(r.data?.ads_active_type || 'audio');
      })
      .catch(() => {});
  }, []);

  const saveSettings = async (overrides = {}) => {
    setSettingsSaving(true);
    try {
      const res = await client.post('/admin/app-settings', {
        ads_enabled_global: overrides.ads_enabled_global ?? globalEnabled,
        ads_interval_tracks: overrides.ads_interval_tracks ?? intervalTracks,
        ads_active_type: overrides.ads_active_type ?? activeType,
      });
      setGlobalEnabled(res.data?.ads_enabled_global !== false);
      setIntervalTracks(res.data?.ads_interval_tracks || 4);
      setActiveType(res.data?.ads_active_type || 'audio');
    } catch {
      setError('Ads settings save nahi hui.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setMediaFile(null);
    setPreview(null);
    setImageFile(null);
    setImagePreview(null);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditId(a.id);
    setForm({
      title: a.title || '',
      type: a.type || 'audio',
      advertiser_name: a.advertiser_name || '',
      is_active: a.is_active,
      weight: a.weight || 1,
    });
    setMediaFile(null);
    setPreview(a.type === 'video' ? a.video_url : a.audio_url);
    setImageFile(null);
    setImagePreview(a.image_url || null);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editId && !mediaFile) {
      setError(`Please select a${form.type === 'video' ? ' video' : 'n audio'} file`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      if (form.title)           fd.append('title', form.title);
      fd.append('type', form.type);
      if (form.advertiser_name) fd.append('advertiser_name', form.advertiser_name);
      fd.append('is_active', form.is_active ? '1' : '0');
      fd.append('weight', String(form.weight));
      if (mediaFile) fd.append(form.type === 'video' ? 'video' : 'audio', mediaFile);
      if (imageFile) fd.append('image', imageFile);
      if (editId) {
        await client.post(`/audio-ads/${editId}`, fd);
      } else {
        await client.post('/audio-ads', fd);
      }
      setShowForm(false);
      setMediaFile(null);
      setImageFile(null);
      load();
    } catch {
      setError(form.type === 'video'
        ? 'Save failed — check video format (MP4, max 50MB)'
        : 'Save failed — check audio format (MP3/M4A, max 20MB)');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (a) => {
    try {
      await client.post(`/audio-ads/${a.id}`, { is_active: a.is_active ? '0' : '1' });
      load();
    } catch { setError('Update failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ad?')) return;
    try {
      await client.delete(`/audio-ads/${id}`);
      load();
    } catch { setError('Delete failed'); }
  };

  const inputStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--divider)',
    borderRadius: 10, color: 'var(--white)', padding: '10px 14px',
    fontSize: 13, width: '100%', outline: 'none',
  };

  const formatDuration = (s) => {
    if (!s) return '—';
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const typeToggleBtn = (value, label) => (
    <button
      type="button"
      onClick={() => setForm(f => ({ ...f, type: value }))}
      style={{
        flex: 1, padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
        fontSize: 13, fontWeight: 700,
        background: form.type === value ? 'rgba(22,163,74,.15)' : 'var(--bg-surface)',
        color: form.type === value ? 'var(--emerald-light)' : 'var(--grey)',
        border: `1px solid ${form.type === value ? 'rgba(22,163,74,.4)' : 'var(--divider)'}`,
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="page-wrapper" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800, margin: 0 }}>Audio & Video Ads</h1>
          <p style={{ color: 'var(--grey)', fontSize: 13, margin: '4px 0 0' }}>
            Manage sponsor clips played before/after tracks.
          </p>
        </div>
        <button onClick={openAdd} style={{
          background: 'linear-gradient(135deg, var(--emerald), var(--emerald-light))',
          color: '#fff', border: 'none', borderRadius: 10,
          padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Ad
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '12px 16px', color: '#f87171', marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Global ad settings */}
      <div className="form-card" style={{ margin: '0 0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
              Ads Frequency
            </div>
            <div style={{ color: 'var(--grey)', fontSize: 12 }}>
              {globalEnabled
                ? `App mein har ${intervalTracks} tracks ke baad ek ${activeType} ad play hoti hai.`
                : 'Ads abhi poori app mein band hain.'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ color: 'var(--grey)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              Play every
              <input
                type="number" min="1" max="50"
                value={intervalTracks}
                onChange={e => setIntervalTracks(parseInt(e.target.value) || 1)}
                style={{
                  width: 56, background: 'var(--bg-surface)', border: '1px solid var(--divider)',
                  borderRadius: 8, color: 'var(--white)', padding: '6px 8px', fontSize: 13, outline: 'none',
                }}
              />
              tracks
            </label>
            <button
              className="btn-secondary"
              disabled={settingsSaving}
              onClick={() => saveSettings()}
              style={{ minWidth: 90 }}
            >
              {settingsSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              className={globalEnabled ? 'btn-secondary' : 'btn-primary'}
              disabled={settingsSaving}
              onClick={() => saveSettings({ ads_enabled_global: !globalEnabled })}
              style={{ minWidth: 130 }}
            >
              {globalEnabled ? 'Disable All Ads' : 'Enable All Ads'}
            </button>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--divider)', paddingTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
              Ad Content Type
            </div>
            <div style={{ color: 'var(--grey)', fontSize: 12 }}>
              App sirf is type ke active ads play karegi — dono ek saath nahi.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['audio', 'video'].map(t => (
              <button
                key={t}
                onClick={() => saveSettings({ ads_active_type: t })}
                disabled={settingsSaving}
                style={{
                  padding: '8px 18px', borderRadius: 10, cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, textTransform: 'capitalize',
                  background: activeType === t ? 'rgba(22,163,74,.15)' : 'var(--bg-surface)',
                  color: activeType === t ? 'var(--emerald-light)' : 'var(--grey)',
                  border: `1px solid ${activeType === t ? 'rgba(22,163,74,.4)' : 'var(--divider)'}`,
                }}
              >
                {t === 'video' ? '🎬 Video' : '🔊 Audio'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--divider)',
          borderRadius: 16, padding: 24, marginBottom: 24,
        }}>
          <h3 style={{ color: 'var(--white)', fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>
            {editId ? 'Edit Ad' : 'Add New Ad'}
          </h3>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>AD TYPE</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {typeToggleBtn('audio', '🔊 Audio')}
              {typeToggleBtn('video', '🎬 Video')}
            </div>
          </div>

          <div className="form-grid-2" style={{ marginBottom: 16 }}>
            <div>
              <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>TITLE</label>
              <input
                style={inputStyle}
                placeholder="e.g. Ramadan Charity Appeal"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>ADVERTISER (optional)</label>
              <input
                style={inputStyle}
                placeholder="e.g. Anjuman-e-XYZ"
                value={form.advertiser_name}
                onChange={e => setForm(f => ({ ...f, advertiser_name: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
              {form.type === 'video' ? 'VIDEO FILE' : 'AUDIO FILE'} {editId ? '(leave empty to keep current)' : '*'}
            </label>
            <input
              key={form.type}
              type="file"
              accept={form.type === 'video' ? 'video/mp4,video/quicktime' : 'audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav'}
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                setMediaFile(file);
                setPreview(URL.createObjectURL(file));
              }}
              style={{
                ...inputStyle,
                padding: '8px 14px',
                cursor: 'pointer',
                color: 'var(--grey)',
              }}
            />
            <p style={{ color: 'var(--grey-dark)', fontSize: 11, margin: '6px 0 0' }}>
              {form.type === 'video'
                ? 'MP4 — max 50 MB. Keep it short (10-20s) so it doesn\'t feel intrusive.'
                : 'MP3, M4A or WAV — max 20 MB. Keep it short (10-30s) so it doesn\'t feel intrusive.'}
            </p>
          </div>

          {preview && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 8 }}>PREVIEW</label>
              {form.type === 'video'
                ? <video controls src={preview} style={{ width: '100%', maxHeight: 240, borderRadius: 10, background: '#000' }} />
                : <audio controls src={preview} style={{ width: '100%' }} />}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
              IMAGE (optional) <span style={{ color: 'var(--grey-dark)', fontWeight: 500, letterSpacing: 0 }}>— shown while ad plays{form.type === 'video' ? ' in mini player' : ''}</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }}
              style={{
                ...inputStyle,
                padding: '8px 14px',
                cursor: 'pointer',
                color: 'var(--grey)',
              }}
            />
            {imagePreview && (
              <img
                src={imagePreview}
                alt="preview"
                style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 10, marginTop: 8, border: '1px solid var(--divider)' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          <div className="form-grid-2" style={{ marginBottom: 16 }}>
            <div>
              <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
                WEIGHT <span style={{ color: 'var(--grey-dark)', fontWeight: 500, letterSpacing: 0 }}>(higher = plays more often)</span>
              </label>
              <input
                type="number" min="1" max="100"
                style={inputStyle}
                value={form.weight}
                onChange={e => setForm(f => ({ ...f, weight: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                style={{ accentColor: 'var(--emerald)', width: 16, height: 16 }}
              />
              <span style={{ color: 'var(--grey)', fontSize: 13 }}>Active (eligible to play in app)</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{
              background: 'linear-gradient(135deg, var(--emerald), var(--emerald-light))',
              color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px',
              fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Saving…' : editId ? 'Update' : 'Add Ad'}
            </button>
            <button onClick={() => setShowForm(false)} style={{
              background: 'var(--bg-surface)', color: 'var(--grey)', border: '1px solid var(--divider)',
              borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Ads list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey)' }}>Loading…</div>
      ) : ads.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16, padding: 60,
          textAlign: 'center', border: '1px solid var(--divider)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔊</div>
          <div style={{ color: 'var(--white)', fontWeight: 700, marginBottom: 6 }}>No ads yet</div>
          <div style={{ color: 'var(--grey)', fontSize: 13 }}>Click "Add Ad" to upload your first sponsor clip</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {ads.map(a => (
            <div key={a.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--divider)',
              borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'stretch',
              flexWrap: 'wrap',
            }}>
              {/* Thumbnail */}
              {a.image_url && (
                <div style={{ width: 90, minHeight: 90, flexShrink: 0, background: 'var(--bg-surface)' }}>
                  <img
                    src={a.image_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Info */}
              <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  {a.title || <span style={{ color: 'var(--grey-dark)', fontStyle: 'italic' }}>Untitled</span>}
                  {a.advertiser_name && <span style={{ color: 'var(--grey)', fontWeight: 500 }}> — {a.advertiser_name}</span>}
                </div>
                {a.type === 'video'
                  ? <video controls src={a.video_url} style={{ width: '100%', maxWidth: 320, maxHeight: 160, borderRadius: 8, marginBottom: 8, background: '#000' }} />
                  : <audio controls src={a.audio_url} style={{ width: '100%', maxWidth: 320, height: 32, marginBottom: 8 }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: 'rgba(139,92,246,.12)', color: '#a78bfa',
                    border: '1px solid rgba(139,92,246,.3)',
                  }}>
                    {a.type === 'video' ? '🎬 Video' : '🔊 Audio'}
                  </span>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: a.is_active ? 'rgba(22,163,74,.15)' : 'rgba(255,255,255,.06)',
                    color: a.is_active ? 'var(--emerald-light)' : 'var(--grey)',
                    border: `1px solid ${a.is_active ? 'rgba(22,163,74,.3)' : 'var(--divider)'}`,
                  }}>
                    {a.is_active ? '● Active' : '○ Inactive'}
                  </span>
                  <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>Weight: {a.weight}</span>
                  <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>Duration: {formatDuration(a.duration)}</span>
                  <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>Plays: {a.play_count}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: '12px 16px', alignItems: 'center' }}>
                <button onClick={() => toggleActive(a)} style={{
                  background: a.is_active ? 'rgba(239,68,68,.08)' : 'rgba(22,163,74,.08)',
                  color: a.is_active ? '#f87171' : 'var(--emerald-light)',
                  border: `1px solid ${a.is_active ? 'rgba(239,68,68,.25)' : 'rgba(22,163,74,.25)'}`,
                  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  {a.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => openEdit(a)} style={{
                  background: 'rgba(212,168,67,.08)', color: 'var(--gold)',
                  border: '1px solid rgba(212,168,67,.25)',
                  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(a.id)} style={{
                  background: 'rgba(239,68,68,.06)', color: '#f87171',
                  border: '1px solid rgba(239,68,68,.2)',
                  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
