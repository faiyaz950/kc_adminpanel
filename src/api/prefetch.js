import client from './client';
import { CACHE_TTL_MS, KEYS, writeBootstrap } from './listCache';

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
  if (!force && meta?.tracks && Date.now() - (meta.ts || 0) < CACHE_TTL_MS) {
    return Promise.resolve({ tracks: meta.tracks, reciters: meta.reciters });
  }

  if (inflight) return inflight;

  inflight = client.get('/tracks/bootstrap')
    .then(res => {
      writeBootstrap(res.data.tracks, res.data.reciters);
      return res.data;
    })
    .catch(() => meta ? { tracks: meta.tracks, reciters: meta.reciters } : null)
    .finally(() => { inflight = null; });

  return inflight;
}
