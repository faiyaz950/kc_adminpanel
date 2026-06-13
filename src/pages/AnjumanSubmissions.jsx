import { useState, useEffect } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import ErrorBanner from '../components/ErrorBanner';
import SearchInput from '../components/SearchInput';

const STATUS_COLORS = {
  pending: { color: 'var(--gold)', bg: 'rgba(212,168,67,.12)', border: 'rgba(212,168,67,.3)' },
  approved: { color: 'var(--emerald-light)', bg: 'rgba(22,163,74,.12)', border: 'rgba(22,163,74,.3)' },
  rejected: { color: 'var(--red)', bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.3)' },
};

export default function AnjumanSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => { fetchSubmissions(); }, [statusFilter]);

  const fetchSubmissions = async (force = false) => {
    setLoading(true);
    setFetchError('');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = await client.get('/anjuman-submissions', { params });
      setSubmissions(res.data);
    } catch (err) {
      setFetchError(formatApiError(err, 'Submissions load nahi hue.'));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Is anjuman ko approve karke app mein add karein?')) return;
    setActionLoading(true);
    setActionError('');
    try {
      await client.post(`/anjuman-submissions/${id}/approve`);
      setSelected(null);
      fetchSubmissions(true);
    } catch (err) {
      setActionError(formatApiError(err, 'Approve nahi hua.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Is submission ko reject karein?')) return;
    setActionLoading(true);
    setActionError('');
    try {
      await client.post(`/anjuman-submissions/${id}/reject`);
      setSelected(null);
      fetchSubmissions(true);
    } catch (err) {
      setActionError(formatApiError(err, 'Reject nahi hua.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Submission delete ho jayegi. Sure?')) return;
    try {
      await client.delete(`/anjuman-submissions/${id}`);
      setSelected(null);
      fetchSubmissions(true);
    } catch (err) {
      alert(formatApiError(err, 'Delete nahi hua.'));
    }
  };

  const q = search.toLowerCase();
  const filtered = search
    ? submissions.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.state?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.contact_number?.includes(q)
      )
    : submissions;

  if (selected) {
    const s = selected;
    const st = STATUS_COLORS[s.status] || STATUS_COLORS.pending;
    return (
      <div className="page-wrapper">
        <div className="page-header">
          <div>
            <button className="btn-secondary" onClick={() => setSelected(null)} style={{ marginBottom: 12 }}>
              ← Back
            </button>
            <h2 className="page-title">{s.name}</h2>
            <p className="page-subtitle">{s.state} · {s.city} · {s.contact_number}</p>
          </div>
          <span style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            color: st.color, background: st.bg, border: `1px solid ${st.border}`,
            textTransform: 'capitalize',
          }}>
            {s.status}
          </span>
        </div>

        {actionError && <ErrorBanner error={actionError} onRetry={() => setActionError('')} />}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
          <div className="form-card">
            <h4 style={{ margin: '0 0 14px', color: 'var(--white)' }}>Details</h4>
            <DetailRow label="Naam" value={s.name} />
            <DetailRow label="State" value={s.state} />
            <DetailRow label="City" value={s.city} />
            <DetailRow label="Contact" value={s.contact_number} />
            <DetailRow label="Submitted" value={formatDate(s.created_at)} />
            {s.anjuman_id && <DetailRow label="Anjuman ID" value={`#${s.anjuman_id}`} />}
          </div>
          <div className="form-card" style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 14px', color: 'var(--white)' }}>Logo</h4>
            {s.image_url ? (
              <img src={s.image_url} alt="" style={{ width: 140, height: 140, borderRadius: 14, objectFit: 'cover', border: '1px solid var(--divider)' }} />
            ) : (
              <p style={{ color: 'var(--grey)' }}>No image</p>
            )}
          </div>
        </div>

        <div className="form-card" style={{ marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 16px', color: 'var(--white)' }}>
            Tracks ({s.tracks?.length || 0})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(s.tracks || []).map((t, i) => (
              <div key={t.id || i} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: 12,
                background: 'var(--bg-surface)', borderRadius: 12, border: '1px solid var(--divider)',
              }}>
                {t.image_url ? (
                  <img src={t.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--divider)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--grey)' }}>♪</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--white)', fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                  <div style={{ color: 'var(--grey)', fontSize: 12 }}>{t.duration || '—'}</div>
                </div>
                {t.audio_url && (
                  <audio controls src={t.audio_url} style={{ maxWidth: 220, height: 36 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {s.status === 'pending' && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn-primary" disabled={actionLoading} onClick={() => handleApprove(s.id)}>
              {actionLoading ? 'Processing...' : '✓ Approve & Add to Anjumans'}
            </button>
            <button className="btn-secondary" disabled={actionLoading} onClick={() => handleReject(s.id)} style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,.3)' }}>
              Reject
            </button>
            <button className="btn-secondary" onClick={() => handleDelete(s.id)} style={{ color: 'var(--grey)' }}>
              Delete
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Anjuman Submissions</h2>
          <p className="page-subtitle">{submissions.length} total · {filtered.length} shown</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <select
            className="form-input"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ width: 140, padding: '8px 12px' }}
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All</option>
          </select>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Naam, state, city..."
            width={200}
          />
        </div>
      </div>
      <ErrorBanner error={fetchError} onRetry={() => fetchSubmissions(true)} />

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--grey)' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--grey)' }}>
          <p>Koi submission nahi mili</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, padding: '0 24px 24px' }}>
          {filtered.map(s => {
            const st = STATUS_COLORS[s.status] || STATUS_COLORS.pending;
            return (
              <div
                key={s.id}
                className="form-card"
                style={{ cursor: 'pointer', transition: 'border-color .15s' }}
                onClick={() => { setSelected(s); setActionError(''); window.scrollTo(0, 0); }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  {s.image_url ? (
                    <img src={s.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 10, background: 'var(--divider)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{s.name}</div>
                    <div style={{ color: 'var(--grey)', fontSize: 12 }}>{s.state} · {s.city}</div>
                    <div style={{ color: 'var(--grey-dark)', fontSize: 11, marginTop: 4 }}>{s.contact_number}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <span style={{
                    padding: '4px 10px', borderRadius: 16, fontSize: 11, fontWeight: 700,
                    color: st.color, background: st.bg, border: `1px solid ${st.border}`,
                    textTransform: 'capitalize',
                  }}>
                    {s.status}
                  </span>
                  <span style={{ color: 'var(--grey)', fontSize: 11 }}>
                    {s.tracks?.length || 0} tracks · {formatDate(s.created_at)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--divider)' }}>
      <span style={{ color: 'var(--grey)', fontSize: 13 }}>{label}</span>
      <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 600 }}>{value || '—'}</span>
    </div>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
