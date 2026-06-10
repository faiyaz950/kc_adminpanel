import { useState, useRef, useEffect } from 'react';

let _ffmpeg = null;
let _ffmpegReady = false;
let _loadPromise = null;

async function loadFFmpeg(onProgress) {
  if (_ffmpegReady) return _ffmpeg;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { toBlobURL } = await import('@ffmpeg/util');
    _ffmpeg = new FFmpeg();
    if (onProgress) {
      _ffmpeg.on('progress', ({ progress }) => onProgress(Math.round(progress * 100)));
    }
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await _ffmpeg.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    _ffmpegReady = true;
    return _ffmpeg;
  })();

  return _loadPromise;
}

function parseTimeToSeconds(val) {
  if (!val) return 0;
  const parts = val.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function AudioProcessor({ file, onProcessed }) {
  const [open, setOpen] = useState(false);
  const [compressOn, setCompressOn] = useState(false);
  const [bitrate, setBitrate] = useState('96');
  const [trimOn, setTrimOn] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [processing, setProcessing] = useState(false);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null); // { file, url, size }
  const [error, setError] = useState('');
  const resultUrlRef = useRef(null);

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  useEffect(() => {
    setResult(null);
    setError('');
    setOpen(false);
  }, [file]);

  if (!file) return null;

  const handleProcess = async () => {
    if (!compressOn && !trimOn) {
      setError('Koi option select karein — Compress ya Trim (ya dono).');
      return;
    }
    setError('');
    setProcessing(true);
    setProgress(0);

    try {
      setLoadingFFmpeg(true);
      const ff = await loadFFmpeg((p) => setProgress(p));
      setLoadingFFmpeg(false);

      const { fetchFile } = await import('@ffmpeg/util');

      const ext = file.name.split('.').pop().toLowerCase() || 'mp3';
      const inputName = `input.${ext}`;
      const outputName = 'output.mp3';

      await ff.writeFile(inputName, await fetchFile(file));

      const args = ['-i', inputName];

      if (trimOn) {
        const start = parseTimeToSeconds(startTime);
        const end = parseTimeToSeconds(endTime);
        if (trimOn && end > 0 && end <= start) {
          setError('End time, start time se zyada hona chahiye.');
          setProcessing(false);
          return;
        }
        if (start > 0) args.push('-ss', String(start));
        if (end > 0) args.push('-to', String(end));
      }

      if (compressOn) {
        args.push('-codec:a', 'libmp3lame', '-b:a', `${bitrate}k`);
      } else {
        args.push('-codec:a', 'libmp3lame', '-b:a', '128k');
      }

      args.push('-y', outputName);

      await ff.exec(args);

      const data = await ff.readFile(outputName);
      const blob = new Blob([data.buffer], { type: 'audio/mpeg' });
      const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '_processed.mp3'), { type: 'audio/mpeg' });

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;

      setResult({ file: processedFile, url, size: blob.size });

      await ff.deleteFile(inputName);
      await ff.deleteFile(outputName);
    } catch (err) {
      console.error('[AudioProcessor]', err);
      setError('Processing mein error aaya. File format check karein ya dobara try karein.');
    } finally {
      setProcessing(false);
      setLoadingFFmpeg(false);
    }
  };

  const handleUse = () => {
    if (result) onProcessed(result.file, result.url);
  };

  const sizeReduction = result
    ? Math.round((1 - result.size / file.size) * 100)
    : null;

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: open ? 'rgba(212,168,67,.12)' : 'var(--bg-surface)',
          color: open ? 'var(--gold)' : 'var(--grey)',
          border: `1px solid ${open ? 'rgba(212,168,67,.35)' : 'var(--divider)'}`,
          cursor: 'pointer', transition: 'all .15s',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <line x1="20" y1="4" x2="8.12" y2="15.88"/>
          <line x1="14.47" y1="14.48" x2="20" y2="20"/>
          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
        </svg>
        Audio Tools {open ? '▲' : '▼'}
        <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.7, marginLeft: 2 }}>
          (Compress / Trim)
        </span>
      </button>

      {open && (
        <div style={{
          marginTop: 10, padding: '16px 18px',
          background: 'var(--bg-card)', borderRadius: 12,
          border: '1px solid var(--divider)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 14 }}>
            File: <span style={{ color: 'var(--grey-light)' }}>{file.name}</span>
            {' · '}<span style={{ color: 'var(--grey-light)' }}>{formatBytes(file.size)}</span>
          </p>

          {/* Compress */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={compressOn}
              onChange={e => setCompressOn(e.target.checked)}
              style={{ accentColor: 'var(--gold)', width: 15, height: 15 }}
            />
            <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700 }}>Compress Audio</span>
            <span style={{ color: 'var(--grey)', fontSize: 11 }}>(file size kam karo)</span>
          </label>

          {compressOn && (
            <div style={{ marginLeft: 23, marginBottom: 14 }}>
              <label style={{ color: 'var(--grey)', fontSize: 11, display: 'block', marginBottom: 5 }}>Bitrate (quality)</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { val: '128', label: '128 kbps', hint: 'CD Quality' },
                  { val: '96', label: '96 kbps', hint: 'Balanced' },
                  { val: '64', label: '64 kbps', hint: 'Smaller' },
                  { val: '48', label: '48 kbps', hint: 'Podcast' },
                  { val: '32', label: '32 kbps', hint: 'Voice Only' },
                ].map(({ val, label, hint }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBitrate(val)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: bitrate === val ? 'rgba(212,168,67,.15)' : 'var(--bg-surface)',
                      color: bitrate === val ? 'var(--gold)' : 'var(--grey)',
                      border: `1px solid ${bitrate === val ? 'rgba(212,168,67,.4)' : 'var(--divider)'}`,
                      cursor: 'pointer',
                    }}
                    title={hint}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p style={{ color: 'var(--grey-dark)', fontSize: 10, marginTop: 6 }}>
                Current: {formatBytes(file.size)} → estimated: ~{formatBytes(file.size * ({ '128': 0.75, '96': 0.55, '64': 0.38, '48': 0.28, '32': 0.18 }[bitrate]))}
              </p>
            </div>
          )}

          {/* Trim */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={trimOn}
              onChange={e => setTrimOn(e.target.checked)}
              style={{ accentColor: 'var(--gold)', width: 15, height: 15 }}
            />
            <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700 }}>Trim Audio</span>
            <span style={{ color: 'var(--grey)', fontSize: 11 }}>(shuru/khatam set karo)</span>
          </label>

          {trimOn && (
            <div style={{ marginLeft: 23, marginBottom: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <label style={{ color: 'var(--grey)', fontSize: 11, display: 'block', marginBottom: 4 }}>Start Time</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  placeholder="0:00 ya 1:30:00"
                  className="form-input"
                  style={{ width: 130, padding: '6px 10px', fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ color: 'var(--grey)', fontSize: 11, display: 'block', marginBottom: 4 }}>End Time</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  placeholder="5:00 ya khaali"
                  className="form-input"
                  style={{ width: 130, padding: '6px 10px', fontSize: 12 }}
                />
              </div>
              <p style={{ color: 'var(--grey-dark)', fontSize: 10, width: '100%', marginTop: -6 }}>
                Format: MM:SS (e.g. 1:30) ya HH:MM:SS (e.g. 1:05:30). End khaali = file ka aakhir tak.
              </p>
            </div>
          )}

          {error && (
            <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 10, padding: '8px 12px', background: 'rgba(239,68,68,.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,.2)' }}>
              {error}
            </div>
          )}

          {processing ? (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid var(--gold)', borderTopColor: 'transparent',
                  animation: 'spin .7s linear infinite',
                }} />
                <span style={{ color: 'var(--grey-light)', fontSize: 12 }}>
                  {loadingFFmpeg ? 'FFmpeg load ho raha hai (pehli baar ~2-3 sec)...' : `Processing... ${progress}%`}
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gold)', borderRadius: 4, transition: 'width .3s' }} />
              </div>
            </div>
          ) : result ? (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#10B981', fontSize: 12, fontWeight: 700 }}>
                  ✓ Processing complete!
                </span>
                <span style={{ color: 'var(--grey)', fontSize: 11 }}>
                  {formatBytes(file.size)} → {formatBytes(result.size)}
                  {sizeReduction > 0 && (
                    <span style={{ color: '#10B981', marginLeft: 4 }}>({sizeReduction}% chota)</span>
                  )}
                  {sizeReduction <= 0 && (
                    <span style={{ color: '#F97316', marginLeft: 4 }}>(asal file se bada — 128k try karein)</span>
                  )}
                </span>
              </div>
              <audio controls src={result.url} style={{ width: '100%', height: 36, accentColor: 'var(--gold)', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handleUse}
                  style={{
                    padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                    background: 'rgba(16,185,129,.12)', color: '#10B981',
                    border: '1px solid rgba(16,185,129,.3)', cursor: 'pointer',
                  }}
                >
                  ✓ Yeh processed file use karein
                </button>
                <button
                  type="button"
                  onClick={handleProcess}
                  style={{
                    padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    background: 'var(--bg-surface)', color: 'var(--grey)',
                    border: '1px solid var(--divider)', cursor: 'pointer',
                  }}
                >
                  Dobara process karein
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleProcess}
              disabled={!compressOn && !trimOn}
              style={{
                marginTop: 4, padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: (compressOn || trimOn) ? 'rgba(212,168,67,.15)' : 'var(--bg-surface)',
                color: (compressOn || trimOn) ? 'var(--gold)' : 'var(--grey-dark)',
                border: `1px solid ${(compressOn || trimOn) ? 'rgba(212,168,67,.4)' : 'var(--divider)'}`,
                cursor: (compressOn || trimOn) ? 'pointer' : 'not-allowed', transition: 'all .15s',
              }}
            >
              Process Audio
            </button>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
