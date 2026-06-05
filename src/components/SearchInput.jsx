export default function SearchInput({ value, onChange, placeholder = 'Search...', width = 240 }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <svg
        width="15" height="15"
        style={{ position: 'absolute', left: 12, color: 'var(--grey-dark)', pointerEvents: 'none' }}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--divider)',
          borderRadius: 10,
          padding: '9px 14px 9px 36px',
          color: 'var(--white)',
          fontSize: 13,
          width,
          outline: 'none',
          transition: 'border-color .15s',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--emerald)')}
        onBlur={e => (e.target.style.borderColor = 'var(--divider)')}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: 10,
            background: 'none', color: 'var(--grey-dark)',
            display: 'flex', padding: 2, cursor: 'pointer',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}
