import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';
import SearchInput from '../components/SearchInput';

const COUNTRY_STYLE = {
  India:    { color: '#22C55E', bg: 'rgba(34,197,94,.12)',  border: 'rgba(34,197,94,.3)'  },
  Pakistan: { color: '#3B82F6', bg: 'rgba(59,130,246,.12)', border: 'rgba(59,130,246,.3)' },
};

export default function HomeNauhakhwans({ embedded = false }) {
  const [items, setItems] = useState([]);
  const [allNoha, setAllNoha] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [dirty, setDirty] = useState(false);
  const [addId, setAddId] = useState('');
  const [search, setSearch] = useState('');
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setFetchError('');
    try {
      const [homeRes, nohaRes] = await Promise.all([
        client.get('/reciters/home'),
        client.get('/reciters', { params: { category: 'noha' } }),
      ]);
      setItems(Array.isArray(homeRes.data) ? homeRes.data : []);
      setAllNoha(Array.isArray(nohaRes.data) ? nohaRes.data : []);
      setDirty(false);
    } catch (err) {
      setFetchError(formatApiError(err, 'Home nauhakhwans load nahi hue.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const payload = items.map((r, i) => ({ id: r.id, order: i + 1 }));
      await client.post('/reciters/set-home', { items: payload });
      setSaveMsg('✓ Home screen save ho gaya!');
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
    setItems(prev => prev.filter(r => r.id !== id));
    setDirty(true);
  };

  const handleAdd = () => {
    if (!addId) return;
    const reciter = allNoha.find(r => String(r.id) === String(addId));
    if (!reciter || items.some(r => String(r.id) === String(addId))) return;
    setItems(prev => [...prev, reciter]);
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

  const homeIds = new Set(items.map(r => String(r.id)));
  const available = allNoha
    .filter(r => !homeIds.has(String(r.id)))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const q = search.toLowerCase();
  const filtered = search
    ? items.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.country?.toLowerCase().includes(q)
      )
    : items;

  return (
    <div className={embedded ? undefined : 'page-wrapper'}>
      <div className="page-header">
        <div>
          {!embedded && <h2 className="page-title">Home — Our Nauhakhwans</h2>}
          <p className="page-subtitle">
            {items.length} nauhakhwan{items.length !== 1 ? 's' : ''} · App home screen par is order mein dikhenge
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
            <span style={{ fontSize: 11, color: 'var(--grey)', fontStyle: 'italic' }}>
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: dirty ? 'var(--gold)' : 'var(--bg-surface)',
              color: dirty ? '#000' : 'var(--grey-dark)',
              border: `1px solid ${dirty ? 'var(--gold)' : 'var(--divider)'}`,
              cursor: dirty ? 'pointer' : 'not-allowed', transition: 'all .15s',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <ErrorBanner error={fetchError} onRetry={fetchData} />

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
        background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)',
        borderRadius: 10, marginBottom: 20, fontSize: 12, color: 'var(--grey-light)',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>
          Yahan se choose karein <b style={{ color: '#F87171' }}>kaun se nauhakhwans</b> home screen par dikhenge aur
          <b style={{ color: '#F87171' }}> kis number</b> par. #1 sabse pehle dikhega. Drag ya ↑↓ arrows se order badlein.
        </span>
      </div>

      {/* Add reciter */}
      <div style={{
        display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
        marginBottom: 20, padding: '14px 16px',
        background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--divider)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey-light)' }}>Add Nauhakhwan:</span>
        <select
          className="form-input"
          value={addId}
          onChange={e => setAddId(e.target.value)}
          style={{ minWidth: 220, maxWidth: 360, flex: 1 }}
        >
          <option value="">— Select reciter —</option>
          {available.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}{r.country ? ` (${r.country})` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-primary"
          onClick={handleAdd}
          disabled={!addId}
          style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}
        >
          + Add
        </button>
        {available.length === 0 && allNoha.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--grey-dark)' }}>Saare noha reciters already add hain</span>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Naam ya country..." width={220} />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--divider)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🎤</div>
          <p style={{ color: 'var(--grey)', fontSize: 14, marginBottom: 6 }}>
            {items.length === 0 ? 'Koi home nauhakhwan nahi' : 'Search mein kuch nahi mila'}
          </p>
          <p style={{ color: 'var(--grey-dark)', fontSize: 12 }}>
            Upar se nauhakhwan add karein — wo app ke home screen par dikhenge
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((reciter, i) => {
            const realIndex = items.findIndex(r => r.id === reciter.id);
            const cs = COUNTRY_STYLE[reciter.country] || COUNTRY_STYLE.India;
            const isDragOver = dragOver === realIndex;

            return (
              <div
                key={reciter.id}
                draggable
                onDragStart={() => onDragStart(realIndex)}
                onDragOver={(e) => onDragOver(e, realIndex)}
                onDrop={() => onDrop(realIndex)}
                onDragEnd={onDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: isDragOver ? 'rgba(239,68,68,.08)' : 'var(--bg-card)',
                  border: `1px solid ${isDragOver ? 'rgba(239,68,68,.4)' : 'var(--divider)'}`,
                  borderRadius: 12,
                  transition: 'border-color .1s, background .1s',
                  cursor: 'grab',
                  opacity: dragIndex.current === realIndex ? 0.4 : 1,
                }}
              >
                <div style={{ color: 'var(--grey-dark)', flexShrink: 0, cursor: 'grab', padding: '0 4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                  </svg>
                </div>

                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: realIndex === 0 ? 'rgba(239,68,68,.2)' : 'var(--bg-surface)',
                  border: `1px solid ${realIndex === 0 ? 'rgba(239,68,68,.5)' : 'var(--divider)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: realIndex === 0 ? '#F87171' : 'var(--grey)',
                }}>
                  {realIndex + 1}
                </div>

                {reciter.image_url ? (
                  <img src={reciter.image_url} alt="" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(239,68,68,.35)' }} />
                ) : (
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', background: 'rgba(239,68,68,.1)',
                    flexShrink: 0, border: '2px solid rgba(239,68,68,.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#EF4444', fontWeight: 800, fontSize: 16,
                  }}>
                    {reciter.name?.[0]}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {reciter.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    {reciter.country && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        color: cs.color, background: cs.bg, border: `1px solid ${cs.border}`,
                      }}>
                        {reciter.country}
                      </span>
                    )}
                    <span style={{ color: 'var(--grey-dark)', fontSize: 11 }}>
                      {reciter.tracks_count ?? reciter.total_tracks ?? 0} tracks
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => moveUp(realIndex)}
                    disabled={realIndex === 0}
                    title="Upar le jao"
                    style={{
                      width: 26, height: 26, borderRadius: 6, border: '1px solid var(--divider)',
                      background: 'var(--bg-surface)', color: realIndex === 0 ? 'var(--grey-dark)' : 'var(--grey-light)',
                      cursor: realIndex === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                    }}
                  >▲</button>
                  <button
                    type="button"
                    onClick={() => moveDown(realIndex)}
                    disabled={realIndex === items.length - 1}
                    title="Neeche le jao"
                    style={{
                      width: 26, height: 26, borderRadius: 6, border: '1px solid var(--divider)',
                      background: 'var(--bg-surface)',
                      color: realIndex === items.length - 1 ? 'var(--grey-dark)' : 'var(--grey-light)',
                      cursor: realIndex === items.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                    }}
                  >▼</button>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(reciter.id)}
                  title="Home se hatao"
                  style={{
                    padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    background: 'rgba(239,68,68,.1)', color: '#EF4444',
                    border: '1px solid rgba(239,68,68,.25)', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      {dirty && (
        <div style={{
          position: 'sticky', bottom: 20, marginTop: 20,
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={() => { fetchData(); setDirty(false); }}
            style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--bg-card)', color: 'var(--grey)', border: '1px solid var(--divider)', cursor: 'pointer' }}
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg,#EF4444,#DC2626)', color: '#fff',
              border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(239,68,68,.3)',
            }}
          >
            {saving ? 'Saving...' : '💾 Save Home Screen'}
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ height: 64, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--divider)', animation: 'pulse 1.5s ease-in-out infinite', opacity: 1 - i * 0.12 }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
