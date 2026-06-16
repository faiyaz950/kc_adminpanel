import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';

const ACCENT = '#D4A843';

const ALL_CATEGORIES = [
  { id: 'noha', label: 'Nauhe', sublabel: 'Elegies', emoji: '💧', color: '#EF4444' },
  { id: 'taqreer', label: 'Taqreer', sublabel: 'Ulema & Speeches', emoji: '🎙️', color: '#7C3AED' },
  { id: 'manqabat', label: 'Manqabat', sublabel: 'Devotional', emoji: '✨', color: '#8B5CF6' },
  { id: 'dua_ziyarat', label: 'Duas & Ziyarat', sublabel: 'Supplications', emoji: '🤲', color: '#06B6D4' },
  { id: 'marsiya', label: 'Marsiya', sublabel: 'Elegiac Poetry', emoji: '📜', color: '#7F1D1D' },
  { id: 'soz_o_salam', label: 'Soz o Salam', sublabel: 'Lament & Salutation', emoji: '🌙', color: '#D97706' },
];

const metaFor = (id) => ALL_CATEGORIES.find(c => c.id === id) || { id, label: id, sublabel: '', emoji: '📁', color: ACCENT };

export default function HomeBrowseCategories({ embedded = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [dirty, setDirty] = useState(false);
  const [addId, setAddId] = useState('');
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const res = await client.get('/admin/home-categories');
      const rows = Array.isArray(res.data?.items) ? res.data.items : [];
      setItems(rows.map(r => ({ ...metaFor(r.id), order: r.order })));
      setDirty(false);
    } catch (err) {
      setFetchError(formatApiError(err, 'Home categories load nahi hue.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const payload = items.map((c, i) => ({ id: c.id, order: i + 1 }));
      await client.post('/home-categories/set-order', { items: payload });
      setSaveMsg('✓ Browse categories save ho gayi!');
      setDirty(false);
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      setSaveMsg(`Error: ${formatApiError(err, 'Save nahi hua.')}`);
    } finally {
      setSaving(false);
    }
  };

  const moveItem = (from, to) => {
    if (from === to) return;
    setItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
  };

  const moveUp = (i) => { if (i > 0) moveItem(i, i - 1); };
  const moveDown = (i) => { if (i < items.length - 1) moveItem(i, i + 1); };

  const removeItem = (id) => {
    setItems(prev => prev.filter(c => c.id !== id));
    setDirty(true);
  };

  const handleAdd = () => {
    if (!addId) return;
    if (items.some(c => c.id === addId)) return;
    setItems(prev => [...prev, metaFor(addId)]);
    setAddId('');
    setDirty(true);
  };

  const onDragStart = (i) => { dragIndex.current = i; };
  const onDragOver = (e, i) => {
    e.preventDefault();
    if (dragIndex.current !== i) setDragOver(i);
  };
  const onDrop = (i) => {
    moveItem(dragIndex.current, i);
    dragIndex.current = null;
    setDragOver(null);
  };
  const onDragEnd = () => { dragIndex.current = null; setDragOver(null); };

  const visibleIds = new Set(items.map(c => c.id));
  const available = ALL_CATEGORIES.filter(c => !visibleIds.has(c.id));

  return (
    <div className={embedded ? undefined : 'page-wrapper'}>
      <div className="page-header">
        <div>
          {!embedded && <h2 className="page-title">Home — Browse Categories</h2>}
          <p className="page-subtitle">
            {items.length} card{items.length !== 1 ? 's' : ''} · App home screen par is order mein dikhenge
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {saveMsg && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
              background: saveMsg.startsWith('Error') ? 'rgba(239,68,68,.12)' : 'rgba(16,185,129,.12)',
              color: saveMsg.startsWith('Error') ? '#EF4444' : '#10B981',
              border: `1px solid ${saveMsg.startsWith('Error') ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}`,
            }}>
              {saveMsg}
            </span>
          )}
          {dirty && !saving && (
            <span style={{ fontSize: 11, color: 'var(--grey)', fontStyle: 'italic' }}>Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: dirty ? ACCENT : 'var(--bg-surface)',
              color: dirty ? '#000' : 'var(--grey-dark)',
              border: `1px solid ${dirty ? ACCENT : 'var(--divider)'}`,
              cursor: dirty ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <ErrorBanner error={fetchError} onRetry={fetchData} />

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
        background: 'rgba(212,168,67,.08)', border: '1px solid rgba(212,168,67,.25)',
        borderRadius: 10, marginBottom: 20, fontSize: 12, color: 'var(--grey-light)',
      }}>
        <span>
          Yahan se set karein <b style={{ color: ACCENT }}>kaun sa category card</b> home par
          <b style={{ color: ACCENT }}> kis number</b> par dikhega. #1 sabse pehle (left). Drag ya ↑↓ se order badlein.
        </span>
      </div>

      {available.length > 0 && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
          marginBottom: 20, padding: '14px 16px',
          background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--divider)',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey-light)' }}>Add Card:</span>
          <select className="form-input" value={addId} onChange={e => setAddId(e.target.value)} style={{ minWidth: 220, flex: 1 }}>
            <option value="">— Select category —</option>
            {available.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button type="button" className="btn-primary" onClick={handleAdd} disabled={!addId}>+ Add</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 64, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--divider)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--divider)' }}>
          <p style={{ color: 'var(--grey)', fontSize: 14 }}>Koi category card nahi — upar se add karein</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((cat, realIndex) => {
            const isDragOver = dragOver === realIndex;
            return (
              <div
                key={cat.id}
                draggable
                onDragStart={() => onDragStart(realIndex)}
                onDragOver={(e) => onDragOver(e, realIndex)}
                onDrop={() => onDrop(realIndex)}
                onDragEnd={onDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: isDragOver ? 'rgba(212,168,67,.08)' : 'var(--bg-card)',
                  border: `1px solid ${isDragOver ? 'rgba(212,168,67,.4)' : 'var(--divider)'}`,
                  borderRadius: 12, cursor: 'grab',
                  opacity: dragIndex.current === realIndex ? 0.4 : 1,
                }}
              >
                <div style={{ color: 'var(--grey-dark)', flexShrink: 0, cursor: 'grab' }}>⠿</div>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: realIndex === 0 ? 'rgba(212,168,67,.2)' : 'var(--bg-surface)',
                  border: `1px solid ${realIndex === 0 ? 'rgba(212,168,67,.5)' : 'var(--divider)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: realIndex === 0 ? ACCENT : 'var(--grey)',
                }}>
                  {realIndex + 1}
                </div>
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: `${cat.color}22`, border: `1px solid ${cat.color}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {cat.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13 }}>{cat.label}</div>
                  <div style={{ color: 'var(--grey-dark)', fontSize: 11, marginTop: 2 }}>{cat.sublabel}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button type="button" onClick={() => moveUp(realIndex)} disabled={realIndex === 0} style={arrowBtn}>▲</button>
                  <button type="button" onClick={() => moveDown(realIndex)} disabled={realIndex === items.length - 1} style={arrowBtn}>▼</button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(cat.id)}
                  style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: 'rgba(239,68,68,.1)', color: '#EF4444',
                    border: '1px solid rgba(239,68,68,.25)', cursor: 'pointer',
                  }}
                >
                  Hide
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const arrowBtn = {
  width: 26, height: 26, borderRadius: 6, border: '1px solid var(--divider)',
  background: 'var(--bg-surface)', color: 'var(--grey-light)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
};
