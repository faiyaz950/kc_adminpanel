import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import AudioProcessor from '../components/AudioProcessor';
import ErrorBanner from '../components/ErrorBanner';

const COUNTRIES = ['India', 'Pakistan'];

const COUNTRY_STYLE = {
  India:    { color: '#22C55E', bg: 'rgba(34,197,94,.12)',  border: 'rgba(34,197,94,.3)'  },
  Pakistan: { color: '#3B82F6', bg: 'rgba(59,130,246,.12)', border: 'rgba(59,130,246,.3)' },
};

export default function OldNauhs() {
  const [tracks, setTracks]         = useState([]);
  const [nauhakhwans, setNauhakhwans] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState(null);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState('');
  const [deleteId, setDeleteId]     = useState(null);

  // form
  const [title, setTitle]           = useState('');
  const [oldNauhakhwanId, setOldNauhakhwanId] = useState('');
  const [country, setCountry]       = useState('India');
  const [audioFile, setAudioFile]   = useState(null);
  const [finalAudio, setFinalAudio] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState(null);
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const imageRef = useRef();
  const audioRef = useRef();
  const formRef = useRef();

  useEffect(() => {
    fetchTracks();
    fetchNauhakhwans();
  }, []);

  async function fetchNauhakhwans() {
    try {
      const res = await client.get('/old-nauhakhwans');
      setNauhakhwans(Array.isArray(res.data) ? res.data : []);
    } catch {
      setNauhakhwans([]);
    }
  }

  useEffect(() => () => {
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
  }, [audioPreviewUrl, imagePreviewUrl]);

  async function fetchTracks() {
    setLoading(true); setError('');
    try {
      const res = await client.get('/old-nauhs');
      setTracks(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  function handleAudioPick(e) {
    const f = e.target.files[0];
    if (!f) return;
    setAudioFile(f);
    setFinalAudio(f);
    setSaveError('');
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(URL.createObjectURL(f));
  }

  function handleProcessed(processedFile, processedUrl) {
    setFinalAudio(processedFile);
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(processedUrl);
  }

  function resetForm() {
    setTitle('');
    setOldNauhakhwanId('');
    setCountry('India');
    setAudioFile(null);
    setFinalAudio(null);
    setImageFile(null);
    setExistingAudioUrl(null);
    setExistingImageUrl(null);
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setSaveError('');
    setEditId(null);
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    if (audioRef.current) audioRef.current.value = '';
    if (imageRef.current) imageRef.current.value = '';
    setShowForm(false);
  }

  function openAddForm() {
    resetForm();
    fetchNauhakhwans();
    setShowForm(true);
    setSaveError('');
  }

  function handleEdit(track) {
    if (audioPreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(audioPreviewUrl);
    setAudioPreviewUrl(null);
    setAudioFile(null);
    setFinalAudio(null);
    setImageFile(null);
    if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    if (audioRef.current) audioRef.current.value = '';
    if (imageRef.current) imageRef.current.value = '';

    setEditId(track.id);
    setTitle(track.title || '');
    let khwanId = track.old_nauhakhwan_id ? String(track.old_nauhakhwan_id) : '';
    if (!khwanId && track.nauhakhwan_name) {
      const match = nauhakhwans.find(n => n.name === track.nauhakhwan_name);
      if (match) khwanId = String(match.id);
    }
    setOldNauhakhwanId(khwanId);
    setCountry(track.country || 'India');
    setExistingAudioUrl(track.audio_url || null);
    setExistingImageUrl(track.image_url || null);
    setSaveError('');
    setShowForm(true);

    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return setSaveError('Title required hai.');
    if (!oldNauhakhwanId) return setSaveError('Nauhakhwan select karein.');
    if (!editId && !finalAudio) return setSaveError('Audio file select karein.');

    setSaving(true);
    setSaveError('');
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('old_nauhakhwan_id', oldNauhakhwanId);
      fd.append('country', country);
      if (finalAudio) fd.append('audio', finalAudio, finalAudio.name || 'audio.mp3');
      if (imageFile) fd.append('image', imageFile);

      if (editId) {
        await client.post(`/old-nauhs/${editId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await client.post('/old-nauhs', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      resetForm();
      fetchTracks();
    } catch (err) {
      setSaveError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Ye track delete ho jayega. Sure?')) return;
    setDeleteId(id);
    try {
      await client.delete(`/old-nauhs/${id}`);
      setTracks(t => t.filter(x => x.id !== id));
      if (editId === id) resetForm();
    } catch (e) {
      alert(formatApiError(e));
    } finally {
      setDeleteId(null);
    }
  }

  const audioPlayerSrc = audioPreviewUrl || existingAudioUrl;
  const coverPreview = imagePreviewUrl || existingImageUrl;

  return (
    <div style={{ padding: '28px 24px', maxWidth: 900, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 3, height: 36, borderRadius: 2, background: 'linear-gradient(180deg,#EF4444,rgba(239,68,68,.3))' }} />
          <div>
            <h1 style={{ margin: 0, color: 'var(--white)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>Old's Nauhe</h1>
            <p style={{ margin: '3px 0 0', color: 'var(--grey-dark)', fontSize: 12 }}>{tracks.length} tracks</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/old-nauhakhwans"
            style={{
              padding: '10px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              color: 'var(--grey-light)', border: '1px solid var(--divider)',
              textDecoration: 'none', background: 'var(--bg-surface)',
            }}
          >
            Nauhakhwans
          </Link>
          <button
            type="button"
            onClick={() => (showForm ? resetForm() : openAddForm())}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
              background: showForm ? 'var(--bg-surface)' : 'linear-gradient(135deg,#EF4444,#DC2626)',
              color: 'var(--white)',
              boxShadow: showForm ? 'none' : '0 4px 16px rgba(239,68,68,.3)',
              outline: showForm ? '1px solid var(--divider)' : 'none',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{showForm ? '✕' : '+'}</span>
            {showForm ? 'Cancel' : 'Add Track'}
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* ── Add / Edit Form ── */}
      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: 16, padding: 24, marginBottom: 28 }}
        >
          <h3 style={{ margin: '0 0 20px', color: 'var(--white)', fontSize: 15, fontWeight: 700 }}>
            {editId ? 'Old Nauh Edit Karein' : 'Naya Old Nauh Add Karein'}
          </h3>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nauh ka title..."
              style={inputStyle}
            />
          </div>

          {/* Nauhakhwan */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Nauhakhwan *</label>
              <Link to="/old-nauhakhwans" style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
                + Naya nauhakhwan add karein
              </Link>
            </div>
            {nauhakhwans.length === 0 ? (
              <div style={{
                padding: '12px 14px', borderRadius: 10, border: '1px dashed var(--divider)',
                color: 'var(--grey)', fontSize: 12, background: 'var(--bg-surface)',
              }}>
                Pehle{' '}
                <Link to="/old-nauhakhwans" style={{ color: 'var(--gold)', fontWeight: 700 }}>Old Nauhakhwans</Link>
                {' '}page se nauhakhwan add karein.
              </div>
            ) : (
              <select
                value={oldNauhakhwanId}
                onChange={e => setOldNauhakhwanId(e.target.value)}
                style={inputStyle}
                required
              >
                <option value="">-- Nauhakhwan select karein --</option>
                {nauhakhwans.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.name}{n.country ? ` (${n.country})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Country */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Country *</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {COUNTRIES.map(c => (
                <button key={c} type="button" onClick={() => setCountry(c)}
                  style={{
                    padding: '8px 20px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    border: country === c ? 'none' : '1px solid var(--divider)',
                    background: country === c ? 'linear-gradient(135deg,#EF4444,#DC2626)' : 'var(--bg-surface)',
                    color: 'var(--white)', transition: 'all .15s',
                  }}
                >{c}</button>
              ))}
            </div>
          </div>

          {/* Audio File */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>
              MP3 / Audio File {editId ? '(optional — naya upload)' : '*'}
            </label>
            <p style={{ fontSize: 11, color: 'var(--grey-dark)', margin: '0 0 8px' }}>
              {editId
                ? 'Audio change nahi karna ho to khali chhod dein — purani file reh jayegi.'
                : 'Duration MP3 se automatically detect hogi — manually set karne ki zaroorat nahi.'}
            </p>
            <input
              ref={audioRef}
              type="file"
              accept="audio/*,.mp3,.aac,.m4a,.wav,.ogg"
              onChange={handleAudioPick}
              style={{ color: 'var(--grey-light)', fontSize: 13 }}
            />
            {audioPlayerSrc && (
              <audio controls src={audioPlayerSrc}
                style={{ width: '100%', marginTop: 10, height: 36, accentColor: 'var(--gold)' }} />
            )}
            {audioFile && finalAudio && finalAudio !== audioFile && (
              <div style={{ marginTop: 8, padding: '6px 12px', borderRadius: 8, background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', color: '#10B981', fontSize: 11, fontWeight: 600 }}>
                ✓ Processed audio use ho rahi hai upload mein
              </div>
            )}
            {audioFile && (
              <AudioProcessor
                file={audioFile}
                onProcessed={handleProcessed}
              />
            )}
          </div>

          {/* Cover Image */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Cover Image {editId ? '(optional — naya upload)' : '(optional)'}
            </label>
            {coverPreview && !imageFile && (
              <div style={{ marginBottom: 10 }}>
                <img
                  src={coverPreview}
                  alt="Current cover"
                  style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--divider)' }}
                />
              </div>
            )}
            <div
              onClick={() => imageRef.current?.click()}
              style={{ ...inputStyle, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--grey)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span style={{ color: imageFile ? 'var(--white)' : 'var(--grey-dark)', fontSize: 13 }}>
                {imageFile ? imageFile.name : 'Cover image choose karein'}
              </span>
            </div>
            <input ref={imageRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files[0] || null;
                setImageFile(f);
                if (imagePreviewUrl?.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl);
                setImagePreviewUrl(f ? URL.createObjectURL(f) : null);
              }} />
          </div>

          {saveError && (
            <p style={{ color: '#F87171', fontSize: 12, marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,.08)', borderRadius: 8 }}>
              {saveError}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={resetForm}
              style={{
                flex: 1, padding: 13, borderRadius: 12,
                border: '1px solid var(--divider)', background: 'var(--bg-surface)',
                color: 'var(--grey-light)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{
                flex: 2, padding: 13, borderRadius: 12, border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg,#EF4444,#DC2626)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(239,68,68,.3)',
              }}
            >
              {saving
                ? (editId ? 'Update ho raha hai...' : 'Upload ho raha hai...')
                : (editId ? 'Update Karein' : 'Track Upload Karein')}
            </button>
          </div>
        </form>
      )}

      {/* ── Track List ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 68, borderRadius: 12, background: 'var(--bg-card)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
          <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        </div>
      ) : tracks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--grey-dark)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎵</div>
          <p style={{ margin: 0, fontWeight: 600 }}>Koi track nahi hai abhi</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>"Add Track" tap kar ke add karein</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tracks.map(track => {
            const cs = COUNTRY_STYLE[track.country] || COUNTRY_STYLE.India;
            const isEditing = editId === track.id;
            return (
              <div key={track.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: isEditing ? 'rgba(239,68,68,.06)' : 'var(--bg-card)',
                border: `1px solid ${isEditing ? 'rgba(239,68,68,.35)' : 'var(--divider)'}`,
                borderRadius: 12, padding: '10px 14px',
              }}>
                {/* Thumbnail */}
                <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {track.image_url
                    ? <img src={track.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  }
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {track.title}
                  </div>
                  {track.nauhakhwan_name && (
                    <div style={{ color: 'var(--grey-light)', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {track.nauhakhwan_name}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: cs.color, background: cs.bg, border: `1px solid ${cs.border}` }}>
                      {track.country}
                    </span>
                    {track.duration && (
                      <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>{track.duration}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleEdit(track)}
                    style={{
                      background: 'rgba(212,168,67,.1)',
                      border: '1px solid rgba(212,168,67,.25)',
                      color: 'var(--gold)',
                      borderRadius: 8,
                      padding: '7px 12px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(track.id)}
                    disabled={deleteId === track.id}
                    style={{
                      background: 'rgba(239,68,68,.08)',
                      border: '1px solid rgba(239,68,68,.2)',
                      color: '#EF4444',
                      borderRadius: 8,
                      padding: '7px 10px',
                      cursor: 'pointer',
                      opacity: deleteId === track.id ? 0.5 : 1,
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', color: 'var(--grey)', fontSize: 12, fontWeight: 600, marginBottom: 6 };
const inputStyle  = { width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--divider)', background: 'var(--bg-surface)', color: 'var(--white)', fontSize: 13, boxSizing: 'border-box', outline: 'none' };
