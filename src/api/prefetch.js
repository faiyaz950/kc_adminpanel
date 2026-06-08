import client from './client';
import { CACHE_TTL_MS, KEYS, writeBootstrap, ensureArray } from './listCache';

let inflight = null;

function readBootstrapMeta() {
  try {
    const raw = localStorage.getItem(KEYS.TRACKS_BOOTSTRAP);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function prefetchTracksBootstrap(force = false) {
  const meta = readBootstrapMeta();
  if (!force && Array.isArray(meta?.tracks) && Date.now() - (meta.ts || 0) < CACHE_TTL_MS) {
    return Promise.resolve({
      tracks: ensureArray(meta.tracks),
      reciters: ensureArray(meta.reciters),
    });
  }

  if (inflight) return inflight;

  inflight = client.get('/tracks/bootstrap')
    .then(res => {
      const tracks = ensureArray(res.data?.tracks);
      const reciters = ensureArray(res.data?.reciters);
      writeBootstrap(tracks, reciters);
      return { tracks, reciters };
    })
    .catch(() => (meta && Array.isArray(meta.tracks)
      ? { tracks: ensureArray(meta.tracks), reciters: ensureArray(meta.reciters) }
      : null))
    .finally(() => { inflight = null; });

  return inflight;
}
