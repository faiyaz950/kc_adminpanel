import { useState, useEffect } from 'react';
import client from '../api/client';

const CATEGORIES = ['dua', 'noha', 'manqabat', 'naat', 'ziyarat', 'kids', 'tarana'];
const LANGUAGES = ['Arabic', 'Urdu', 'Punjabi', 'Hindi', 'Farsi', 'English'];
const CAT_COLORS = {
  dua:      { color: '#06B6D4', bg: 'rgba(6,182,212,.12)',   border: 'rgba(6,182,212,.3)'   },
  noha:     { color: '#EF4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)'   },
  manqabat: { color: '#8B5CF6', bg: 'rgba(139,92,246,.12)', border: 'rgba(139,92,246,.3)'  },
  naat:     { color: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.3)'  },
  ziyarat:  { color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)'  },
  kids:     { color: '#F59E0B', bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.3)'  },
  tarana:   { color: '#EC4899', bg: 'rgba(236,72,153,.12)',  border: 'rgba(236,72,153,.3)'  },
};
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

  useEffect(() => { fetchReciters(); }, []);

  const fetchReciters = () => {
    setLoading(true);
    client.get('/reciters').then(r => setReciters(r.data)).catch(console.error).finally(() => setLoading(false));
  };

  const toggle = (arr, val) => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('bio', form.bio || '');
      fd.append('total_tracks', form.total_tracks || 0);
      fd.append('is_verified', form.is_verified ? '1' : '0');
      fd.append('categories', JSON.stringify(form.categories || []));
      fd.append('languages', JSON.stringify(form.languages || []));
      if (imageFile) fd.append('image', imageFile);
      const opts = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (editId) await client.post(`/reciters/${editId}`, fd, opts);
      else await client.post('/reciters', fd, opts);
      resetForm(); fetchReciters();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Error saving reciter.');
    } finally { setSaving(false); }
  };

  const handleEdit = (r) => {
    setForm({ ...r, categories: r.categories || [], languages: r.languages || [] });
    setEditId(r.id); setShowForm(true); setImageFile(null); setSaveError('');
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Reciter delete karna chahte ho?')) return;
    await client.delete(`/reciters/${id}`); fetchReciters();
  };

  const resetForm = () => {
    setForm(emptyForm); setEditId(null); setShowForm(false); setImageFile(null); setSaveError('');
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Reciters</h2>
          <p className="page-subtitle">{reciters.length} reciters registered</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(p => !p); }}>
          {showForm ? '✕ Cancel' : '+ Reciter Add Karein'}
        </button>
      </div>

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 22 }}>
            <div className="accent-bar" />
            <h3 className="section-title">{editId ? 'Reciter Edit Karein' : 'Naya Reciter Add Karein'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div>
                <label className="form-label">Naam *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="form-label">Total Tracks</label>
                <input className="form-input" type="number" value={form.total_tracks} onChange={e => setForm(f => ({ ...f, total_tracks: +e.target.value }))} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Bio</label>
                <textarea className="form-input" value={form.bio || ''} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} style={{ resize: 'vertical' }} />
              </div>

              {/* Categories */}
              <div>
                <label className="form-label">Categories</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {CATEGORIES.map(c => {
                    const cm = CAT_COLORS[c];
                    const checked = (form.categories || []).includes(c);
                    return (
                      <button key={c} type="button"
                        onClick={() => setForm(f => ({ ...f, categories: toggle(f.categories || [], c) }))}
                        style={{
                          padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: checked ? cm.bg : 'var(--bg-surface)',
                          color: checked ? cm.color : 'var(--grey)',
                          border: `1px solid ${checked ? cm.border : 'var(--divider)'}`,
                          transition: 'all .15s',
                        }}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Languages */}
              <div>
                <label className="form-label">Languages</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {LANGUAGES.map(l => {
                    const checked = (form.languages || []).includes(l);
                    return (
                      <button key={l} type="button"
                        onClick={() => setForm(f => ({ ...f, languages: toggle(f.languages || [], l) }))}
                        style={{
                          padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: checked ? 'rgba(22,163,74,.12)' : 'var(--bg-surface)',
                          color: checked ? 'var(--emerald-light)' : 'var(--grey)',
                          border: `1px solid ${checked ? 'rgba(22,163,74,.3)' : 'var(--divider)'}`,
                          transition: 'all .15s',
                        }}>
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Verified */}
              <div>
                <label className="form-label">Verified Status</label>
                <select className="form-input" value={form.is_verified ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_verified: e.target.value === 'yes' }))}>
                  <option value="no">Not Verified</option>
                  <option value="yes">✓ Verified</option>
                </select>
              </div>

              {/* Photo */}
              <div>
                <label className="form-label">Photo Upload</label>
                <input type="file" accept="image/*" className="form-input" style={{ paddingTop: 8, paddingBottom: 8 }}
                  onChange={e => setImageFile(e.target.files[0])} />
                {(imageFile || form.image_url) && (
                  <img src={imageFile ? URL.createObjectURL(imageFile) : form.image_url} alt=""
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', marginTop: 10, border: '2px solid var(--gold)' }} />
                )}
              </div>
            </div>

            {saveError && <div className="err-banner" style={{ marginTop: 16 }}>{saveError}</div>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update Karein' : 'Add Karein'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <GridSkeleton />
      ) : (
        <div style={grid}>
          {reciters.length === 0 && (
            <p style={{ color: 'var(--grey)', gridColumn: '1/-1', padding: '40px 0', textAlign: 'center' }}>Koi reciter nahi</p>
          )}
          {reciters.map(r => <ReciterCard key={r.id} r={r} onEdit={handleEdit} onDelete={handleDelete} />)}
        </div>
      )}
    </div>
  );
}

function ReciterCard({ r, onEdit, onDelete }) {
  return (
    <div style={card}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,168,67,.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--divider)'}
    >
      {/* Top accent */}
      <div style={{ height: 2, background: 'linear-gradient(to right, var(--emerald), transparent)', borderRadius: '2px 2px 0 0' }} />

      <div style={{ padding: '16px 16px 14px' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={avatarWrap}>
            {r.image_url
              ? <img src={r.image_url} alt={r.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--grey-dark)" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
              {r.is_verified && (
                <span style={{ background: 'rgba(212,168,67,.15)', color: 'var(--gold)', border: '1px solid rgba(212,168,67,.3)', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>✓ Verified</span>
              )}
            </div>
            <div style={{ color: 'var(--grey-dark)', fontSize: 12, marginTop: 2 }}>{r.total_tracks} tracks</div>
          </div>
        </div>

        {/* Bio */}
        {r.bio && <p style={{ color: 'var(--grey)', fontSize: 12, lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.bio}</p>}

        {/* Category tags */}
        {r.categories?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {r.categories.map(c => {
              const cm = CAT_COLORS[c] || {};
              return <span key={c} style={{ background: cm.bg, color: cm.color, border: `1px solid ${cm.border}`, padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>{c}</span>;
            })}
          </div>
        )}

        {/* Language tags */}
        {r.languages?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
            {r.languages.map(l => (
              <span key={l} style={{ background: 'var(--bg-surface)', color: 'var(--grey)', border: '1px solid var(--divider)', padding: '2px 8px', borderRadius: 4, fontSize: 10 }}>{l}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="tbl-btn tbl-btn-edit" style={{ flex: 1, textAlign: 'center' }} onClick={() => onEdit(r)}>Edit</button>
          <button className="tbl-btn tbl-btn-delete" style={{ flex: 1, textAlign: 'center' }} onClick={() => onDelete(r.id)}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div style={grid}>
      {[1,2,3,4,5,6].map(i => (
        <div key={i} style={{ ...card, height: 200, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: 14,
};

const card = {
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: 16,
  overflow: 'hidden',
  transition: 'border-color .2s, transform .2s',
};

const avatarWrap = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: 'var(--bg-surface)',
  border: '2px solid var(--divider)',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
