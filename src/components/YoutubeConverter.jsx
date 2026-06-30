import { useState } from 'react';
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

  return (
    <div style={{
      marginTop: 12,
      padding: 14,
      borderRadius: 10,
      background: 'var(--bg-surface)',
      border: '1px solid var(--divider)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF0000">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
        </svg>
        <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700 }}>
          YouTube se MP3
        </span>
        <span style={{ color: 'var(--grey)', fontSize: 11 }}>
          — link paste karein, server convert karega
        </span>
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
