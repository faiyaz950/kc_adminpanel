import client from './client';
import {
  readBootstrapCache,
  readStaleBootstrapCache,
  writeBootstrap,
  sanitizeList,
} from './listCache';

let inflight = null;

export function prefetchTracksBootstrap(force = false) {
  const cached = !force ? readBootstrapCache() : null;
  if (cached?.tracks?.length) {
    return Promise.resolve({ tracks: cached.tracks, reciters: cached.reciters });
  }

  if (inflight) return inflight;

  const stale = readStaleBootstrapCache();

  inflight = client.get('/tracks/bootstrap')
    .then(res => {
      const tracks = sanitizeList(res.data?.tracks);
      const reciters = sanitizeList(res.data?.reciters);
      writeBootstrap(tracks, reciters);
      return { tracks, reciters };
    })
    .catch(() => (stale?.tracks?.length
      ? { tracks: stale.tracks, reciters: stale.reciters }
      : null))
    .finally(() => { inflight = null; });

  return inflight;
}
