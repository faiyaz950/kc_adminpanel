export default function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div style={{
      background: 'rgba(239,68,68,.08)',
      border: '1px solid rgba(239,68,68,.3)',
      borderRadius: 12,
      padding: '16px 20px',
      margin: '0 0 20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
    }}>
      <svg width="18" height="18" style={{ color: '#FCA5A5', flexShrink: 0, marginTop: 1 }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#FCA5A5', fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
          Data load nahi hua
        </div>
        <div style={{ color: 'rgba(252,165,165,.75)', fontSize: 12, lineHeight: 1.5, marginBottom: 10 }}>
          {error}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              background: 'rgba(239,68,68,.15)',
              border: '1px solid rgba(239,68,68,.35)',
              borderRadius: 8,
              color: '#FCA5A5',
              fontSize: 12,
              fontWeight: 700,
              padding: '6px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Dobara Try Karein
          </button>
        )}
      </div>
    </div>
  );
}
