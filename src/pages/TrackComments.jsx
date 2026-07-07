import { useEffect, useMemo, useState } from 'react';
import client from '../api/client';

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function TrackComments() {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [openReplyId, setOpenReplyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/admin/track-comments', {
        params: search.trim() ? { search: search.trim() } : undefined,
      });
      setComments(Array.isArray(data) ? data : []);
      setDrafts(prev => {
        const next = { ...prev };
        for (const item of Array.isArray(data) ? data : []) {
          if (next[item.id] === undefined) next[item.id] = item.admin_reply || '';
        }
        return next;
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => ({
    total: comments.length,
    replied: comments.filter(c => (c.admin_reply || '').trim()).length,
    pending: comments.filter(c => !(c.admin_reply || '').trim()).length,
  }), [comments]);

  const onSaveReply = async (commentId) => {
    setSavingId(commentId);
    try {
      const { data } = await client.post(`/admin/track-comments/${commentId}/reply`, {
        admin_reply: drafts[commentId] ?? '',
      });
      setComments(prev => prev.map(item => item.id === commentId ? data.comment : item));
      setOpenReplyId(null);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'Reply save nahi ho saki.');
    } finally {
      setSavingId(null);
    }
  };

  const onDelete = async (commentId) => {
    if (!window.confirm('Is comment ko delete karna hai?')) return;
    setSavingId(commentId);
    try {
      await client.delete(`/admin/track-comments/${commentId}`);
      setComments(prev => prev.filter(item => item.id !== commentId));
      setDrafts(prev => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || 'Comment delete nahi ho saka.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="page-wrapper page-fade-in">
      <div className="page-header" style={heroHeader}>
        <div>
          <div style={eyebrow}>Community Moderation</div>
          <h2 className="page-title" style={{ marginTop: 6 }}>Track Comments</h2>
          <p className="page-subtitle" style={{ maxWidth: 560, marginTop: 8 }}>
            Admin yahan se user comments review, reply, aur delete kar sakta hai with full track context.
          </p>
        </div>
        <div style={searchPanel}>
          <input
            className="form-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Track ID, user, email, comment..."
          />
          <button className="btn-secondary" onClick={load}>Search</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 22 }}>
        <StatPill label="Total" value={stats.total} className="badge-gold" />
        <StatPill label="Replied" value={stats.replied} className="badge-emerald" />
        <StatPill label="Pending" value={stats.pending} className="badge-red" />
      </div>

      {loading ? (
        <div style={{ color: 'var(--grey)' }}>Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="card" style={{ padding: 20, color: 'var(--grey)' }}>Koi comment nahi mila.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {comments.map(comment => {
            const replied = (comment.admin_reply || '').trim().length > 0;
            const replyOpen = openReplyId === comment.id;
            return (
              <div key={comment.id} className="card" style={commentCard}>
                <div style={commentHeader}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                      <span style={userName}>{comment.user?.name || 'User'}</span>
                      <span className={`badge ${replied ? 'badge-emerald' : 'badge-red'}`}>
                        {replied ? 'Replied' : 'Pending'}
                      </span>
                      <span className="badge badge-gold">{comment.track_type || 'track'}</span>
                    </div>
                    <div style={trackTitle}>
                      {comment.track_title || comment.track_id}
                    </div>
                    <div style={metaGrid}>
                      <MetaBlock label="User email" value={comment.user?.email || 'No email'} />
                      <MetaBlock label="Commented at" value={formatDateTime(comment.created_at)} />
                      <MetaBlock label="Track ID" value={comment.track_id} />
                    </div>
                  </div>
                  <button
                    className="tbl-btn tbl-btn-delete"
                    onClick={() => onDelete(comment.id)}
                    disabled={savingId === comment.id}
                    style={{ minWidth: 88 }}
                  >
                    Delete
                  </button>
                </div>

                <SectionLabel>Comment</SectionLabel>
                <div style={commentBox}>
                  {comment.body}
                </div>

                {replied && (
                  <>
                    <SectionLabel>Admin Response</SectionLabel>
                    <div style={replyPreview}>
                      <div style={{ color: 'var(--emerald-light)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      {comment.admin_responder?.name || 'Admin'} replied · {formatDateTime(comment.admin_replied_at)}
                      </div>
                      <div style={{ color: 'var(--grey-light)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {comment.admin_reply}
                      </div>
                    </div>
                  </>
                )}

                {!replyOpen ? (
                  <button
                    className={replied ? 'btn-secondary' : 'btn-primary'}
                    onClick={() => setOpenReplyId(comment.id)}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    {replied ? 'Update Reply' : 'Reply'}
                  </button>
                ) : (
                  <div style={replyEditor}>
                    <label className="form-label" style={{ marginBottom: 8 }}>
                      {replied ? 'Update admin reply' : 'Admin reply'}
                    </label>
                    <textarea
                      className="form-input"
                      rows={4}
                      value={drafts[comment.id] ?? ''}
                      onChange={e => setDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                      placeholder="Yahan se admin user ko reply kar sakta hai..."
                      style={{ resize: 'vertical', minHeight: 110, background: 'rgba(255,255,255,0.02)' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => setOpenReplyId(null)}
                        disabled={savingId === comment.id}
                      >
                        Cancel
                      </button>
                      <button
                        className="btn-primary"
                        onClick={() => onSaveReply(comment.id)}
                        disabled={savingId === comment.id}
                      >
                        {savingId === comment.id ? 'Saving...' : replied ? 'Update Reply' : 'Send Reply'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, className }) {
  return (
    <div className={`badge ${className}`} style={{ padding: '8px 12px', gap: 8 }}>
      <strong style={{ color: 'var(--white)', fontSize: 14 }}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function MetaBlock({ label, value }) {
  return (
    <div style={metaBlock}>
      <div style={metaLabel}>{label}</div>
      <div style={metaValue}>{value}</div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={sectionLabel}>{children}</div>;
}

const heroHeader = {
  background: 'linear-gradient(135deg, rgba(22,163,74,.08), rgba(212,168,67,.06))',
  border: '1px solid rgba(255,255,255,.06)',
  borderRadius: 20,
  padding: '20px 22px',
  boxShadow: '0 18px 48px rgba(0,0,0,.22)',
};

const eyebrow = {
  color: 'var(--gold)',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
};

const searchPanel = {
  display: 'flex',
  gap: 10,
  flexWrap: 'wrap',
  width: 'min(100%, 420px)',
  alignSelf: 'stretch',
};

const commentCard = {
  padding: 20,
  background: 'linear-gradient(180deg, rgba(10,26,12,.98), rgba(7,18,9,.98))',
  border: '1px solid rgba(255,255,255,.06)',
  boxShadow: '0 18px 42px rgba(0,0,0,.24)',
};

const commentHeader = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 14,
  flexWrap: 'wrap',
  marginBottom: 16,
  alignItems: 'flex-start',
};

const userName = {
  color: 'var(--white)',
  fontWeight: 800,
  fontSize: 18,
  lineHeight: 1.1,
};

const trackTitle = {
  color: 'var(--white)',
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 10,
  letterSpacing: '-0.01em',
};

const metaGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
};

const metaBlock = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
  borderRadius: 12,
  padding: '10px 12px',
};

const metaLabel = {
  color: 'var(--grey)',
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 4,
};

const metaValue = {
  color: 'var(--grey-light)',
  fontSize: 12.5,
  wordBreak: 'break-word',
};

const sectionLabel = {
  color: 'var(--grey)',
  fontSize: 11,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 8,
};

const commentBox = {
  background: 'linear-gradient(180deg, rgba(14,32,17,.95), rgba(11,26,14,.95))',
  border: '1px solid var(--divider)',
  borderRadius: 14,
  padding: 15,
  color: 'var(--grey-light)',
  whiteSpace: 'pre-wrap',
  lineHeight: 1.7,
  marginBottom: 16,
};

const replyPreview = {
  background: 'linear-gradient(180deg, rgba(22,163,74,.09), rgba(22,163,74,.04))',
  border: '1px solid rgba(22,163,74,.18)',
  borderRadius: 14,
  padding: 14,
  marginBottom: 16,
};

const replyEditor = {
  marginTop: 4,
  padding: 14,
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,.06)',
  background: 'rgba(255,255,255,.02)',
};
