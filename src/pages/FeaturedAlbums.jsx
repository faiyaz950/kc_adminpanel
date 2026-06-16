import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';

const CAT_COLORS = {
  dua:      { color: '#06B6D4', bg: 'rgba(6,182,212,.12)',   border: 'rgba(6,182,212,.3)'   },
  noha:     { color: '#EF4444', bg: 'rgba(239,68,68,.12)',   border: 'rgba(239,68,68,.3)'   },
  manqabat: { color: '#8B5CF6', bg: 'rgba(139,92,246,.12)', border: 'rgba(139,92,246,.3)'  },
  marsiya:  { color: '#7F1D1D', bg: 'rgba(127,29,29,.12)',  border: 'rgba(127,29,29,.3)'  },
  soz_o_salam: { color: '#D97706', bg: 'rgba(217,119,6,.12)', border: 'rgba(217,119,6,.3)' },
  naat:     { color: '#F97316', bg: 'rgba(249,115,22,.12)',  border: 'rgba(249,115,22,.3)'  },
  ziyarat:  { color: '#10B981', bg: 'rgba(16,185,129,.12)',  border: 'rgba(16,185,129,.3)'  },
  kids:     { color: '#F59E0B', bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.3)'  },
  tarana:   { color: '#EC4899', bg: 'rgba(236,72,153,.12)',  border: 'rgba(236,72,153,.3)'  },
};
const CAT_LABELS = { naat: 'Masaib' };
const catLabel = c => c ? (CAT_LABELS[c] || (c.charAt(0).toUpperCase() + c.slice(1))) : '—';

export default function FeaturedAlbums({ embedded = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [dirty, setDirty] = useState(false);
  const dragIndex = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  useEffect(() => { fetchFeatured(); }, []);

  const fetchFeatured = async () => {
    setLoading(true); setFetchError('');
    try {
      const res = await client.get('/tracks/featured');
      setItems(res.data);
      setDirty(false);
    } catch (err) {
      setFetchError(formatApiError(err, 'Featured tracks load nahi hue.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const payload = items.map((t, i) => ({ id: t.id, order: i + 1 }));
      await client.post('/tracks/reorder-featured', { items: payload });
      setSaveMsg('✓ Order save ho gaya!');
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

  // ── Drag handlers ──
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

  return (
    <div className={embedded ? undefined : 'page-wrapper'}>
      {/* Header */}
      <div className="page-header">
        <div>
          {!embedded && <h2 className="page-title">Featured Albums</h2>}
          <p className="page-subtitle">
            {items.length} featured track{items.length !== 1 ? 's' : ''} · App mein is order mein dikhenge
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            {saving ? 'Saving...' : 'Save Order'}
          </button>
        </div>
      </div>

      <ErrorBanner error={fetchError} onRetry={fetchFeatured} />

      {/* Info banner */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px',
        background: 'rgba(212,168,67,.07)', border: '1px solid rgba(212,168,67,.2)',
        borderRadius: 10, marginBottom: 20, fontSize: 12, color: 'var(--grey-light)',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>
          <b style={{ color: 'var(--gold)' }}>Drag</b> karein ya <b style={{ color: 'var(--gold)' }}>↑ ↓ arrows</b> use karein order change karne ke liye.
          Jo 1st number par hai wo app mein sabse pehle dikhega. Tracks ko featured banana <b style={{ color: 'var(--gold)' }}>Tracks page</b> se karein.
        </span>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--divider)',
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⭐</div>
          <p style={{ color: 'var(--grey)', fontSize: 14, marginBottom: 6 }}>Koi featured track nahi</p>
          <p style={{ color: 'var(--grey-dark)', fontSize: 12 }}>
            Tracks page par jao aur kisi track ko <b>Featured: Yes</b> mark karo
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((track, i) => {
            const cm = CAT_COLORS[track.category] || { color: 'var(--grey)', bg: 'var(--bg-surface)', border: 'var(--divider)' };
            const isDragOver = dragOver === i;

            return (
              <div
                key={track.id}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDrop={() => onDrop(i)}
                onDragEnd={onDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: isDragOver ? 'rgba(212,168,67,.08)' : 'var(--bg-card)',
                  border: `1px solid ${isDragOver ? 'rgba(212,168,67,.4)' : 'var(--divider)'}`,
                  borderRadius: 12,
                  transition: 'border-color .1s, background .1s',
                  cursor: 'grab',
                  opacity: dragIndex.current === i ? 0.4 : 1,
                }}
              >
                {/* Drag handle */}
                <div style={{ color: 'var(--grey-dark)', flexShrink: 0, cursor: 'grab', padding: '0 4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                  </svg>
                </div>

                {/* Position badge */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: i === 0 ? 'rgba(212,168,67,.2)' : i === 1 ? 'rgba(156,163,175,.12)' : i === 2 ? 'rgba(180,120,60,.12)' : 'var(--bg-surface)',
                  border: `1px solid ${i === 0 ? 'rgba(212,168,67,.5)' : i === 1 ? 'rgba(156,163,175,.35)' : i === 2 ? 'rgba(180,120,60,.35)' : 'var(--divider)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: i === 0 ? 'var(--gold)' : i === 1 ? '#9CA3AF' : i === 2 ? '#B4783C' : 'var(--grey)',
                }}>
                  {i + 1}
                </div>

                {/* Cover */}
                {track.image_url ? (
                  <img src={track.image_url} alt="" style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--divider)' }} />
                ) : (
                  <div style={{ width: 42, height: 42, borderRadius: 8, background: cm.bg, flexShrink: 0, border: `1px solid ${cm.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={cm.color} strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                )}

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--grey)', fontSize: 11 }}>{track.reciter_name || '—'}</span>
                    <span style={{ background: cm.bg, color: cm.color, border: `1px solid ${cm.border}`, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
                      {catLabel(track.category)}
                    </span>
                    {track.year && (
                      <span style={{ color: 'var(--grey-dark)', fontSize: 10 }}>{track.year}</span>
                    )}
                  </div>
                </div>

                {/* Position label */}
                <div style={{ textAlign: 'right', flexShrink: 0, display: 'none' }} className="pos-label">
                  <div style={{ fontSize: 9, color: 'var(--grey-dark)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Position</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-light)' }}>#{i + 1}</div>
                </div>

                {/* Up/Down arrows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    title="Upar le jao"
                    style={{
                      width: 26, height: 26, borderRadius: 6, border: '1px solid var(--divider)',
                      background: 'var(--bg-surface)', color: i === 0 ? 'var(--grey-dark)' : 'var(--grey-light)',
                      cursor: i === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12,
                    }}
                  >▲</button>
                  <button
                    type="button"
                    onClick={() => moveDown(i)}
                    disabled={i === items.length - 1}
                    title="Neeche le jao"
                    style={{
                      width: 26, height: 26, borderRadius: 6, border: '1px solid var(--divider)',
                      background: 'var(--bg-surface)', color: i === items.length - 1 ? 'var(--grey-dark)' : 'var(--grey-light)',
                      cursor: i === items.length - 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12,
                    }}
                  >▼</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom save bar when dirty */}
      {dirty && (
        <div style={{
          position: 'sticky', bottom: 20, marginTop: 20,
          display: 'flex', justifyContent: 'flex-end', gap: 10,
        }}>
          <button
            onClick={() => { fetchFeatured(); setDirty(false); }}
            style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--bg-card)', color: 'var(--grey)', border: '1px solid var(--divider)', cursor: 'pointer' }}
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              background: 'var(--gold)', color: '#000', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(212,168,67,.3)',
            }}
          >
            {saving ? 'Saving...' : '💾 Save Order'}
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ height: 64, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--divider)', animation: 'pulse 1.5s ease-in-out infinite', opacity: 1 - i * 0.12 }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
    </div>
  );
}
