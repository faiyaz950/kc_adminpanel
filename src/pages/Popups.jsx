import { useState, useEffect } from 'react';
import client from '../api/client';

export default function Popups() {
  const [popups, setPopups]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: '', link_url: '', is_active: true, sort_order: 0 });
  const [editId, setEditId]     = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview]   = useState(null);

  const load = () => {
    setLoading(true);
    client.get('/admin/popups')
      .then(r => setPopups(r.data))
      .catch(() => setError('Failed to load popups'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ title: '', link_url: '', is_active: true, sort_order: popups.length });
    setImageFile(null);
    setPreview(null);
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditId(p.id);
    setForm({ title: p.title || '', link_url: p.link_url || '', is_active: p.is_active, sort_order: p.sort_order });
    setImageFile(null);
    setPreview(p.image_url);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editId && !imageFile) { setError('Please select an image'); return; }
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      if (form.title)    fd.append('title', form.title);
      if (form.link_url) fd.append('link_url', form.link_url);
      fd.append('is_active', form.is_active ? '1' : '0');
      fd.append('sort_order', String(form.sort_order));
      if (imageFile) fd.append('image', imageFile);
      if (editId) {
        await client.post(`/popups/${editId}`, fd);
      } else {
        await client.post('/popups', fd);
      }
      setShowForm(false);
      setImageFile(null);
      load();
    } catch {
      setError('Save failed — check image format (JPEG/PNG/WebP, max 5MB)');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    try {
      await client.post(`/popups/${p.id}`, { ...p, is_active: !p.is_active });
      load();
    } catch { setError('Update failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this popup?')) return;
    try {
      await client.delete(`/popups/${id}`);
      load();
    } catch { setError('Delete failed'); }
  };

  const inputStyle = {
    background: 'var(--bg-surface)', border: '1px solid var(--divider)',
    borderRadius: 10, color: 'var(--white)', padding: '10px 14px',
    fontSize: 13, width: '100%', outline: 'none',
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: 'var(--white)', fontSize: 22, fontWeight: 800, margin: 0 }}>Popup Banners</h1>
          <p style={{ color: 'var(--grey)', fontSize: 13, margin: '4px 0 0' }}>
            Manage promotional images shown to users on home screen
          </p>
        </div>
        <button onClick={openAdd} style={{
          background: 'linear-gradient(135deg, var(--emerald), var(--emerald-light))',
          color: '#fff', border: 'none', borderRadius: 10,
          padding: '10px 20px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Banner
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
            {editId ? 'Edit Banner' : 'Add New Banner'}
          </h3>

          <div className="form-grid-2" style={{ marginBottom: 16 }}>
            <div>
              <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>TITLE (optional)</label>
              <input
                style={inputStyle}
                placeholder="e.g. Muharram 2025"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>DISPLAY ORDER</label>
              <input
                type="number" min="0"
                style={inputStyle}
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
              IMAGE {editId ? '(leave empty to keep current)' : '*'}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                setImageFile(file);
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
              JPEG, PNG or WebP — max 5 MB
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 8 }}>PREVIEW</label>
              <img
                src={preview}
                alt="preview"
                style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--divider)' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'var(--grey)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', display: 'block', marginBottom: 6 }}>
              LINK URL <span style={{ color: 'var(--grey-dark)', fontWeight: 500, letterSpacing: 0 }}>(optional — tap on image opens this)</span>
            </label>
            <input
              style={inputStyle}
              placeholder="https://example.com/page"
              value={form.link_url}
              onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                style={{ accentColor: 'var(--emerald)', width: 16, height: 16 }}
              />
              <span style={{ color: 'var(--grey)', fontSize: 13 }}>Active (show in app)</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSave} disabled={saving} style={{
              background: 'linear-gradient(135deg, var(--emerald), var(--emerald-light))',
              color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px',
              fontWeight: 700, fontSize: 13, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Saving…' : editId ? 'Update' : 'Add Banner'}
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

      {/* Banners list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--grey)' }}>Loading…</div>
      ) : popups.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 16, padding: 60,
          textAlign: 'center', border: '1px solid var(--divider)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
          <div style={{ color: 'var(--white)', fontWeight: 700, marginBottom: 6 }}>No banners yet</div>
          <div style={{ color: 'var(--grey)', fontSize: 13 }}>Click "Add Banner" to create your first popup image</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {popups.map(p => (
            <div key={p.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--divider)',
              borderRadius: 16, overflow: 'hidden', display: 'flex', alignItems: 'stretch',
              flexWrap: 'wrap',
            }}>
              {/* Thumbnail */}
              <div style={{ width: 120, minHeight: 90, flexShrink: 0, background: 'var(--bg-surface)', position: 'relative' }}>
                <img
                  src={p.image_url}
                  alt={p.title || 'Banner'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>

              {/* Info */}
              <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  {p.title || <span style={{ color: 'var(--grey-dark)', fontStyle: 'italic' }}>Untitled</span>}
                </div>
                <div style={{ color: 'var(--grey)', fontSize: 12, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.image_url}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: p.is_active ? 'rgba(22,163,74,.15)' : 'rgba(255,255,255,.06)',
                    color: p.is_active ? 'var(--emerald-light)' : 'var(--grey)',
                    border: `1px solid ${p.is_active ? 'rgba(22,163,74,.3)' : 'var(--divider)'}`,
                  }}>
                    {p.is_active ? '● Active' : '○ Inactive'}
                  </span>
                  <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>Order: {p.sort_order}</span>
                  {p.link_url && (
                    <span style={{
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: 'rgba(212,168,67,.08)', color: 'var(--gold)',
                      border: '1px solid rgba(212,168,67,.2)',
                    }}>
                      🔗 Link
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: '12px 16px', alignItems: 'center' }}>
                <button onClick={() => toggleActive(p)} style={{
                  background: p.is_active ? 'rgba(239,68,68,.08)' : 'rgba(22,163,74,.08)',
                  color: p.is_active ? '#f87171' : 'var(--emerald-light)',
                  border: `1px solid ${p.is_active ? 'rgba(239,68,68,.25)' : 'rgba(22,163,74,.25)'}`,
                  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  {p.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => openEdit(p)} style={{
                  background: 'rgba(212,168,67,.08)', color: 'var(--gold)',
                  border: '1px solid rgba(212,168,67,.25)',
                  borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(p.id)} style={{
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
