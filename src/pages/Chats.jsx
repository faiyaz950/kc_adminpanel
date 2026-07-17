import { useState, useEffect, useRef, useCallback } from 'react';
import client from '../api/client';

// ─── Live Chat — users se real-time conversation ─────────────────────────────
// Polling based: conversation list 5s, khuli thread 3s (incremental after_id).

const POLL_CONVOS_MS = 5000;
const POLL_THREAD_MS = 3000;

export default function Chats() {
  const [convos, setConvos] = useState([]);
  const [convosLoading, setConvosLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(null); // selected conversation's user
  const [messages, setMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const lastIdRef = useRef(0);
  const activeIdRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Conversations polling ──
  const loadConvos = useCallback(async () => {
    try {
      const r = await client.get('/admin/chats');
      setConvos(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setConvosLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConvos();
    const t = setInterval(loadConvos, POLL_CONVOS_MS);
    return () => clearInterval(t);
  }, [loadConvos]);

  // ── Thread polling ──
  const scrollToBottom = (smooth = true) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  const pollThread = useCallback(async () => {
    const userId = activeIdRef.current;
    if (!userId) return;
    try {
      const r = await client.get(`/admin/chats/${userId}/messages`, {
        params: lastIdRef.current > 0 ? { after_id: lastIdRef.current } : {},
      });
      const fresh = r.data?.messages || [];
      if (activeIdRef.current !== userId || fresh.length === 0) return;

      setMessages(prev => {
        const known = new Set(prev.map(m => m.id));
        const newOnes = fresh.filter(m => !known.has(m.id));
        if (newOnes.length === 0) return prev;
        return [...prev, ...newOnes];
      });
      const maxId = Math.max(...fresh.map(m => m.id));
      if (maxId > lastIdRef.current) lastIdRef.current = maxId;

      const el = scrollRef.current;
      const nearBottom = el && el.scrollHeight - el.scrollTop - el.clientHeight < 160;
      if (nearBottom) setTimeout(() => scrollToBottom(), 60);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(pollThread, POLL_THREAD_MS);
    return () => clearInterval(t);
  }, [active, pollThread]);

  const openConversation = async (c) => {
    setActive(c.user);
    activeIdRef.current = c.user.id;
    lastIdRef.current = 0;
    setMessages([]);
    setThreadLoading(true);
    // Local unread clear — server GET par read mark kar deta hai
    setConvos(prev => prev.map(x => x.user.id === c.user.id ? { ...x, unread: 0 } : x));
    try {
      const r = await client.get(`/admin/chats/${c.user.id}/messages`);
      if (activeIdRef.current !== c.user.id) return;
      const msgs = r.data?.messages || [];
      setMessages(msgs);
      lastIdRef.current = msgs.length ? Math.max(...msgs.map(m => m.id)) : 0;
      setTimeout(() => scrollToBottom(false), 40);
    } catch (e) {
      console.error(e);
    } finally {
      setThreadLoading(false);
    }
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const closeThread = () => {
    setActive(null);
    activeIdRef.current = null;
    lastIdRef.current = 0;
    setMessages([]);
  };

  const send = async () => {
    const text = draft.trim();
    const userId = activeIdRef.current;
    if (!text || !userId || sending) return;
    setSending(true);
    setDraft('');
    try {
      const r = await client.post(`/admin/chats/${userId}/messages`, { message: text });
      const msg = r.data?.data;
      if (msg && activeIdRef.current === userId) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.id > lastIdRef.current) lastIdRef.current = msg.id;
        setTimeout(() => scrollToBottom(), 40);
      }
      // Convo list preview turant update
      setConvos(prev => {
        const rest = prev.filter(x => x.user.id !== userId);
        const cur = prev.find(x => x.user.id === userId);
        return cur
          ? [{ ...cur, last_message: text, last_sender: 'admin', last_message_at: new Date().toISOString() }, ...rest]
          : prev;
      });
    } catch (e) {
      console.error(e);
      setDraft(text); // wapas rakh do taaki dubara try ho sake
      alert('Message send nahi hua — dubara try karein');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const filtered = convos.filter(c =>
    c.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = convos.reduce((s, c) => s + (c.unread || 0), 0);
  const showList = !isMobile || !active;
  const showThread = !isMobile || !!active;

  return (
    <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 0px)', paddingBottom: 16 }}>
      <div className="page-header" style={{ marginBottom: 14 }}>
        <div>
          <h2 className="page-title">Live Chat</h2>
          <p className="page-subtitle">
            {convos.length} conversations{totalUnread > 0 ? ` • ${totalUnread} unread` : ''}
          </p>
        </div>
      </div>

      <div style={shell}>
        {/* ── Conversation list ── */}
        {showList && (
          <div style={{ ...listPane, width: isMobile ? '100%' : 320 }}>
            <div style={{ padding: 12, borderBottom: '1px solid var(--divider)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <svg width="14" height="14" style={{ position: 'absolute', left: 12, color: 'var(--grey)', pointerEvents: 'none' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="User dhundhein..."
                  style={searchInput}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {convosLoading ? (
                <ListSkeleton />
              ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--grey)', fontSize: 13 }}>
                  {search ? 'Koi user nahi mila' : 'Abhi koi conversation nahi hai'}
                </div>
              ) : (
                filtered.map(c => (
                  <ConvoRow
                    key={c.user.id}
                    convo={c}
                    isActive={active?.id === c.user.id}
                    onClick={() => openConversation(c)}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Thread ── */}
        {showThread && (
          <div style={threadPane}>
            {!active ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--grey)' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(212,168,67,.18), rgba(212,168,67,.05))',
                  border: '1px solid rgba(212,168,67,.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold-light)" strokeWidth="1.8">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--grey-light)' }}>Conversation select karein</p>
                <p style={{ margin: 0, fontSize: 12 }}>User ke messages yahan dikhenge aur aap turant reply kar sakte hain</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div style={threadHeader}>
                  {isMobile && (
                    <button onClick={closeThread} style={backBtn} aria-label="Back">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
                    </button>
                  )}
                  <Avatar user={active} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {active.name || 'Unknown'}
                    </div>
                    <div style={{ color: 'var(--grey)', fontSize: 11.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {active.email}
                    </div>
                  </div>
                  <span style={idBadge}>#{active.id}</span>
                </div>

                {/* Messages */}
                <div ref={scrollRef} style={msgArea}>
                  {threadLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                      <div className="chat-spin" style={spinner} />
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: 'var(--grey)', fontSize: 13, padding: 40 }}>
                      Is user ke saath abhi koi message nahi hai
                    </div>
                  ) : (
                    <MessageList messages={messages} />
                  )}
                </div>

                {/* Composer */}
                <div style={composer}>
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Reply likhein… (Enter = send, Shift+Enter = new line)"
                    rows={1}
                    style={composerInput}
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim() || sending}
                    style={{
                      ...sendBtn,
                      opacity: draft.trim() && !sending ? 1 : 0.4,
                      cursor: draft.trim() && !sending ? 'pointer' : 'default',
                    }}
                    aria-label="Send"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1A1205" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        .chat-spin { animation: chatspin .7s linear infinite; }
        @keyframes chatspin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConvoRow({ convo, isActive, onClick }) {
  const preview = convo.last_sender === 'admin'
    ? `You: ${convo.last_message || ''}`
    : (convo.last_message || '');

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 11,
        padding: '12px 14px', cursor: 'pointer',
        background: isActive ? 'rgba(212,168,67,.08)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--gold)' : '2px solid transparent',
        borderBottom: '1px solid rgba(28,46,31,.5)',
        transition: 'background .15s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,.025)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar user={convo.user} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            color: 'var(--white)', fontWeight: convo.unread > 0 ? 700 : 600,
            fontSize: 13.5, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {convo.user?.name || 'Unknown'}
          </span>
          <span style={{ color: 'var(--grey)', fontSize: 10.5, whiteSpace: 'nowrap' }}>
            {timeAgo(convo.last_message_at)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{
            color: convo.unread > 0 ? 'var(--grey-light)' : 'var(--grey)',
            fontWeight: convo.unread > 0 ? 600 : 400,
            fontSize: 12, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {preview}
          </span>
          {convo.unread > 0 && (
            <span style={{
              background: 'linear-gradient(135deg, #F0C355, #D4A843)',
              color: '#1A1205', fontSize: 10, fontWeight: 800,
              borderRadius: 10, minWidth: 18, height: 18, padding: '0 5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {convo.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageList({ messages }) {
  const items = [];
  let lastDay = null;
  for (const m of messages) {
    const d = new Date(m.created_at);
    const day = d.toDateString();
    if (day !== lastDay) {
      items.push(<DateChip key={`d-${day}-${m.id}`} date={d} />);
      lastDay = day;
    }
    items.push(<Bubble key={m.id} msg={m} />);
  }
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{items}</div>;
}

function Bubble({ msg }) {
  const isAdmin = msg.sender === 'admin';
  return (
    <div style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '72%',
        padding: '9px 13px',
        borderRadius: isAdmin ? '16px 16px 5px 16px' : '16px 16px 16px 5px',
        background: isAdmin
          ? 'linear-gradient(135deg, #F0C355, #D4A843)'
          : 'var(--bg-surface)',
        border: isAdmin ? 'none' : '1px solid var(--divider)',
        boxShadow: isAdmin ? '0 4px 14px rgba(212,168,67,.18)' : '0 3px 10px rgba(0,0,0,.25)',
      }}>
        <p style={{
          margin: 0, fontSize: 13, lineHeight: 1.5,
          color: isAdmin ? '#1A1205' : 'var(--grey-light)',
          fontWeight: isAdmin ? 600 : 400,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.message}
        </p>
        <div style={{
          fontSize: 9.5, marginTop: 3, textAlign: 'right',
          color: isAdmin ? 'rgba(26,18,5,.55)' : 'var(--grey)',
          fontWeight: 600,
        }}>
          {formatTime(msg.created_at)}
        </div>
      </div>
    </div>
  );
}

function DateChip({ date }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
      <span style={{
        background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)',
        borderRadius: 12, padding: '3px 12px',
        color: 'var(--grey)', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.3,
      }}>
        {dayLabel(date)}
      </span>
    </div>
  );
}

function Avatar({ user, size }) {
  const initial = user?.name?.[0]?.toUpperCase() || '?';
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user?.name || 'User'}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          border: '1px solid rgba(212,168,67,.35)', flexShrink: 0,
        }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, rgba(22,163,74,.25), rgba(22,163,74,.08))',
      border: '1px solid rgba(22,163,74,.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--emerald-light)', fontWeight: 700, fontSize: size * 0.4,
    }}>
      {initial}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 11, padding: '12px 14px', opacity: 0.4 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--divider)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: '45%', height: 11, background: 'var(--divider)', borderRadius: 6, marginBottom: 7 }} />
            <div style={{ width: '75%', height: 9, background: 'var(--divider)', borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function dayLabel(d) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = (today - day) / 86400000;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const shell = {
  flex: 1, minHeight: 0,
  display: 'flex',
  background: 'var(--bg-card)',
  border: '1px solid var(--divider)',
  borderRadius: 16,
  overflow: 'hidden',
};
const listPane = {
  display: 'flex', flexDirection: 'column',
  borderRight: '1px solid var(--divider)',
  flexShrink: 0,
  minHeight: 0,
};
const threadPane = {
  flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0,
};
const searchInput = {
  background: 'var(--bg-surface)', border: '1px solid var(--divider)',
  borderRadius: 10, padding: '8px 12px 8px 34px', color: 'var(--white)',
  fontSize: 13, outline: 'none', width: '100%',
};
const threadHeader = {
  display: 'flex', alignItems: 'center', gap: 11,
  padding: '11px 16px',
  borderBottom: '1px solid var(--divider)',
  background: 'var(--bg-surface)',
  flexShrink: 0,
};
const backBtn = {
  background: 'none', border: 'none', color: 'var(--white)',
  padding: 6, cursor: 'pointer', display: 'flex', alignItems: 'center',
};
const idBadge = {
  background: 'rgba(212,168,67,.1)', border: '1px solid rgba(212,168,67,.25)',
  borderRadius: 6, padding: '2px 7px', color: 'var(--gold)', fontSize: 11, fontWeight: 700,
  flexShrink: 0,
};
const msgArea = {
  flex: 1, overflowY: 'auto', padding: '16px 18px',
  background: 'var(--bg-dark)',
  minHeight: 0,
};
const composer = {
  display: 'flex', alignItems: 'flex-end', gap: 10,
  padding: '12px 14px',
  borderTop: '1px solid var(--divider)',
  background: 'var(--bg-surface)',
  flexShrink: 0,
};
const composerInput = {
  flex: 1, resize: 'none',
  background: 'var(--bg-card)', border: '1px solid var(--divider)',
  borderRadius: 12, padding: '11px 14px',
  color: 'var(--white)', fontSize: 13, lineHeight: 1.5,
  outline: 'none', fontFamily: 'inherit',
  maxHeight: 120, minHeight: 42,
};
const sendBtn = {
  width: 42, height: 42, borderRadius: '50%', border: 'none', flexShrink: 0,
  background: 'linear-gradient(135deg, #F0C355, #D4A843)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 4px 14px rgba(212,168,67,.25)',
  transition: 'opacity .15s',
};
const spinner = {
  width: 26, height: 26, borderRadius: '50%',
  border: '3px solid var(--gold)', borderTopColor: 'transparent',
};
