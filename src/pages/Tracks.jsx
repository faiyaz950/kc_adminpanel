import { useState, useEffect } from 'react';
import client from '../api/client';

const CATEGORIES = ['dua', 'noha', 'manqabat', 'naat'];
const LANGUAGES = { dua: ['Arabic', 'Urdu', 'Hindi', 'Farsi'], noha: ['Urdu', 'Punjabi', 'Hindi', 'Farsi'], manqabat: ['Urdu', 'Punjabi', 'Arabic', 'Hindi'], naat: ['Urdu', 'Punjabi', 'Arabic', 'Hindi', 'English'] };
const OCCASIONS = { dua: ['Subah', 'Shaam', 'Jumma', 'Muharram', 'Ramzan', 'Hajj', 'Ziarat'], noha: ['Muharram', 'Safar', 'Chehlum', 'Wiladat', 'Shahadat'], manqabat: ['Wiladat', 'Urs', 'Muharram', 'Ramzan'], naat: ['Rabi ul Awwal', 'Ramzan', 'Jumma', 'Eid'] };
const CAT_COLORS = { dua: '#006B6B', noha: '#8B0000', manqabat: '#4B0082', naat: '#8B5E00' };

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

  useEffect(() => { fetchTracks(); }, [filterCat]);
  useEffect(() => {
    client.get('/reciters').then(res => setReciters(res.data)).catch(console.error);
  }, []);

  const fetchTracks = () => {
    setLoading(true);
    const params = filterCat ? { category: filterCat } : {};
    client.get('/tracks', { params })
      .then(res => setTracks(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');

    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('reciter_id', form.reciter_id || '');
      fd.append('reciter_name', form.reciter_name || '');
      fd.append('language', form.language || '');
      fd.append('occasion', form.occasion || '');
      fd.append('duration', form.duration || 0);
      fd.append('is_featured', form.is_featured ? '1' : '0');
      fd.append('lyrics', form.lyrics || '');
      if (audioFile) fd.append('audio', audioFile);
      if (imageFile) fd.append('image', imageFile);

      if (editId) {
        await client.post(`/tracks/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await client.post('/tracks', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      resetForm();
      fetchTracks();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error saving track.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (track) => {
    setForm(track);
    setEditId(track.id);
    setShowForm(true);
    setAudioFile(null);
    setImageFile(null);
    setAudioPreviewUrl(null);
    setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yeh track delete karna chahte ho?')) return;
    await client.delete(`/tracks/${id}`);
    fetchTracks();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
    setAudioFile(null);
    setImageFile(null);
    setAudioPreviewUrl(null);
    setSaveError('');
  };

  const handleAudioFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioFile(file);
    setAudioPreviewUrl(URL.createObjectURL(file));
  };

  const setReciter = (id) => {
    const r = reciters.find(r => r.id == id);
    if (r) setForm(f => ({ ...f, reciter_id: r.id, reciter_name: r.name }));
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Tracks</h2>
          <p style={styles.subtitle}>{tracks.length} tracks</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={styles.addBtn}>
          {showForm ? '✕ Cancel' : '+ Track Add Karein'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h3 style={styles.formTitle}>{editId ? 'Track Edit Karein' : 'Naya Track'}</h3>
          <div style={styles.formGrid}>
            <Field label="Title" required>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required style={styles.input} />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, language: '', occasion: '' }))} style={styles.input}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Reciter">
              <select value={form.reciter_id} onChange={e => setReciter(e.target.value)} style={styles.input}>
                <option value="">-- Select --</option>
                {reciters.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </Field>
            <Field label="Reciter Name (manual)">
              <input value={form.reciter_name || ''} onChange={e => setForm(f => ({ ...f, reciter_name: e.target.value }))} style={styles.input} />
            </Field>
            <Field label="Language">
              <select value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))} style={styles.input}>
                {(LANGUAGES[form.category] || []).map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Occasion">
              <select value={form.occasion} onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))} style={styles.input}>
                <option value="">-- Select --</option>
                {(OCCASIONS[form.category] || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Duration (seconds)">
              <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} style={styles.input} />
            </Field>
            <Field label="Featured">
              <select value={form.is_featured ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_featured: e.target.value === 'yes' }))} style={styles.input}>
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </Field>
            <Field label="MP3 File (Upload)" fullWidth>
              <input type="file" accept="audio/mp3,audio/*" onChange={handleAudioFileChange} style={styles.fileInput} />
              {(audioPreviewUrl || form.audio_url) && (
                <audio controls src={audioPreviewUrl || form.audio_url} style={styles.audioPlayer} key={audioPreviewUrl || form.audio_url} />
              )}
            </Field>
            <Field label="Cover Image" fullWidth>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={styles.fileInput} />
              {(imageFile || form.image_url) && (
                <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url} alt="" style={styles.imgPreview} />
              )}
            </Field>
            <Field label="Lyrics (optional)" fullWidth>
              <textarea value={form.lyrics || ''} onChange={e => setForm(f => ({ ...f, lyrics: e.target.value }))} rows={4} style={{ ...styles.input, resize: 'vertical' }} />
            </Field>
          </div>
          {saveError && (
            <div style={{ background: '#3B0000', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', marginTop: 12, color: '#FF6B6B', fontSize: 13 }}>
              {saveError}
            </div>
          )}
          <div style={styles.formActions}>
            <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? 'Saving...' : editId ? 'Update Karein' : 'Add Karein'}
            </button>
          </div>
        </form>
      )}

      <div style={styles.filters}>
        {['', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            style={{ ...styles.filterBtn, background: filterCat === c ? 'var(--gold)' : 'var(--bg-card)', color: filterCat === c ? '#0D0500' : 'var(--grey)' }}>
            {c || 'All'}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: 'var(--grey)' }}>Loading...</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['Title', 'Category', 'Reciter', 'Language', 'Duration', 'Featured', 'Preview', 'Actions'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tracks.length === 0 && (
              <tr><td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: 'var(--grey)' }}>Koi track nahi</td></tr>
            )}
            {tracks.map(track => (
              <>
                <tr key={track.id} style={styles.tr}>
                  <td style={styles.td}><div style={{ fontWeight: 600, color: 'var(--white)' }}>{track.title}</div></td>
                  <td style={styles.td}>
                    <span style={{ ...styles.badge, background: CAT_COLORS[track.category] + '33', color: CAT_COLORS[track.category] }}>{track.category}</span>
                  </td>
                  <td style={styles.td}>{track.reciter_name}</td>
                  <td style={styles.td}>{track.language}</td>
                  <td style={styles.td}>{track.duration}s</td>
                  <td style={styles.td}>
                    <span style={{ color: track.is_featured ? '#2E7D32' : 'var(--grey)' }}>{track.is_featured ? '⭐ Yes' : 'No'}</span>
                  </td>
                  <td style={styles.td}>
                    {track.audio_url ? (
                      <button onClick={() => setPreviewTrackId(previewTrackId === track.id ? null : track.id)}
                        style={{ ...styles.editBtn, color: previewTrackId === track.id ? '#2E7D32' : 'var(--gold)' }}>
                        {previewTrackId === track.id ? '■ Stop' : '▶ Play'}
                      </button>
                    ) : <span style={{ color: 'var(--grey)', fontSize: 12 }}>No audio</span>}
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleEdit(track)} style={styles.editBtn}>Edit</button>
                    <button onClick={() => handleDelete(track.id)} style={styles.deleteBtn}>Delete</button>
                  </td>
                </tr>
                {previewTrackId === track.id && (
                  <tr key={track.id + '_preview'} style={{ background: 'var(--bg-card)' }}>
                    <td colSpan={8} style={{ padding: '8px 12px' }}>
                      <audio controls autoPlay src={track.audio_url} style={styles.audioPlayer} />
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, children, fullWidth }) {
  return (
    <div style={{ gridColumn: fullWidth ? 'span 2' : 'span 1' }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 960 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { color: 'var(--white)', fontSize: 22, fontWeight: 700 },
  subtitle: { color: 'var(--grey)', fontSize: 13, marginTop: 4 },
  addBtn: { background: 'var(--gold)', color: '#0D0500', fontWeight: 700, padding: '9px 18px', borderRadius: 8, fontSize: 13 },
  form: { background: 'var(--bg-card)', border: '1px solid #2A1200', borderRadius: 12, padding: 24, marginBottom: 24 },
  formTitle: { color: 'var(--gold)', marginBottom: 20, fontSize: 15 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'block', color: 'var(--grey)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  input: { width: '100%', background: 'var(--bg-light)', border: '1px solid #3A2200', borderRadius: 8, padding: '9px 12px', color: 'var(--white)' },
  fileInput: { color: 'var(--grey)', fontSize: 13 },
  imgPreview: { width: 60, height: 60, borderRadius: 6, objectFit: 'cover', marginTop: 6 },
  audioPlayer: { width: '100%', height: 36, accentColor: 'var(--gold)', marginTop: 8, display: 'block' },
  formActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { background: 'transparent', border: '1px solid #3A2200', color: 'var(--grey)', padding: '9px 18px', borderRadius: 8, fontSize: 13 },
  saveBtn: { background: 'var(--gold)', color: '#0D0500', fontWeight: 700, padding: '9px 18px', borderRadius: 8, fontSize: 13 },
  filters: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', borderRadius: 20, fontSize: 12, border: '1px solid #2A1200' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', color: 'var(--grey)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, padding: '10px 12px', borderBottom: '1px solid #2A1200' },
  tr: { borderBottom: '1px solid #1C0A00' },
  td: { padding: '12px', color: 'var(--grey)', verticalAlign: 'middle' },
  badge: { padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 },
  editBtn: { background: 'var(--bg-light)', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '4px 10px', borderRadius: 6, fontSize: 12, marginRight: 6 },
  deleteBtn: { background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', padding: '4px 10px', borderRadius: 6, fontSize: 12 },
};
