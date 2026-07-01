/**
 * StorageBadge — shows which storage provider a URL belongs to.
 * Usage: <StorageBadge url={track.image_url} />
 *        <StorageBadge url={track.audio_url} type="audio" />
 */

const PROVIDERS = [
  {
    key: 'cloudinary',
    match: (url) => url.includes('res.cloudinary.com') || url.includes('cloudinary.com'),
    label: 'Cloudinary',
    emoji: '☁️',
    bg: 'rgba(58,145,227,.13)',
    color: '#60a5fa',
    border: 'rgba(58,145,227,.35)',
  },
  {
    key: 'utho',
    match: (url) =>
      url.includes('utho.io') ||
      url.includes('utho.com') ||
      url.includes('ucdn.') ||
      url.includes('.utho.'),
    label: 'Utho',
    emoji: '🚀',
    bg: 'rgba(34,197,94,.12)',
    color: '#4ade80',
    border: 'rgba(34,197,94,.32)',
  },
  {
    key: 'hostinger',
    match: (url) =>
      url.includes('hostinger') ||
      url.includes('hstatic') ||
      url.includes('hst.'),
    label: 'Hostinger',
    emoji: '🟣',
    bg: 'rgba(168,85,247,.12)',
    color: '#c084fc',
    border: 'rgba(168,85,247,.32)',
  },
];

function detectProvider(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;
  return PROVIDERS.find((p) => p.match(url)) || {
    key: 'other',
    label: 'Other',
    emoji: '🔗',
    bg: 'rgba(255,255,255,.06)',
    color: 'var(--grey)',
    border: 'rgba(255,255,255,.12)',
  };
}

export default function StorageBadge({ url, style = {} }) {
  const provider = detectProvider(url);
  if (!provider) return null;

  return (
    <span
      title={url}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.3,
        background: provider.bg,
        color: provider.color,
        border: `1px solid ${provider.border}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span style={{ fontSize: 11 }}>{provider.emoji}</span>
      {provider.label}
    </span>
  );
}

/** Show badges for both image + audio in one row */
export function StorageBadges({ imageUrl, audioUrl, style = {} }) {
  const imgProvider  = detectProvider(imageUrl);
  const audProvider  = detectProvider(audioUrl);

  // Don't render anything if no URLs
  if (!imgProvider && !audProvider) return null;

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', ...style }}>
      {imgProvider && (
        <StorageBadge url={imageUrl} />
      )}
      {audProvider && audioUrl !== imageUrl && (
        <span
          title={audioUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 20,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.3,
            background: audProvider.bg,
            color: audProvider.color,
            border: `1px solid ${audProvider.border}`,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontSize: 10 }}>🎵</span>
          {audProvider.label}
        </span>
      )}
    </div>
  );
}
