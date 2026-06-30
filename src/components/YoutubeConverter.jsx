import { useState, useEffect } from 'react';
import client from '../api/client';
import { formatApiError } from '../api/errors';

const YOUTUBE_RE = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch(\?v=|\?.*&v=)|embed\/|shorts\/|live\/)|youtu\.be\/)[\w-]{6,}/i;

async function parseBlobError(err, fallback) {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      return json?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return formatApiError(err, fallback);
}

export default function YoutubeConverter({ onConverted, onTitleSuggest, disabled }) {
  const [url, setUrl] = useState('');
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [cookiesSet, setCookiesSet] = useState(false);
  const [showCookies, setShowCookies] = useState(false);
  const [cookieUploading, setCookieUploading] = useState(false);
  const [cookieMsg, setCookieMsg] = useState('');

  useEffect(() => {
    client.get('/admin/youtube-cookies')
      .then(r => setCookiesSet(!!r.data?.configured))
      .catch(() => {});
  }, []);

  const validUrl = YOUTUBE_RE.test(url.trim());

  const handleConvert = async () => {
    const trimmed = url.trim();
    if (!trimmed || !YOUTUBE_RE.test(trimmed)) {
      setError('Valid YouTube link paste karein.');
      return;
    }

    setConverting(true);
    setError('');
    setStatus('YouTube se audio download ho rahi hai — thoda wait karein...');

    try {
      const res = await client.post('/admin/youtube-to-mp3', { url: trimmed }, {
        responseType: 'blob',
        timeout: 600000,
      });

      const titleHeader = res.headers['x-video-title'];
      let title = 'youtube_audio';
      if (titleHeader) {
        try {
          title = atob(titleHeader);
        } catch {
          title = 'youtube_audio';
        }
      }

      const blob = res.data;
      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error('MP3 file empty aa gayi. Dubara try karein.');
      }

      const safeName = (title.replace(/[^\w\s-]/g, '').trim().slice(0, 80) || 'youtube_audio') + '.mp3';
      const file = new File([blob], safeName, { type: 'audio/mpeg' });
      const previewUrl = URL.createObjectURL(blob);

      onConverted(file, previewUrl);
      if (onTitleSuggest && title && title !== 'youtube_audio') {
        onTitleSuggest(title);
      }

      setUrl('');
      setStatus(`MP3 ready — ${(blob.size / (1024 * 1024)).toFixed(2)} MB`);
    } catch (err) {
      console.error('[YoutubeConverter]', err);
      setStatus('');
      setError(await parseBlobError(err, 'YouTube se MP3 convert nahi hua.'));
    } finally {
      setConverting(false);
    }
  };

  const handleCookiesUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCookieUploading(true);
    setCookieMsg('');
    try {
      const fd = new FormData();
      fd.append('cookies_file', file);
      const res = await client.post('/admin/youtube-cookies', fd);
      setCookiesSet(true);
      setCookieMsg(res.data?.message || 'Cookies save ho gayi.');
      setShowCookies(false);
    } catch (err) {
      setCookieMsg(formatApiError(err, 'Cookies upload nahi hui.'));
    } finally {
      setCookieUploading(false);
      e.target.value = '';
    }
  };

  const handleCookiesRemove = async () => {
    if (!confirm('YouTube cookies hata deni hain?')) return;
    setCookieUploading(true);
    setCookieMsg('');
    try {
      await client.delete('/admin/youtube-cookies');
      setCookiesSet(false);
      setCookieMsg('Cookies hata di gayi.');
    } catch (err) {
      setCookieMsg(formatApiError(err, 'Cookies delete nahi hui.'));
    } finally {
      setCookieUploading(false);
    }
  };

  return (
    <div style={{
      marginTop: 12,
      padding: 14,
      borderRadius: 10,
      background: 'var(--bg-surface)',
      border: '1px solid var(--divider)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
        </svg>
        <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700 }}>
          YouTube se MP3
        </span>
        <span style={{ color: 'var(--grey)', fontSize: 11 }}>
          — link paste karein, server convert karega
        </span>
        {cookiesSet && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 10, fontWeight: 700, color: 'var(--emerald-light)',
            background: 'rgba(22,163,74,.1)', border: '1px solid rgba(22,163,74,.25)',
            padding: '2px 8px', borderRadius: 20,
          }}>
            Private OK
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          type="url"
          value={url}
          onChange={e => { setUrl(e.target.value); setError(''); setStatus(''); }}
          placeholder="https://youtube.com/watch?v=... ya youtu.be/..."
          disabled={disabled || converting}
          style={{ flex: '1 1 220px', minWidth: 0 }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConvert(); } }}
        />
        <button
          type="button"
          className="btn-save"
          onClick={handleConvert}
          disabled={disabled || converting || !validUrl}
          style={{ flex: '0 0 auto', padding: '10px 18px', opacity: (!validUrl && !converting) ? 0.5 : 1 }}
        >
          {converting ? 'Converting...' : 'MP3 Banayein'}
        </button>
      </div>

      <div style={{ marginTop: 10 }}>
        <button
          type="button"
          onClick={() => setShowCookies(s => !s)}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: 'var(--gold)', fontSize: 11, fontWeight: 600,
          }}
        >
          {showCookies ? '▲' : '▼'} Private / unlisted videos — cookies setup {cookiesSet ? '(set)' : ''}
        </button>
      </div>

      {showCookies && (
        <div style={{
          marginTop: 10, padding: 12, borderRadius: 8,
          background: 'var(--bg-card)', border: '1px solid var(--divider)',
        }}>
          <p style={{ color: 'var(--grey)', fontSize: 11, margin: '0 0 10px', lineHeight: 1.5 }}>
            1. Chrome mein YouTube par login karein (jis account ko video access hai)<br />
            2. Extension install karein: <strong>Get cookies.txt LOCALLY</strong><br />
            3. youtube.com par cookies export karein → <code style={{ color: 'var(--gold)' }}>cookies.txt</code> file<br />
            4. Neeche upload karein — ek baar kaafi hai (expire hone par dubara)
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{
              display: 'inline-block', padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: 'rgba(212,168,67,.12)', color: 'var(--gold)',
              border: '1px solid rgba(212,168,67,.35)', cursor: cookieUploading ? 'wait' : 'pointer',
            }}>
              {cookieUploading ? 'Uploading...' : cookiesSet ? 'Nayi cookies upload' : 'cookies.txt upload'}
              <input
                type="file"
                accept=".txt,text/plain"
                onChange={handleCookiesUpload}
                disabled={cookieUploading}
                style={{ display: 'none' }}
              />
            </label>
            {cookiesSet && (
              <button
                type="button"
                onClick={handleCookiesRemove}
                disabled={cookieUploading}
                style={{
                  padding: '8px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: 'transparent', color: '#f87171', border: '1px solid rgba(248,113,113,.3)',
                  cursor: 'pointer',
                }}
              >
                Cookies hataein
              </button>
            )}
          </div>
        </div>
      )}

      {cookieMsg && (
        <p style={{ color: 'var(--gold)', fontSize: 11, marginTop: 8, marginBottom: 0 }}>{cookieMsg}</p>
      )}
      {status && (
        <p style={{ color: 'var(--gold)', fontSize: 11, marginTop: 10, marginBottom: 0 }}>
          {status}
        </p>
      )}
      {error && (
        <p style={{ color: '#f87171', fontSize: 11, marginTop: 10, marginBottom: 0 }}>
          {error}
        </p>
      )}
    </div>
  );
}
