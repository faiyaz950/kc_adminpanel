import { useState, useEffect } from 'react';
import client from '../api/client';

const OCCASIONS = ['Muharram', 'Safar', 'Chehlum', 'Wiladat', 'Shahadat', 'General'];
const emptyForm = { name: '', city: '', bio: '', is_verified: false };

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

  useEffect(() => { fetchAnjumans(); }, []);

  const fetchAnjumans = () => {
    setLoading(true);
    client.get('/anjumans')
      .then(r => setAnjumans(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('city', form.city);
      fd.append('bio', form.bio || '');
      fd.append('is_verified', form.is_verified ? '1' : '0');
      if (imageFile) fd.append('image', imageFile);
      const opts = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editId) await client.post(`/anjumans/${editId}`, fd, opts);
      else await client.post('/anjumans', fd, opts);
      resetForm();
      fetchAnjumans();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error saving.');
    } finally { setSaving(false); }
  };

  const handleEdit = (a) => {
    setForm({ name: a.name, city: a.city, bio: a.bio || '', is_verified: a.is_verified });
    setEditId(a.id); setImageFile(null); setShowForm(true); setSaveError('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Anjuman aur uske tamam tracks delete ho jayenge. Sure?')) return;
    await client.delete(`/anjumans/${id}`);
    fetchAnjumans();
    if (selectedAnjuman?.id === id) setSelectedAnjuman(null);
  };

  const resetForm = () => {
    setForm(emptyForm); setEditId(null); setImageFile(null); setShowForm(false);
  };

  if (selectedAnjuman) {
    return (
      <AnjumanTracks
        anjuman={selectedAnjuman}
        onBack={() => { setSelectedAnjuman(null); fetchAnjumans(); }}
      />
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Anjumans</h1>
          <p style={styles.subtitle}>City-wise anjumans manage karein</p>
        </div>
        <button style={styles.addBtn} onClick={() => { resetForm(); setShowForm(true); }}>
          + Anjuman Add Karein
        </button>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>{editId ? 'Anjuman Edit' : 'Naya Anjuman'}</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Anjuman Ka Naam *</label>
                <input style={styles.input} value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>City *</label>
                <input style={styles.input} placeholder="e.g. Karachi, Lahore"
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))} required />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Bio</label>
              <textarea style={{ ...styles.input, height: 80, resize: 'vertical' }}
                value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
            </div>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Image (optional)</label>
                <input type="file" accept="image/*" style={styles.input}
                  onChange={e => setImageFile(e.target.files[0])} />
              </div>
              <div style={{ ...styles.field, justifyContent: 'center' }}>
                <label style={{ ...styles.label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_verified}
                    onChange={e => setForm(p => ({ ...p, is_verified: e.target.checked }))} />
                  Verified Anjuman
                </label>
              </div>
            </div>
            {saveError && <p style={styles.error}>{saveError}</p>}
            <div style={styles.btnRow}>
              <button type="button" style={styles.cancelBtn} onClick={resetForm}>Cancel</button>
              <button type="submit" style={styles.saveBtn} disabled={saving}>
                {saving ? 'Saving...' : (editId ? 'Update' : 'Add Anjuman')}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--grey)' }}>Loading...</p>
      ) : anjumans.length === 0 ? (
        <p style={{ color: 'var(--grey)' }}>Koi anjuman nahi mila.</p>
      ) : (
        <div style={styles.grid}>
          {anjumans.map(a => (
            <div key={a.id} style={styles.card}>
              <div style={styles.cardImg}>
                {a.image_url
                  ? <img src={a.image_url} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 36 }}>🕌</span>}
              </div>
              <div style={styles.cardBody}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={styles.cardName}>{a.name}</span>
                  {a.is_verified && <span style={styles.badge}>✓</span>}
                </div>
                <span style={styles.cityTag}>📍 {a.city}</span>
                <span style={styles.tracksCount}>{a.total_tracks} tracks</span>
                {a.bio && <p style={styles.bio}>{a.bio}</p>}
              </div>
              <div style={styles.cardActions}>
                <button style={styles.tracksBtn} onClick={() => setSelectedAnjuman(a)}>
                  🎵 Tracks
                </button>
                <button style={styles.editBtn} onClick={() => handleEdit(a)}>Edit</button>
                <button style={styles.deleteBtn} onClick={() => handleDelete(a.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnjumanTracks({ anjuman, onBack }) {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [audioPreview, setAudioPreview] = useState(null);
  const [playing, setPlaying] = useState(null);

  useEffect(() => { fetchTracks(); }, []);

  const fetchTracks = () => {
    setLoading(true);
    client.get(`/anjumans/${anjuman.id}/tracks`)
      .then(r => setTracks(r.data))
      .finally(() => setLoading(false));
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    setAudioFile(file);
    if (file) setAudioPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioFile) { setSaveError('Audio file required'); return; }
    setSaving(true); setSaveError('');
    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('occasion', occasion);
      fd.append('audio', audioFile);
      if (imageFile) fd.append('image', imageFile);
      await client.post(`/anjumans/${anjuman.id}/tracks`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTitle(''); setOccasion(''); setAudioFile(null); setImageFile(null);
      setAudioPreview(null); setShowForm(false);
      fetchTracks();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Upload failed.');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Track delete karein?')) return;
    await client.delete(`/anjuman-tracks/${id}`);
    fetchTracks();
  };

  const togglePlay = (url) => {
    if (playing === url) { setPlaying(null); }
    else { setPlaying(url); }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <button style={styles.backBtn} onClick={onBack}>← Anjumans</button>
          <h1 style={styles.title}>{anjuman.name}</h1>
          <p style={styles.subtitle}>📍 {anjuman.city} · {tracks.length} tracks</p>
        </div>
        <button style={styles.addBtn} onClick={() => setShowForm(p => !p)}>
          + Track Upload
        </button>
      </div>

      {showForm && (
        <div style={styles.formCard}>
          <h2 style={styles.formTitle}>Naya Track Upload</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Track Title *</label>
                <input style={styles.input} value={title}
                  onChange={e => setTitle(e.target.value)} required />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Occasion</label>
                <select style={styles.input} value={occasion} onChange={e => setOccasion(e.target.value)}>
                  <option value="">Select...</option>
                  {OCCASIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div style={styles.row}>
              <div style={styles.field}>
                <label style={styles.label}>Audio File * (MP3/WAV)</label>
                <input type="file" accept="audio/*" style={styles.input} onChange={handleAudioChange} required />
                {audioPreview && (
                  <audio controls src={audioPreview} style={{ marginTop: 8, width: '100%' }} />
                )}
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Cover Image (optional)</label>
                <input type="file" accept="image/*" style={styles.input}
                  onChange={e => setImageFile(e.target.files[0])} />
              </div>
            </div>
            {saveError && <p style={styles.error}>{saveError}</p>}
            {saving && <p style={{ color: 'var(--gold)', fontSize: 13 }}>Uploading to Cloudinary... please wait</p>}
            <div style={styles.btnRow}>
              <button type="button" style={styles.cancelBtn} onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" style={styles.saveBtn} disabled={saving}>
                {saving ? 'Uploading...' : 'Upload Track'}
              </button>
            </div>
          </form>
        </div>
      )}

      {playing && (
        <audio autoPlay src={playing} onEnded={() => setPlaying(null)} style={{ display: 'none' }} />
      )}

      {loading ? (
        <p style={{ color: 'var(--grey)' }}>Loading...</p>
      ) : tracks.length === 0 ? (
        <p style={{ color: 'var(--grey)' }}>Koi track nahi. Upload karein.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['#', 'Title', 'Occasion', 'Duration', 'Plays', 'Preview', 'Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tracks.map((t, i) => (
              <tr key={t.id} style={styles.tr}>
                <td style={styles.td}>{i + 1}</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.image_url && <img src={t.image_url} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} />}
                    <span style={{ color: '#fff', fontWeight: 500 }}>{t.title}</span>
                  </div>
                </td>
                <td style={styles.td}>{t.occasion || '—'}</td>
                <td style={styles.td}>{t.duration || '—'}</td>
                <td style={styles.td}>{t.play_count}</td>
                <td style={styles.td}>
                  <button style={styles.playBtn} onClick={() => togglePlay(t.audio_url)}>
                    {playing === t.audio_url ? '■ Stop' : '▶ Play'}
                  </button>
                </td>
                <td style={styles.td}>
                  <button style={styles.deleteBtn} onClick={() => handleDelete(t.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  page: { padding: 32, maxWidth: 1100, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  title: { color: '#fff', fontSize: 24, fontWeight: 700, margin: '4px 0' },
  subtitle: { color: 'var(--grey)', fontSize: 13, margin: 0 },
  addBtn: { background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 8, padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  backBtn: { background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 13, padding: 0, marginBottom: 8 },
  formCard: { background: 'var(--bg-card)', border: '1px solid #2a1200', borderRadius: 12, padding: 24, marginBottom: 24 },
  formTitle: { color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'flex', gap: 14 },
  field: { flex: 1, display: 'flex', flexDirection: 'column', gap: 6 },
  label: { color: 'var(--grey)', fontSize: 12, fontWeight: 600 },
  input: { background: 'var(--bg-dark)', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, width: '100%', boxSizing: 'border-box' },
  error: { color: 'var(--red)', fontSize: 13, margin: 0 },
  btnRow: { display: 'flex', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: { background: 'none', border: '1px solid #444', borderRadius: 8, padding: '8px 16px', color: 'var(--grey)', cursor: 'pointer', fontSize: 13 },
  saveBtn: { background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
  badge: { background: '#1DB95420', color: '#1DB954', border: '1px solid #1DB95440', borderRadius: 10, padding: '1px 6px', fontSize: 11 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  card: { background: 'var(--bg-card)', border: '1px solid #2a1200', borderRadius: 12, overflow: 'hidden' },
  cardImg: { width: '100%', height: 120, background: '#1a0800', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 },
  cardName: { color: '#fff', fontWeight: 700, fontSize: 14 },
  cityTag: { color: 'var(--gold)', fontSize: 12 },
  tracksCount: { color: 'var(--grey)', fontSize: 11 },
  bio: { color: 'var(--grey)', fontSize: 12, marginTop: 4, lineHeight: 1.5 },
  cardActions: { padding: '8px 14px 12px', display: 'flex', gap: 8 },
  tracksBtn: { background: 'var(--gold)', color: '#000', border: 'none', borderRadius: 6, padding: '5px 10px', fontWeight: 700, fontSize: 12, cursor: 'pointer', flex: 1 },
  editBtn: { background: '#1DB95420', color: '#1DB954', border: '1px solid #1DB95440', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' },
  deleteBtn: { background: 'var(--red)20', color: 'var(--red)', border: '1px solid var(--red)40', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden' },
  th: { textAlign: 'left', padding: '12px 14px', color: 'var(--grey)', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #222' },
  tr: { borderBottom: '1px solid #1a1a1a' },
  td: { padding: '12px 14px', color: 'var(--grey)', fontSize: 13 },
  playBtn: { background: '#1DB95420', color: '#1DB954', border: '1px solid #1DB95440', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer' },
};
