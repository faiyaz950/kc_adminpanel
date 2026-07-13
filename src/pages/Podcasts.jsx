import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import { fetchList, KEYS } from '../api/listCache';
import AudioProcessor from '../components/AudioProcessor';
import ErrorBanner from '../components/ErrorBanner';

const formatDur = (secs) => {
  if (!secs) return '—';
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const emptyForm = {
  title: '', ulema_id: '', host: '', description: '', is_published: true, ads_enabled: true,
};

export default function Podcasts() {
  const [podcasts, setPodcasts]     = useState([]);
  const [ulemas, setUlemas]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [deleteId, setDeleteId]     = useState(null);

  const [form, setForm]             = useState(emptyForm);
  const [audioFile, setAudioFile]   = useState(null);
  const [finalAudio, setFinalAudio] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState(null);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  const imageRef = useRef();
  const audioRef = useRef();
  const formRef  = useRef();

  useEffect(() => {
    fetchPodcasts();
    fetchList({ key: KEYS.ULEMAS, url: '/ulemas', setData: setUlemas, setLoading: () => {}, setError: () => {} });
  }, []);

  useEffect(() => () => {
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
  }, [audioPreviewUrl, imagePreviewUrl]);

  async function fetchPodcasts() {
    setLoading(true); setError('');
    try {
      const res = await client.get('/podcasts');
      const all = Array.isArray(res.data) ? res.data : [];
      // show unpublished too in admin — re-fetch without filter
      setPodcasts(all);
    } catch (e) { setError(formatApiError(e)); }
    finally { setLoading(false); }
  }

  function handleAudioPick(e) {
    const f = e.target.files[0]; if (!f) return;
    setAudioFile(f); setFinalAudio(f); setSaveError('');
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(URL.createObjectURL(f));
  }

  function handleProcessed(file, url) {
    setFinalAudio(file);
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(url);
  }

  function handleImagePick(e) {
    const f = e.target.files[0]; if (!f) return;
    setImageFile(f);
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(URL.createObjectURL(f));
  }

  function resetForm() {
    setForm(emptyForm);
    setAudioFile(null); setFinalAudio(null);
    setImageFile(null);
    setExistingAudioUrl(null); setExistingImageUrl(null);
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
    setAudioPreviewUrl(null); setImagePreviewUrl(null);
    setSaveError(''); setEditId(null);
  }

  function openAdd() { resetForm(); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 60); }

  function openEdit(p) {
    resetForm();
    setEditId(p.id);
    setForm({
      title: p.title || '',
      ulema_id: p.ulema_id ? String(p.ulema_id) : '',
      host: p.host || '',
      description: p.description || '',
      is_published: p.is_published !== false,
      ads_enabled: p.ads_enabled !== false,
    });
    setExistingAudioUrl(p.audio_url || null);
    setExistingImageUrl(p.image_url || null);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }

  async function handleSave(e) {
    e.preventDefault(); setSaveError('');
    if (!form.title.trim()) { setSaveError('Title is required'); return; }
    if (!editId && !finalAudio) { setSaveError('Audio file is required'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      if (form.ulema_id)           fd.append('ulema_id', form.ulema_id);
      else                         fd.append('ulema_id', '');
      // host is derived from selected ulema name, or manual text if no ulema chosen
      const selectedUlema = ulemas.find(u => String(u.id) === String(form.ulema_id));
      const hostName = selectedUlema ? selectedUlema.name : form.host.trim();
      if (hostName)                fd.append('host', hostName);
      if (form.description.trim()) fd.append('description', form.description.trim());
      fd.append('is_published', form.is_published ? '1' : '0');
      fd.append('ads_enabled', form.ads_enabled ? '1' : '0');
      if (finalAudio) fd.append('audio', finalAudio);
      if (imageFile)  fd.append('image', imageFile);

      if (editId) {
        await client.post(`/podcasts/${editId}`, fd);
      } else {
        await client.post('/podcasts', fd);
      }
      await fetchPodcasts();
      resetForm(); setShowForm(false);
    } catch (e) { setSaveError(formatApiError(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    try {
      await client.delete(`/podcasts/${id}`);
      setPodcasts(p => p.filter(x => x.id !== id));
    } catch (e) { alert(formatApiError(e)); }
    finally { setDeleteId(null); }
  }

  const s = {
    page: { padding: '28px 24px', maxWidth: 900, margin: '0 auto' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    h1: { fontSize: 22, fontWeight: 800, color: 'var(--white)', margin: 0 },
    addBtn: { background: 'var(--emerald)', color: '#000', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
    card: { background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--divider)', padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 14 },
    thumb: { width: 56, height: 56, borderRadius: 8, objectFit: 'cover', background: 'var(--bg-dark)', flexShrink: 0 },
    thumbFallback: { width: 56, height: 56, borderRadius: 8, background: 'rgba(34,197,94,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    cardBody: { flex: 1, minWidth: 0 },
    title: { color: 'var(--white)', fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    meta: { color: 'var(--grey)', fontSize: 12, display: 'flex', gap: 10, flexWrap: 'wrap' },
    badge: (pub) => ({ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: pub ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)', color: pub ? '#22c55e' : '#ef4444', border: `1px solid ${pub ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}` }),
    iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 6, color: 'var(--grey)', fontSize: 13 },
    form: { background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--divider)', padding: 24, marginBottom: 24 },
    formTitle: { fontSize: 16, fontWeight: 800, color: 'var(--white)', marginBottom: 18, margin: '0 0 18px' },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
    field: { display: 'flex', flexDirection: 'column', gap: 6 },
    label: { fontSize: 12, fontWeight: 600, color: 'var(--grey-light)' },
    input: { background: 'var(--bg-dark)', border: '1px solid var(--divider)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, outline: 'none' },
    textarea: { background: 'var(--bg-dark)', border: '1px solid var(--divider)', borderRadius: 8, color: 'var(--white)', padding: '9px 12px', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 72 },
    filePick: { background: 'var(--bg-dark)', border: '1px dashed var(--divider)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', color: 'var(--grey)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 },
    audioPreview: { marginTop: 6, width: '100%', borderRadius: 8, height: 36 },
    imgPreview: { marginTop: 6, width: 72, height: 72, objectFit: 'cover', borderRadius: 8 },
    row: { display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' },
    saveBtn: { background: 'var(--emerald)', color: '#000', border: 'none', borderRadius: 8, padding: '9px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer' },
    cancelBtn: { background: 'var(--bg-dark)', color: 'var(--grey)', border: '1px solid var(--divider)', borderRadius: 8, padding: '9px 16px', fontSize: 13, cursor: 'pointer' },
    errMsg: { color: '#ef4444', fontSize: 12, marginTop: 10 },
    modal: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
    modalBox: { background: 'var(--bg-card)', borderRadius: 14, padding: 28, maxWidth: 360, width: '90%', textAlign: 'center' },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.h1}>🎙️ Podcasts</h1>
        <button style={s.addBtn} onClick={openAdd}>+ Add Podcast</button>
      </div>

      <ErrorBanner message={error} />

      {showForm && (
        <form ref={formRef} style={s.form} onSubmit={handleSave}>
          <p style={s.formTitle}>{editId ? 'Edit Podcast' : 'New Podcast'}</p>

          <div style={s.grid2}>
            <div style={s.field}>
              <label style={s.label}>Title *</label>
              <input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Podcast title" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Host / Speaker (Ulema)</label>
              <select
                style={s.input}
                value={form.ulema_id}
                onChange={e => setForm(f => ({ ...f, ulema_id: e.target.value, host: '' }))}
              >
                <option value="">— Ulema select karein (optional) —</option>
                {ulemas.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ ...s.field, marginTop: 14 }}>
            <label style={s.label}>Description</label>
            <textarea style={s.textarea} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this episode about?" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
            <div style={s.field}>
              <label style={s.label}>Audio File {editId ? '(leave empty to keep)' : '*'}</label>
              <div style={s.filePick} onClick={() => audioRef.current?.click()}>
                🎵 {audioFile ? audioFile.name : (existingAudioUrl ? 'Replace audio...' : 'Choose audio...')}
              </div>
              <input ref={audioRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioPick} />
              {audioFile && (
                <AudioProcessor audioFile={audioFile} onProcessed={handleProcessed} />
              )}
              {(audioPreviewUrl || existingAudioUrl) && (
                <audio controls src={audioPreviewUrl || existingAudioUrl} style={s.audioPreview} />
              )}
            </div>

            <div style={s.field}>
              <label style={s.label}>Cover Image (optional)</label>
              <div style={s.filePick} onClick={() => imageRef.current?.click()}>
                🖼️ {imageFile ? imageFile.name : (existingImageUrl ? 'Replace image...' : 'Choose image...')}
              </div>
              <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImagePick} />
              {(imagePreviewUrl || existingImageUrl) && (
                <img src={imagePreviewUrl || existingImageUrl} alt="" style={s.imgPreview} />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
            <input type="checkbox" id="pub" checked={form.is_published} onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))} />
            <label htmlFor="pub" style={{ ...s.label, cursor: 'pointer' }}>Published (visible in app)</label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <input type="checkbox" id="ads" checked={form.ads_enabled} onChange={e => setForm(f => ({ ...f, ads_enabled: e.target.checked }))} />
            <label htmlFor="ads" style={{ ...s.label, cursor: 'pointer' }}>Play ads on this episode</label>
          </div>

          {saveError && <p style={s.errMsg}>{saveError}</p>}

          <div style={s.row}>
            <button type="button" style={s.cancelBtn} onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button>
            <button type="submit" style={s.saveBtn} disabled={saving}>{saving ? 'Uploading...' : (editId ? 'Save Changes' : 'Upload Podcast')}</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: 'var(--grey)', textAlign: 'center', padding: 40 }}>Loading...</p>
      ) : podcasts.length === 0 ? (
        <p style={{ color: 'var(--grey)', textAlign: 'center', padding: 40 }}>No podcasts yet. Add one above.</p>
      ) : (
        podcasts.map(p => (
          <div key={p.id} style={s.card}>
            {p.image_url
              ? <img src={p.image_url} alt="" style={s.thumb} />
              : <div style={s.thumbFallback}><span style={{ fontSize: 22 }}>🎙️</span></div>
            }
            <div style={s.cardBody}>
              <div style={s.title}>{p.title}</div>
              <div style={s.meta}>
                {p.host && <span>👤 {p.host}</span>}
                {p.duration && <span>⏱ {formatDur(p.duration)}</span>}
                {p.play_count > 0 && <span>▶ {p.play_count}</span>}
                <span style={s.badge(p.is_published)}>{p.is_published ? 'Published' : 'Draft'}</span>
                <span style={s.badge(p.ads_enabled !== false)}>{p.ads_enabled !== false ? '🔊 Ads On' : '🔇 Ads Off'}</span>
              </div>
            </div>
            <button style={s.iconBtn} title="Edit" onClick={() => openEdit(p)}>✏️</button>
            <button style={{ ...s.iconBtn, color: '#ef4444' }} title="Delete" onClick={() => setDeleteId(p.id)}>🗑️</button>
          </div>
        ))
      )}

      {deleteId && (
        <div style={s.modal} onClick={() => setDeleteId(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <p style={{ color: 'var(--white)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Delete Podcast?</p>
            <p style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 22 }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button style={s.cancelBtn} onClick={() => setDeleteId(null)}>Cancel</button>
              <button style={{ ...s.saveBtn, background: '#ef4444' }} onClick={() => handleDelete(deleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
