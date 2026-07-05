import { useState, useEffect } from 'react';
import client from '../api/client';

export default function AudioAds() {
  const [ads, setAds]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: '', advertiser_name: '', is_active: true, weight: 1 });
  const [editId, setEditId]     = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [preview, setPreview]   = useState(null);

  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [intervalTracks, setIntervalTracks] = useState(4);
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
      })
      .catch(() => {});
  }, []);

  const saveSettings = async (overrides = {}) => {
    setSettingsSaving(true);
    try {
      const res = await client.post('/admin/app-settings', {
        ads_enabled_global: overrides.ads_enabled_global ?? globalEnabled,
        ads_interval_tracks: overrides.ads_interval_tracks ?? intervalTracks,
      });
      setGlobalEnabled(res.data?.ads_enabled_global !== false);
      setIntervalTracks(res.data?.ads_interval_tracks || 4);
    } catch {
      setError('Ads settings save nahi hui.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ title: '', advertiser_name: '', is_active: true, weight: 1 });
    setAudioFile(null);
    setPreview(null);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditId(a.id);
    setForm({ title: a.title || '', advertiser_name: a.advertiser_name || '', is_active: a.is_active, weight: a.weight || 1 });
    setAudioFile(null);
    setPreview(a.audio_url);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editId && !audioFile) { setError('Please select an audio file'); return; }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      if (form.title)           fd.append('title', form.title);
      if (form.advertiser_name) fd.append('advertiser_name', form.advertiser_name);
      fd.append('is_active', form.is_active ? '1' : '0');
      fd.append('weight', String(form.weight));
      if (audioFile) fd.append('audio', audioFile);
      if (editId) {
        await client.post(`/audio-ads/${editId}`, fd);
      } else {
        await client.post('/audio-ads', fd);
      }
      setShowForm(false);
      setAudioFile(null);
      load();
    } catch {
      setError('Save failed — check audio format (MP3/M4A, max 20MB)');
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
    if (!confirm('Delete this audio ad?')) return;
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

  return (
    <div className="page-wrapper" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800, margin: 0 }}>Audio Ads</h1>
          <p style={{ color: 'var(--grey)', fontSize: 13, margin: '4px 0 0' }}>
            Manage sponsor audio clips played before/after tracks.
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
      <div className="form-card" style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
            Ads Frequency
          </div>
          <div style={{ color: 'var(--grey)', fontSize: 12 }}>
            {globalEnabled
              ? `App mein har ${intervalTracks} tracks ke baad ek ad play hoti hai.`
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

      {/* Add / Edit Form */}
      {showForm && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--divider)',
          borderRadius: 16, padding: 24, marginBottom: 24,
        }}>
          <h3 style={{ color: 'var(--white)', fontSize: 16, fontWeight: 700, margin: '0 0 20px' }}>
            {editId ? 'Edit Audio Ad' : 'Add New Audio Ad'}
          </h3>

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
              AUDIO FILE {editId ? '(leave empty to keep current)' : '*'}
            </label>
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/wav"
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                setAudioFile(file);
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
              MP3, M4A or WAV — max 20 MB. Keep it short (10-30s) so it doesn't feel intrusive.
            </p>
          </div>

          {preview && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 8 }}>PREVIEW</label>
              <audio controls src={preview} style={{ width: '100%' }} />
            </div>
          )}

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
          <div style={{ color: 'var(--white)', fontWeight: 700, marginBottom: 6 }}>No audio ads yet</div>
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
              {/* Info */}
              <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  {a.title || <span style={{ color: 'var(--grey-dark)', fontStyle: 'italic' }}>Untitled</span>}
                  {a.advertiser_name && <span style={{ color: 'var(--grey)', fontWeight: 500 }}> — {a.advertiser_name}</span>}
                </div>
                <audio controls src={a.audio_url} style={{ width: '100%', maxWidth: 320, height: 32, marginBottom: 8 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
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
