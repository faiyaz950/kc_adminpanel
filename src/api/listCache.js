import client from './client';
import { formatApiError } from './errors';

export const CACHE_TTL_MS = 30 * 60 * 1000;

const LEGACY_KEYS = ['kc_admin_tracks_v3', 'kc_admin_tracks_v2', 'kc_admin_reciters_v0'];

export const ensureArray = (value) => (Array.isArray(value) ? value : []);

export function isCorruptItem(item) {
  return !item
    || typeof item !== 'object'
    || '__PHP_Incomplete_Class_Name' in item
    || (item.id == null && item.name == null && item.title == null);
}

export function sanitizeList(value) {
  return ensureArray(value).filter(item => !isCorruptItem(item));
}

export const KEYS = {
  TRACKS_BOOTSTRAP: 'kc_admin_tracks_v4',
  RECITERS: 'kc_admin_reciters_v2',
  ANJUMANS: 'kc_admin_anjumans_v1',
  MAULANAS: 'kc_admin_maulanas_v1',
  ULEMAS: 'kc_admin_ulemas_v1',
  USERS: 'kc_admin_users_v1',
  MESSAGES: 'kc_admin_messages_v1',
  POPUPS: 'kc_admin_popups_v1',
  SUMMARY: 'kc_admin_summary_v1',
};

function isCorruptBootstrap(parsed) {
  const tracks = parsed?.tracks;
  const reciters = parsed?.reciters;
  if (!Array.isArray(tracks) && !Array.isArray(reciters)) return true;
  if (sanitizeList(tracks).length !== ensureArray(tracks).length) return true;
  if (sanitizeList(reciters).length !== ensureArray(reciters).length) return true;
  return false;
}

function isCorruptEntry(key, parsed) {
  if (key === KEYS.TRACKS_BOOTSTRAP) return isCorruptBootstrap(parsed);
  const data = parsed?.data ?? parsed;
  if (!Array.isArray(data)) return false;
  return sanitizeList(data).length !== data.length;
}

export function purgeBadCache() {
  for (const legacy of LEGACY_KEYS) {
    try { localStorage.removeItem(legacy); } catch { /* ignore */ }
  }
  for (const key of Object.values(KEYS)) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (isCorruptEntry(key, parsed)) localStorage.removeItem(key);
    } catch {
      try { localStorage.removeItem(key); } catch { /* ignore */ }
    }
  }
}

export function readCache(key, maxAgeMs = CACHE_TTL_MS) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isCorruptEntry(key, parsed)) {
      localStorage.removeItem(key);
      return null;
    }
    if (parsed?.data == null || Date.now() - (parsed.ts || 0) > maxAgeMs) return null;
    return sanitizeList(parsed.data);
  } catch {
    return null;
  }
}

export function readStaleCache(key) {
  return readCache(key, Number.POSITIVE_INFINITY);
}

export function writeCache(key, data) {
  const list = sanitizeList(data);
  if (!list.length) return;
  try {
    localStorage.setItem(key, JSON.stringify({ data: list, ts: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

export function readBootstrapCache(maxAgeMs = CACHE_TTL_MS) {
  try {
    const raw = localStorage.getItem(KEYS.TRACKS_BOOTSTRAP);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (isCorruptBootstrap(parsed)) {
      localStorage.removeItem(KEYS.TRACKS_BOOTSTRAP);
      return null;
    }
    if (Date.now() - (parsed.ts || 0) > maxAgeMs) return null;
    return {
      tracks: sanitizeList(parsed.tracks),
      reciters: sanitizeList(parsed.reciters),
      ts: parsed.ts,
    };
  } catch {
    return null;
  }
}

export function readStaleBootstrapCache() {
  return readBootstrapCache(Number.POSITIVE_INFINITY);
}

export function readBootstrapReciters() {
  return readStaleBootstrapCache()?.reciters ?? null;
}

export function writeBootstrap(tracks, reciters) {
  const trackList = sanitizeList(tracks);
  const reciterList = sanitizeList(reciters);
  if (!trackList.length && !reciterList.length) return;

  try {
    localStorage.setItem(KEYS.TRACKS_BOOTSTRAP, JSON.stringify({
      tracks: trackList,
      reciters: reciterList,
      ts: Date.now(),
    }));
    if (reciterList.length) writeCache(KEYS.RECITERS, reciterList);
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

  if (stale?.length) {
    setData(stale);
    setLoading(false);
    if (fresh?.length && !force) {
      setError('');
      return;
    }
  } else {
    setLoading(true);
  }

  setError('');

  try {
    const res = await client.get(url);
    const list = sanitizeList(res.data);
    setData(list);
    writeCache(key, list);
    setError('');
  } catch (err) {
    if (stale?.length) {
      setData(stale);
      setError('Server busy — saved data dikha rahe hain. 5 minute baad refresh karein.');
    } else {
      setError(formatApiError(err, errorFallback));
    }
  } finally {
    setLoading(false);
  }
}
