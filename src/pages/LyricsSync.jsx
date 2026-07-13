import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';

const GOLD = 'var(--gold)';

const SOURCE_TYPES = [
  { key: 'track',         label: 'Reciter Tracks', color: '#EF4444' },
  { key: 'anjuman_track', label: 'Anjuman Tracks', color: '#8B5CF6' },
  { key: 'old_nauh',      label: "Old's Nauhe",    color: '#D97706' },
];

const UPDATE_PATH = {
  track:         id => `/tracks/${id}`,
  anjuman_track: id => `/anjuman-tracks/${id}`,
  old_nauh:      id => `/old-nauhs/${id}`,
};

const STAMP_RE = /^\s*\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/;

/** "[mm:ss.cc] text" lines → [{time: seconds|null, text}] */
function parseLyrics(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const m = l.match(STAMP_RE);
      if (!m) return { time: null, text: l };
      const frac = m[3] || '0';
      const ms = parseInt(frac, 10) * (frac.length === 1 ? 100 : frac.length === 2 ? 10 : 1);
      return {
        time: parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + ms / 1000,
        text: m[4].trim(),
      };
    });
}

function toStamp(t) {
  const min = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  const cs = Math.round((t - Math.floor(t)) * 100);
  return `[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}]`;
}

function fmtTime(t) {
  if (t == null) return '—:——';
  const min = Math.floor(t / 60);
  const sec = (t % 60).toFixed(1).padStart(4, '0');
  return `${min}:${sec}`;
}

export default function LyricsSync() {
  const [sourceType, setSourceType] = useState('track');
  const [items, setItems] = useState([]);
  const [anjumans, setAnjumans] = useState([]);
  const [anjumanId, setAnjumanId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(null);
  const [lines, setLines] = useState([]);
  const [editingText, setEditingText] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const audioRef = useRef(null);

  // ── Source lists ──
  async function loadList(type) {
    setSelected(null);
    setItems([]);
    setError('');
    if (type === 'anjuman_track') {
      try {
        const r = await client.get('/anjumans');
        setAnjumans(Array.isArray(r.data) ? r.data : []);
      } catch (e) {
        setError(formatApiError(e));
      }
      return;
    }
    setLoading(true);
    try {
      const r = await client.get(type === 'track' ? '/tracks' : '/old-nauhs');
      setItems((Array.isArray(r.data) ? r.data : []).map(t => ({
        id: t.id,
        title: t.title,
        subtitle: type === 'track' ? (t.reciter_name || t.reciter?.name) : t.nauhakhwan_name,
        audio_url: t.audio_url,
        lyrics: t.lyrics || '',
      })));
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadAnjumanTracks(id, anjumanList = anjumans) {
    setLoading(true);
    setItems([]);
    const anjuman = anjumanList.find(a => String(a.id) === String(id));
    try {
      const r = await client.get(`/anjumans/${id}/tracks`);
      setItems((Array.isArray(r.data) ? r.data : []).map(t => ({
        id: t.id,
        title: t.title,
        subtitle: anjuman?.name,
        audio_url: t.audio_url,
        lyrics: t.lyrics || '',
      })));
    } catch (e) {
      setError(formatApiError(e));
    } finally {
      setLoading(false);
    }
  }

  // Fetch-on-mount: intentional one-shot load of the default source list.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadList('track'); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(t =>
      t.title?.toLowerCase().includes(q) || t.subtitle?.toLowerCase().includes(q));
  }, [items, search]);

  // ── Selection ──
  function openTrack(t) {
    setSelected(t);
    const parsed = parseLyrics(t.lyrics);
    setLines(parsed);
    setDraftText(parsed.map(l => l.text).join('\n'));
    setEditingText(parsed.length === 0);
    setActiveIdx(-1);
    setSaveMsg('');
  }

  // ── Live highlight while audio plays ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selected) return;
    const onTime = () => {
      const t = audio.currentTime;
      let idx = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].time != null && lines[i].time <= t) idx = i;
      }
      setActiveIdx(idx);
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [selected, lines]);

  // ── Stamping ──
  const nextUnstamped = lines.findIndex(l => l.time == null);

  const stampNext = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const idx = lines.findIndex(l => l.time == null);
    if (idx < 0) return;
    const t = audio.currentTime;
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, time: t } : l)));
  }, [lines]);

  // Enter key = stamp next line (fast tap-sync while listening)
  useEffect(() => {
    if (!selected || editingText) return;
    const onKey = (e) => {
      if (e.key === 'Enter' && !e.repeat && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        stampNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, editingText, stampNext]);

  function restampAt(i) {
    const audio = audioRef.current;
    if (!audio) return;
    const t = audio.currentTime;
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, time: t } : l)));
  }

  function nudge(i, delta) {
    setLines(prev => prev.map((l, idx) =>
      idx === i && l.time != null ? { ...l, time: Math.max(0, l.time + delta) } : l));
  }

  function clearStamp(i) {
    setLines(prev => prev.map((l, idx) => (idx === i ? { ...l, time: null } : l)));
  }

  function undoLast() {
    let last = -1;
    lines.forEach((l, i) => { if (l.time != null) last = i; });
    if (last >= 0) clearStamp(last);
  }

  function clearAll() {
    setLines(prev => prev.map(l => ({ ...l, time: null })));
  }

  function applyDraftText() {
    const newTexts = draftText.split('\n').map(l => l.trim()).filter(Boolean);
    // Keep stamps for lines whose text is unchanged at the same position
    setLines(newTexts.map((text, i) =>
      lines[i] && lines[i].text === text ? lines[i] : { time: null, text }));
    setEditingText(false);
  }

  function seekTo(t) {
    const audio = audioRef.current;
    if (audio && t != null) { audio.currentTime = Math.max(0, t - 0.2); audio.play(); }
  }

  // ── Validation + save ──
  const stampedCount = lines.filter(l => l.time != null).length;
  const orderProblemIdx = useMemo(() => {
    let prev = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].time == null) continue;
      if (lines[i].time < prev) return i;
      prev = lines[i].time;
    }
    return -1;
  }, [lines]);

  async function save({ plain = false } = {}) {
    if (!selected) return;
    setSaving(true); setSaveMsg('');
    try {
      const text = plain
        ? lines.map(l => l.text).join('\n')
        : lines.map(l => (l.time != null ? `${toStamp(l.time)} ${l.text}` : l.text)).join('\n');
      const fd = new FormData();
      fd.append('lyrics', text);
      await client.post(UPDATE_PATH[sourceType](selected.id), fd);
      setSaveMsg('✓ Lyrics save ho gayi!');
      setItems(prev => prev.map(t => (t.id === selected.id ? { ...t, lyrics: text } : t)));
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg(`Error: ${formatApiError(e, 'Save nahi hua.')}`);
    } finally {
      setSaving(false);
    }
  }

  const srcColor = SOURCE_TYPES.find(s => s.key === sourceType)?.color || GOLD;

  return (
    <div style={{ padding: '28px 24px', maxWidth: 980, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ width: 3, height: 36, borderRadius: 2, background: `linear-gradient(180deg,${srcColor},transparent)` }} />
        <div>
          <h1 style={{ margin: 0, color: 'var(--white)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.3px' }}>Lyrics Sync</h1>
          <p style={{ margin: '3px 0 0', color: 'var(--grey-dark)', fontSize: 12 }}>
            Audio ke sath lyrics time-sync karein — app mein line-by-line highlight hongi
          </p>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Source type tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {SOURCE_TYPES.map(s => (
          <button key={s.key} onClick={() => { setSourceType(s.key); setAnjumanId(''); setSearch(''); loadList(s.key); }}
            style={{
              padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: `1px solid ${sourceType === s.key ? s.color : 'var(--divider)'}`,
              background: sourceType === s.key ? `${s.color}18` : 'transparent',
              color: sourceType === s.key ? s.color : 'var(--grey)',
            }}>
            {s.label}
          </button>
        ))}
        {sourceType === 'anjuman_track' && (
          <select value={anjumanId}
            onChange={e => {
              setAnjumanId(e.target.value);
              if (e.target.value) loadAnjumanTracks(e.target.value);
            }}
            style={{ ...inputStyle, width: 'auto', minWidth: 220, padding: '7px 12px' }}>
            <option value="">-- Anjuman select karein --</option>
            {anjumans.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
      </div>

      {!selected ? (
        <>
          {/* Track picker */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Track search karein..."
            style={{ ...inputStyle, marginBottom: 12 }}
          />
          {loading ? (
            <p style={{ color: 'var(--grey)', fontSize: 13, padding: 20, textAlign: 'center' }}>Loading...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '60vh', overflowY: 'auto' }}>
              {filtered.map(t => {
                const synced = parseLyrics(t.lyrics).some(l => l.time != null);
                const hasLyrics = !!t.lyrics?.trim();
                return (
                  <div key={t.id} onClick={() => openTrack(t)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      background: 'var(--bg-card)', border: '1px solid var(--divider)',
                      borderRadius: 10, cursor: 'pointer',
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--white)', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                      {t.subtitle && <div style={{ color: 'var(--grey)', fontSize: 11, marginTop: 2 }}>{t.subtitle}</div>}
                    </div>
                    {synced ? (
                      <span style={badge('#10B981')}>Synced</span>
                    ) : hasLyrics ? (
                      <span style={badge(GOLD)}>Lyrics only</span>
                    ) : (
                      <span style={badge('var(--grey-dark)')}>No lyrics</span>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && !loading && (
                <p style={{ color: 'var(--grey-dark)', fontSize: 13, padding: 20, textAlign: 'center' }}>
                  {sourceType === 'anjuman_track' && !anjumanId ? 'Pehle anjuman select karein' : 'Koi track nahi mila'}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Editor header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <button onClick={() => setSelected(null)} style={{ ...smallBtn, padding: '8px 14px' }}>← Back</button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--white)', fontSize: 15, fontWeight: 700 }}>{selected.title}</div>
              {selected.subtitle && <div style={{ color: 'var(--grey)', fontSize: 11 }}>{selected.subtitle}</div>}
            </div>
            {saveMsg && (
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
                background: saveMsg.startsWith('Error') ? 'rgba(239,68,68,.12)' : 'rgba(16,185,129,.12)',
                color: saveMsg.startsWith('Error') ? '#EF4444' : '#10B981',
              }}>{saveMsg}</span>
            )}
          </div>

          {/* Audio player — sticky so it stays visible while stamping */}
          <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--bg-dark, #0a0a0a)', paddingBottom: 10 }}>
            <audio ref={audioRef} controls src={selected.audio_url} style={{ width: '100%', height: 40, accentColor: GOLD }} />
            {!editingText && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={stampNext} disabled={nextUnstamped < 0}
                  style={{
                    padding: '12px 26px', borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: nextUnstamped < 0 ? 'not-allowed' : 'pointer',
                    background: nextUnstamped < 0 ? 'var(--bg-surface)' : `linear-gradient(135deg, ${srcColor}, ${srcColor}CC)`,
                    color: nextUnstamped < 0 ? 'var(--grey-dark)' : '#fff', border: 'none',
                    boxShadow: nextUnstamped < 0 ? 'none' : `0 4px 16px ${srcColor}55`,
                  }}>
                  ⏱ Stamp Line {nextUnstamped >= 0 ? nextUnstamped + 1 : ''} <span style={{ opacity: .6, fontWeight: 600, fontSize: 11 }}>(Enter)</span>
                </button>
                <button onClick={undoLast} style={smallBtn}>↩ Undo</button>
                <button onClick={clearAll} style={smallBtn}>Clear All</button>
                <button onClick={() => { setDraftText(lines.map(l => l.text).join('\n')); setEditingText(true); }} style={smallBtn}>✎ Edit Text</button>
                <span style={{ color: 'var(--grey)', fontSize: 11, marginLeft: 'auto' }}>
                  {stampedCount}/{lines.length} stamped
                </span>
              </div>
            )}
          </div>

          {orderProblemIdx >= 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: 10, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#F87171', fontSize: 12 }}>
              Line {orderProblemIdx + 1} ka time pichli line se pehle hai — order theek karein warna app mein lines ulti dikhengi.
            </div>
          )}

          {editingText ? (
            <>
              <p style={{ color: 'var(--grey)', fontSize: 12, margin: '10px 0 8px' }}>
                Har line alag row par likhein. Text change karne par us line ka time reset ho jayega.
              </p>
              <textarea value={draftText} onChange={e => setDraftText(e.target.value)} rows={14}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7, fontFamily: 'inherit' }} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button onClick={applyDraftText} style={{ ...smallBtn, background: GOLD, color: '#000', fontWeight: 700 }}>Lines Ready Karein</button>
                <button onClick={() => setEditingText(false)} style={smallBtn}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              {/* Line list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 6 }}>
                {lines.map((l, i) => {
                  const isActive = i === activeIdx;
                  const isNext = i === nextUnstamped;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
                      background: isActive ? `${srcColor}20` : isNext ? 'rgba(212,168,67,.06)' : 'transparent',
                      border: `1px solid ${isActive ? srcColor : isNext ? 'rgba(212,168,67,.3)' : 'transparent'}`,
                    }}>
                      <button onClick={() => restampAt(i)} title="Abhi ke time par stamp karein"
                        style={{
                          ...smallBtn, minWidth: 74, fontVariantNumeric: 'tabular-nums',
                          color: l.time != null ? '#10B981' : 'var(--grey-dark)',
                        }}>
                        {fmtTime(l.time)}
                      </button>
                      <span onClick={() => l.time != null && seekTo(l.time)}
                        style={{
                          flex: 1, fontSize: 13.5, lineHeight: 1.5, cursor: l.time != null ? 'pointer' : 'default',
                          color: isActive ? '#fff' : l.time != null ? 'var(--grey-light)' : 'var(--grey)',
                          fontWeight: isActive ? 700 : 500,
                        }}>
                        {l.text}
                      </span>
                      {l.time != null && (
                        <span style={{ display: 'flex', gap: 3 }}>
                          <button onClick={() => nudge(i, -0.3)} style={nudgeBtn} title="-0.3s">−</button>
                          <button onClick={() => nudge(i, +0.3)} style={nudgeBtn} title="+0.3s">+</button>
                          <button onClick={() => clearStamp(i)} style={{ ...nudgeBtn, color: '#EF4444' }} title="Time hatayein">✕</button>
                        </span>
                      )}
                    </div>
                  );
                })}
                {lines.length === 0 && (
                  <p style={{ color: 'var(--grey-dark)', fontSize: 13, padding: 20, textAlign: 'center' }}>
                    Lyrics nahi hain — "Edit Text" se pehle lyrics likhein.
                  </p>
                )}
              </div>

              {/* Save bar */}
              {lines.length > 0 && (
                <div style={{ position: 'sticky', bottom: 12, display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18, flexWrap: 'wrap' }}>
                  {stampedCount > 0 && stampedCount < lines.length && (
                    <span style={{ color: 'var(--grey)', fontSize: 11, alignSelf: 'center' }}>
                      {lines.length - stampedCount} lines bina time ke — wo synced view mein nahi dikhengi
                    </span>
                  )}
                  <button onClick={() => save({ plain: true })} disabled={saving} style={smallBtn} title="Timestamps hata kar sirf plain lyrics save karein">
                    Remove Sync
                  </button>
                  <button onClick={() => save()} disabled={saving || orderProblemIdx >= 0}
                    style={{
                      padding: '11px 26px', borderRadius: 10, fontSize: 13, fontWeight: 800, border: 'none',
                      background: orderProblemIdx >= 0 ? 'var(--bg-surface)' : GOLD,
                      color: orderProblemIdx >= 0 ? 'var(--grey-dark)' : '#000',
                      cursor: saving || orderProblemIdx >= 0 ? 'not-allowed' : 'pointer',
                      boxShadow: orderProblemIdx >= 0 ? 'none' : '0 4px 16px rgba(212,168,67,.3)',
                    }}>
                    {saving ? 'Saving...' : '💾 Save Synced Lyrics'}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--divider)',
  background: 'var(--bg-surface)', color: 'var(--white)', fontSize: 13, boxSizing: 'border-box', outline: 'none',
};

const smallBtn = {
  padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  background: 'var(--bg-surface)', color: 'var(--grey-light)', border: '1px solid var(--divider)',
};

const nudgeBtn = {
  width: 26, height: 26, borderRadius: 6, fontSize: 12, cursor: 'pointer',
  background: 'var(--bg-surface)', color: 'var(--grey-light)', border: '1px solid var(--divider)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

const badge = (color) => ({
  fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 100, flexShrink: 0,
  color, background: `color-mix(in srgb, ${color} 12%, transparent)`,
  border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
});
