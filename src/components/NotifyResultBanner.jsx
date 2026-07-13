export default function NotifyResultBanner({ result }) {
  if (!result) return null;

  const isSuccess = result.success;
  const bg = isSuccess ? 'rgba(22,163,74,.12)' : 'rgba(239,68,68,.12)';
  const color = isSuccess ? 'var(--emerald-light)' : '#f87171';
  const border = isSuccess ? 'rgba(22,163,74,.3)' : 'rgba(239,68,68,.3)';

  let mainText = '';
  if (!isSuccess) {
    mainText = `❌ ${result.error}`;
  } else if (result.sent === 0) {
    mainText = '⚠️ Koi user registered nahi hai abhi — jab users naya app install karenge tab FCM token save hoga.';
  } else {
    mainText = `✅ ${result.sent} users ko notification gayi!${result.failed > 0 ? ` (${result.failed} failed)` : ''}`;
  }

  const failures = result.failures ?? [];

  return (
    <div style={{
      padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 13,
      background: bg, color, border: `1px solid ${border}`,
    }}>
      <div>{mainText}</div>
      {isSuccess && failures.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>
            Failed details:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
            {failures.map((f, i) => (
              <li key={i} style={{ marginBottom: 8, fontSize: 12, color: 'var(--white)' }}>
                <span style={{ color: '#f87171', fontWeight: 700 }}>{f.error_code}</span>
                {' — '}{f.reason}
                <div style={{ color: 'var(--grey-dark)', fontSize: 11, marginTop: 2 }}>
                  Token: {f.token_prefix} · HTTP {f.http_status}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
