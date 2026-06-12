import { useState, useEffect, useRef } from 'react';
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
  const [tracks, setTracks]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteId, setDeleteId]   = useState(null);

  // form state
  const [title, setTitle]         = useState('');
  const [country, setCountry]     = useState('India');
  const [imageFile, setImageFile] = useState(null);
  const imageRef = useRef();

  // audio processor
  const [audioKey, setAudioKey]   = useState(0);
  const audioResultRef            = useRef(null);

  useEffect(() => { fetchTracks(); }, []);

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

  function resetForm() {
    setTitle(''); setCountry('India');
    setImageFile(null); setSaveError('');
    setAudioKey(k => k + 1);
    audioResultRef.current = null;
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim())              return setSaveError('Title required hai.');
    if (!audioResultRef.current)    return setSaveError('Audio file select karein.');
    if (!audioResultRef.current.blob) return setSaveError('Audio process ho raha hai, zaraa wait karein.');

    setSaving(true); setSaveError('');
    try {
      const fd = new FormData();
      fd.append('title',   title.trim());
      fd.append('country', country);
      fd.append('audio',   audioResultRef.current.blob, audioResultRef.current.filename || 'audio.mp3');
      if (imageFile) fd.append('image', imageFile);

      await client.post('/old-nauhs', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      resetForm();
      fetchTracks();
    } catch (e) {
      setSaveError(formatApiError(e));
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
    } catch (e) {
      alert(formatApiError(e));
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div style={{ padding: '28px 24px', maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 3, height: 36, borderRadius: 2, background: 'linear-gradient(180deg, #EF4444, rgba(239,68,68,.3))' }} />
          <div>
            <h1 style={{ margin: 0, color: 'var(--white)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>Old's Nauhe</h1>
            <p style={{ margin: '3px 0 0', color: 'var(--grey-dark)', fontSize: 12 }}>{tracks.length} tracks</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(f => !f); setSaveError(''); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: showForm ? 'var(--bg-surface)' : 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: 'var(--white)',
            boxShadow: showForm ? 'none' : '0 4px 16px rgba(239,68,68,.3)',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>{showForm ? '✕' : '+'}</span>
          {showForm ? 'Cancel' : 'Add Track'}
        </button>
      </div>

      <ErrorBanner message={error} />

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: 'var(--bg-card)', border: '1px solid var(--divider)', borderRadius: 16, padding: 24, marginBottom: 28 }}>
          <h3 style={{ margin: '0 0 20px', color: 'var(--white)', fontSize: 15, fontWeight: 700 }}>Naya Old Nauh Add Karein</h3>

          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Title *</label>
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Nauh ka title..."
              style={inputStyle}
            />
          </div>

          {/* Country */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Country *</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {COUNTRIES.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setCountry(c)}
                  style={{
                    padding: '8px 20px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    border: country === c ? 'none' : '1px solid var(--divider)',
                    background: country === c ? 'linear-gradient(135deg, #EF4444, #DC2626)' : 'var(--bg-surface)',
                    color: 'var(--white)',
                    transition: 'all .15s',
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Audio */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Audio File *</label>
            <AudioProcessor
              key={audioKey}
              onResult={result => { audioResultRef.current = result; }}
            />
          </div>

          {/* Cover Image */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Cover Image (optional)</label>
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
              onChange={e => setImageFile(e.target.files[0] || null)} />
          </div>

          {saveError && <p style={{ color: '#F87171', fontSize: 12, marginBottom: 12 }}>{saveError}</p>}

          <button
            type="submit" disabled={saving}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              color: '#fff', fontSize: 14, fontWeight: 700,
              opacity: saving ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(239,68,68,.3)',
            }}
          >
            {saving ? 'Upload ho raha hai...' : 'Track Upload Karein'}
          </button>
        </form>
      )}

      {/* Tracks List */}
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
            return (
              <div key={track.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                background: 'var(--bg-card)', border: '1px solid var(--divider)',
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: cs.color, background: cs.bg, border: `1px solid ${cs.border}` }}>
                      {track.country}
                    </span>
                    {track.duration && (
                      <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>{track.duration}</span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(track.id)}
                  disabled={deleteId === track.id}
                  style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', color: '#EF4444', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', flexShrink: 0, opacity: deleteId === track.id ? 0.5 : 1 }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
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
