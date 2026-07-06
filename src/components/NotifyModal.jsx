import { useState } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';
import NotifyResultBanner from './NotifyResultBanner';

const CAT_LABELS = {
  noha: 'Noha', dua: 'Dua', manqabat: 'Manqabat', marsiya: 'Marsiya',
  soz: 'Soz', salam: 'Salam', naat: 'Naat', ziyarat: 'Ziyarat',
  kids: 'Kids', tarana: 'Tarana', taqreer: 'Taqreer',
};

export default function NotifyModal({ track, trackType, onClose }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  if (!track) return null;

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await client.post('/admin/notifications/send-track', {
        track_id:   track.id,
        track_type: trackType,
        title:      track.title,
        reciter:    track.reciter_name || track.anjuman_name || track.maulana_name || track.nauhakhwan_name || '',
        image_url:  track.image_url || '',
      });
      setResult({
        success: true,
        sent: res.data.sent ?? 0,
        failed: res.data.failed ?? 0,
        failures: res.data.failures ?? [],
      });
    } catch (err) {
      setResult({ success: false, error: formatApiError(err, 'Notification send nahi hua.') });
    } finally {
      setSending(false);
    }
  };

  const subtitle = track.reciter_name || track.anjuman_name || track.maulana_name || track.nauhakhwan_name || '';
  const catLabel = CAT_LABELS[track.category] || track.category || trackType;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 16, padding: 28,
        width: '100%', maxWidth: 440, border: '1px solid var(--divider)',
        boxShadow: '0 24px 60px rgba(0,0,0,.5)',
      }}>
        <h3 style={{ color: 'var(--white)', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
          🔔 Push Notification Bhejein
        </h3>
        <p style={{ color: 'var(--grey)', fontSize: 13, marginBottom: 20 }}>
          Yeh notification <b style={{ color: 'var(--white)' }}>saare installed users</b> ko jayegi. Users notification tap karenge to yeh track play hoga.
        </p>

        <div style={{
          display: 'flex', gap: 12, alignItems: 'center',
          background: 'var(--bg-surface)', borderRadius: 12, padding: 14,
          border: '1px solid var(--divider)', marginBottom: 20,
        }}>
          {track.image_url && (
            <img src={track.image_url} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div>
            <div style={{ color: 'var(--white)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{track.title}</div>
            {subtitle && <div style={{ color: 'var(--grey)', fontSize: 12 }}>{subtitle}</div>}
            {catLabel && <div style={{ color: 'var(--grey-dark)', fontSize: 11, marginTop: 4 }}>{catLabel}</div>}
          </div>
        </div>

        <NotifyResultBanner result={result} />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button type="button" className="btn-cancel" onClick={onClose} disabled={sending}>
            {result?.success ? 'Bandh Karein' : 'Cancel'}
          </button>
          {!result?.success && (
            <button type="button" className="btn-primary" onClick={handleSend} disabled={sending} style={{ minWidth: 160 }}>
              {sending ? 'Bhej rahe hain...' : '🔔 Notification Bhejein'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
