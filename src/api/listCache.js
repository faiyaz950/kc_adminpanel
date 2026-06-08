import client from './client';
import { formatApiError } from './errors';

export const CACHE_TTL_MS = 30 * 60 * 1000;

export const KEYS = {
  TRACKS_BOOTSTRAP: 'kc_admin_tracks_v3',
  RECITERS: 'kc_admin_reciters_v1',
  ANJUMANS: 'kc_admin_anjumans_v1',
  MAULANAS: 'kc_admin_maulanas_v1',
  ULEMAS: 'kc_admin_ulemas_v1',
  USERS: 'kc_admin_users_v1',
  MESSAGES: 'kc_admin_messages_v1',
  POPUPS: 'kc_admin_popups_v1',
  SUMMARY: 'kc_admin_summary_v1',
};

export function readCache(key, maxAgeMs = CACHE_TTL_MS) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.data == null || Date.now() - (parsed.ts || 0) > maxAgeMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function readStaleCache(key) {
  return readCache(key, Number.POSITIVE_INFINITY);
}

export function writeCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

export function readBootstrapReciters() {
  try {
    const raw = localStorage.getItem(KEYS.TRACKS_BOOTSTRAP);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.reciters ?? null;
  } catch {
    return null;
  }
}

export function writeBootstrap(tracks, reciters) {
  try {
    localStorage.setItem(KEYS.TRACKS_BOOTSTRAP, JSON.stringify({
      tracks,
      reciters,
      ts: Date.now(),
    }));
    if (reciters) writeCache(KEYS.RECITERS, reciters);
  } catch {
    // ignore
  }
}

export async function fetchList({
  key,
  url,
  force = false,
  setData,
  setLoading,
  setError,
  errorFallback = 'Data load nahi hua. 2 minute wait karein.',
}) {
  const fresh = !force ? readCache(key) : null;
  const stale = readStaleCache(key);

  if (stale) {
    setData(stale);
    setLoading(false);
    if (fresh && !force) {
      setError('');
      return;
    }
  } else {
    setLoading(true);
  }

  setError('');

  try {
    const res = await client.get(url);
    setData(res.data);
    writeCache(key, res.data);
    setError('');
  } catch (err) {
    if (stale) {
      setData(stale);
      setError('Server busy — saved data dikha rahe hain. 5 minute baad refresh karein.');
    } else {
      setError(formatApiError(err, errorFallback));
    }
  } finally {
    setLoading(false);
  }
}
