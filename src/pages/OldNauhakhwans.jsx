import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';
import SearchInput from '../components/SearchInput';

const COUNTRIES = ['India', 'Pakistan'];

const COUNTRY_STYLE = {
  India:    { color: '#22C55E', bg: 'rgba(34,197,94,.12)',  border: 'rgba(34,197,94,.3)'  },
  Pakistan: { color: '#3B82F6', bg: 'rgba(59,130,246,.12)', border: 'rgba(59,130,246,.3)' },
};

const emptyForm = { name: '', country: 'India', bio: '' };

export default function OldNauhakhwans() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchList(); }, []);

  async function fetchList() {
    setLoading(true);
    setFetchError('');
    try {
      const res = await client.get('/old-nauhakhwans');
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setFetchError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(emptyForm);
    setEditId(null);
    setImageFile(null);
    setSaveError('');
    setShowForm(false);
  }

  function handleEdit(item) {
    setForm({
      name: item.name || '',
      country: item.country || 'India',
      bio: item.bio || '',
      image_url: item.image_url || '',
    });
    setEditId(item.id);
    setImageFile(null);
    setSaveError('');
    setShowForm(true);
    window.scrollTo(0, 0);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setSaveError('Naam required hai.');

    setSaving(true);
    setSaveError('');
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('country', form.country || '');
      fd.append('bio', form.bio || '');
      if (imageFile) fd.append('image', imageFile);

      if (editId) {
        await client.post(`/old-nauhakhwans/${editId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await client.post('/old-nauhakhwans', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      resetForm();
      fetchList();
    } catch (err) {
      setSaveError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Ye nauhakhwan delete ho jayega. Sure?')) return;
    setDeleteId(id);
    try {
      await client.delete(`/old-nauhakhwans/${id}`);
      setList(prev => prev.filter(x => x.id !== id));
      if (editId === id) resetForm();
    } catch (err) {
      alert(formatApiError(err));
    } finally {
      setDeleteId(null);
    }
  }

  const q = search.toLowerCase();
  const filtered = search
    ? list.filter(x =>
        x.name?.toLowerCase().includes(q) ||
        x.country?.toLowerCase().includes(q)
      )
    : list;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Old Nauhakhwans</h2>
          <p className="page-subtitle">
            {list.length} total · Classic nauhe ke reciters
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Naam ya country..."
            width={200}
          />
          <Link
            to="/old-nauhs"
            style={{
              padding: '9px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              color: 'var(--grey-light)', border: '1px solid var(--divider)',
              textDecoration: 'none', background: 'var(--bg-surface)',
            }}
          >
            Old's Nauhe →
          </Link>
          <button className="btn-primary" onClick={() => { resetForm(); setShowForm(p => !p); }}>
            {showForm ? '✕ Cancel' : '+ Add Nauhakhwan'}
          </button>
        </div>
      </div>

      <ErrorBanner error={fetchError} onRetry={fetchList} />

      {showForm && (
        <div className="form-card" style={{ marginBottom: 24 }}>
          <div className="section-title-row" style={{ marginBottom: 22 }}>
            <div className="accent-bar" style={{ background: 'linear-gradient(to bottom, #EF4444, rgba(239,68,68,.3))' }} />
            <h3 className="section-title">{editId ? 'Nauhakhwan Edit Karein' : 'Naya Nauhakhwan Add Karein'}</h3>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div>
                <label className="form-label">Naam *</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Maslan: Mir Hasan Mir"
                  required
                />
              </div>
              <div>
                <label className="form-label">Country</label>
                <select
                  className="form-input"
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                >
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Bio (optional)</label>
                <textarea
                  className="form-input"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  style={{ resize: 'vertical' }}
                />
              </div>
              <div>
                <label className="form-label">Photo {editId ? '(naya upload optional)' : '(optional)'}</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-input"
                  style={{ paddingTop: 8, paddingBottom: 8 }}
                  onChange={e => setImageFile(e.target.files[0] || null)}
                />
                {(imageFile || form.image_url) && (
                  <img
                    src={imageFile ? URL.createObjectURL(imageFile) : form.image_url}
                    alt=""
                    style={{
                      width: 64, height: 64, borderRadius: '50%', objectFit: 'cover',
                      marginTop: 10, border: '2px solid #EF4444',
                    }}
                  />
                )}
              </div>
            </div>

            {saveError && <div className="err-banner" style={{ marginTop: 16 }}>{saveError}</div>}
            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn-save" disabled={saving} style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}>
                {saving ? 'Saving...' : editId ? 'Update Karein' : 'Add Karein'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 68, borderRadius: 12, background: 'var(--bg-card)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--grey-dark)' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>Koi nauhakhwan nahi hai</p>
          <p style={{ margin: '6px 0 0', fontSize: 13 }}>Pehle nauhakhwan add karein, phir Old&apos;s Nauhe upload karein</p>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nauhakhwan</th>
                <th>Country</th>
                <th>Nauhe</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => {
                const cs = COUNTRY_STYLE[item.country] || COUNTRY_STYLE.India;
                return (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                          background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {item.image_url
                            ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: '#EF4444', fontWeight: 800, fontSize: 14 }}>{item.name?.[0]}</span>
                          }
                        </div>
                        <div>
                          <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                          {item.bio && (
                            <div style={{ color: 'var(--grey-dark)', fontSize: 11, marginTop: 2, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.bio}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.country && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                          color: cs.color, background: cs.bg, border: `1px solid ${cs.border}`,
                        }}>
                          {item.country}
                        </span>
                      )}
                    </td>
                    <td style={{ color: 'var(--grey-light)', fontWeight: 600 }}>{item.old_nauhs_count ?? 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button type="button" className="tbl-btn tbl-btn-edit" onClick={() => handleEdit(item)}>Edit</button>
                        <button
                          type="button"
                          className="tbl-btn tbl-btn-delete"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteId === item.id}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
