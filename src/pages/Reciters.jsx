import { useState, useEffect } from 'react';
import client from '../api/client';

const CATEGORIES = ['dua', 'noha', 'manqabat', 'naat'];
const LANGUAGES = ['Arabic', 'Urdu', 'Punjabi', 'Hindi', 'Farsi', 'English'];
const emptyForm = { name: '', bio: '', categories: [], languages: [], total_tracks: 0, is_verified: false };

export default function Reciters() {
  const [reciters, setReciters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => { fetchReciters(); }, []);

  const fetchReciters = () => {
    setLoading(true);
    client.get('/reciters')
      .then(res => setReciters(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const toggleArray = (arr, val) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setUploadProgress(0);

    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('bio', form.bio || '');
      fd.append('total_tracks', form.total_tracks || 0);
      fd.append('is_verified', form.is_verified ? '1' : '0');
      fd.append('categories', JSON.stringify(form.categories || []));
      fd.append('languages', JSON.stringify(form.languages || []));
      if (imageFile) fd.append('image', imageFile);

      if (editId) {
        await client.post(`/reciters/${editId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await client.post('/reciters', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      resetForm();
      fetchReciters();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error saving reciter.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (r) => {
    setForm({ ...r, categories: r.categories || [], languages: r.languages || [] });
    setEditId(r.id);
    setShowForm(true);
    setImageFile(null);
    setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Reciter delete karna chahte ho?')) return;
    await client.delete(`/reciters/${id}`);
    fetchReciters();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setShowForm(false);
    setImageFile(null);
    setSaveError('');
    setUploadProgress(0);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Reciters</h2>
          <p style={styles.subtitle}>{reciters.length} reciters</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} style={styles.addBtn}>
          {showForm ? '✕ Cancel' : '+ Reciter Add Karein'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <h3 style={styles.formTitle}>{editId ? 'Reciter Edit' : 'Naya Reciter'}</h3>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>Naam *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required style={styles.input} />
            </div>
            <div>
              <label style={styles.label}>Total Tracks</label>
              <input type="number" value={form.total_tracks} onChange={e => setForm(f => ({ ...f, total_tracks: +e.target.value }))} style={styles.input} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={styles.label}>Bio</label>
              <textarea value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} style={{ ...styles.input, resize: 'vertical' }} />
            </div>
            <div>
              <label style={styles.label}>Categories</label>
              <div style={styles.checkGroup}>
                {CATEGORIES.map(c => (
                  <label key={c} style={styles.checkLabel}>
                    <input type="checkbox" checked={(form.categories || []).includes(c)}
                      onChange={() => setForm(f => ({ ...f, categories: toggleArray(f.categories || [], c) }))} />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={styles.label}>Languages</label>
              <div style={styles.checkGroup}>
                {LANGUAGES.map(l => (
                  <label key={l} style={styles.checkLabel}>
                    <input type="checkbox" checked={(form.languages || []).includes(l)}
                      onChange={() => setForm(f => ({ ...f, languages: toggleArray(f.languages || [], l) }))} />
                    {l}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={styles.label}>Verified</label>
              <select value={form.is_verified ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_verified: e.target.value === 'yes' }))} style={styles.input}>
                <option value="no">No</option>
                <option value="yes">Yes ✓</option>
              </select>
            </div>
            <div>
              <label style={styles.label}>Photo Upload</label>
              <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files[0])} style={styles.fileInput} />
              {(imageFile || form.image_url) && (
                <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url} alt="" style={styles.imgPreview} />
              )}
            </div>
          </div>
          {saveError && (
            <div style={{ background: '#3B0000', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 14px', marginTop: 12, color: '#FF6B6B', fontSize: 13 }}>
              {saveError}
            </div>
          )}
          <div style={styles.formActions}>
            <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saving ? 'Saving...' : editId ? 'Update' : 'Add Karein'}
            </button>
          </div>
        </form>
      )}

      {loading ? <p style={{ color: 'var(--grey)' }}>Loading...</p> : (
        <div style={styles.grid}>
          {reciters.length === 0 && <p style={{ color: 'var(--grey)' }}>Koi reciter nahi</p>}
          {reciters.map(r => (
            <div key={r.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div style={styles.avatar}>
                  {r.image_url ? <img src={r.image_url} alt={r.name} style={styles.avatarImg} /> : <span style={{ fontSize: 28 }}>🎤</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={styles.name}>{r.name}{r.is_verified && <span style={styles.verified}>✓</span>}</div>
                  <div style={styles.meta}>{r.total_tracks} tracks</div>
                </div>
              </div>
              {r.bio && <p style={styles.bio}>{r.bio}</p>}
              <div style={styles.tags}>
                {(r.languages || []).map(l => <span key={l} style={styles.tag}>{l}</span>)}
              </div>
              <div style={styles.cardActions}>
                <button onClick={() => handleEdit(r)} style={styles.editBtn}>Edit</button>
                <button onClick={() => handleDelete(r.id)} style={styles.deleteBtn}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
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
  imgPreview: { width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', marginTop: 6 },
  checkGroup: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  checkLabel: { display: 'flex', alignItems: 'center', gap: 5, color: 'var(--white)', fontSize: 13, cursor: 'pointer' },
  formActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 },
  cancelBtn: { background: 'transparent', border: '1px solid #3A2200', color: 'var(--grey)', padding: '9px 18px', borderRadius: 8, fontSize: 13 },
  saveBtn: { background: 'var(--gold)', color: '#0D0500', fontWeight: 700, padding: '9px 18px', borderRadius: 8, fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 },
  card: { background: 'var(--bg-card)', border: '1px solid #2A1200', borderRadius: 12, padding: 16 },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 },
  avatarImg: { width: '100%', height: '100%', objectFit: 'cover' },
  name: { color: 'var(--white)', fontWeight: 600, fontSize: 14 },
  verified: { color: 'var(--gold)', marginLeft: 5, fontSize: 12 },
  meta: { color: 'var(--grey)', fontSize: 12, marginTop: 2 },
  bio: { color: 'var(--grey)', fontSize: 12, lineHeight: 1.5, marginBottom: 10 },
  tags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { background: 'var(--bg-light)', color: 'var(--grey)', padding: '2px 8px', borderRadius: 4, fontSize: 11 },
  cardActions: { display: 'flex', gap: 8, marginTop: 8 },
  editBtn: { flex: 1, background: 'var(--bg-light)', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '6px', borderRadius: 6, fontSize: 12 },
  deleteBtn: { flex: 1, background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', padding: '6px', borderRadius: 6, fontSize: 12 },
};
