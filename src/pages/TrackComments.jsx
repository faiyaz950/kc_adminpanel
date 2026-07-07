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
      <div className="page-header">
        <div>
          <h2 className="page-title">Track Comments</h2>
          <p className="page-subtitle">Admin yahan se comments reply aur delete kar sakta hai.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', width: 'min(100%, 420px)' }}>
          <input
            className="form-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Track ID, user, email, comment..."
          />
          <button className="btn-secondary" onClick={load}>Search</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatPill label="Total" value={stats.total} className="badge-gold" />
        <StatPill label="Replied" value={stats.replied} className="badge-emerald" />
        <StatPill label="Pending" value={stats.pending} className="badge-red" />
      </div>

      {loading ? (
        <div style={{ color: 'var(--grey)' }}>Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="card" style={{ padding: 20, color: 'var(--grey)' }}>Koi comment nahi mila.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {comments.map(comment => {
            const replied = (comment.admin_reply || '').trim().length > 0;
            return (
              <div key={comment.id} className="card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: 'var(--white)', fontWeight: 700 }}>{comment.user?.name || 'User'}</span>
                      <span className={`badge ${replied ? 'badge-emerald' : 'badge-red'}`}>
                        {replied ? 'Replied' : 'Pending'}
                      </span>
                      <span className="badge badge-gold">{comment.track_id}</span>
                    </div>
                    <div style={{ color: 'var(--grey)', fontSize: 12 }}>
                      {comment.user?.email || 'No email'} · {formatDateTime(comment.created_at)}
                    </div>
                  </div>
                  <button
                    className="tbl-btn tbl-btn-delete"
                    onClick={() => onDelete(comment.id)}
                    disabled={savingId === comment.id}
                  >
                    Delete
                  </button>
                </div>

                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--divider)',
                  borderRadius: 12,
                  padding: 14,
                  color: 'var(--grey-light)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  marginBottom: 14,
                }}>
                  {comment.body}
                </div>

                {replied && (
                  <div style={{
                    background: 'rgba(22,163,74,.08)',
                    border: '1px solid rgba(22,163,74,.18)',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 14,
                  }}>
                    <div style={{ color: 'var(--emerald-light)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                      {comment.admin_responder?.name || 'Admin'} replied · {formatDateTime(comment.admin_replied_at)}
                    </div>
                    <div style={{ color: 'var(--grey-light)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {comment.admin_reply}
                    </div>
                  </div>
                )}

                <label className="form-label" style={{ marginBottom: 8 }}>
                  {replied ? 'Update admin reply' : 'Admin reply'}
                </label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={drafts[comment.id] ?? ''}
                  onChange={e => setDrafts(prev => ({ ...prev, [comment.id]: e.target.value }))}
                  placeholder="Yahan se admin user ko reply kar sakta hai..."
                  style={{ resize: 'vertical', minHeight: 110 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button
                    className="btn-primary"
                    onClick={() => onSaveReply(comment.id)}
                    disabled={savingId === comment.id}
                  >
                    {savingId === comment.id ? 'Saving...' : replied ? 'Update Reply' : 'Send Reply'}
                  </button>
                </div>
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
