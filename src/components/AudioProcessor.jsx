import { useState, useRef, useEffect } from 'react';
import { Mp3Encoder } from '@breezystack/lamejs';

function parseTimeToSeconds(val) {
  if (!val || !val.trim()) return 0;
  const parts = val.trim().split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function float32ToInt16(float32) {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16;
}

const LAMEJS_SAMPLE_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];

function nearestSupportedRate(rate) {
  return LAMEJS_SAMPLE_RATES.reduce((a, b) => Math.abs(b - rate) < Math.abs(a - rate) ? b : a);
}

async function resampleBuffer(buf, targetRate) {
  if (buf.sampleRate === targetRate) return buf;
  const numSamples = Math.ceil(buf.duration * targetRate);
  const offlineCtx = new OfflineAudioContext(buf.numberOfChannels, numSamples, targetRate);
  const src = offlineCtx.createBufferSource();
  src.buffer = buf;
  src.connect(offlineCtx.destination);
  src.start(0);
  return offlineCtx.startRendering();
}

async function processAudioFile(file, { compress, bitrate, trim, startSec, endSec, onProgress }) {
  const arrayBuffer = await file.arrayBuffer();
  onProgress(8);

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let buf = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();
  onProgress(20);

  // Trim first (before resampling — fewer samples to resample)
  if (trim && (startSec > 0 || endSec > 0)) {
    const start = Math.max(0, startSec);
    const end = endSec > 0 ? Math.min(endSec, buf.duration) : buf.duration;
    if (end > start) {
      const sr = buf.sampleRate;
      const startSample = Math.floor(start * sr);
      const numSamples = Math.floor((end - start) * sr);
      const trimCtx = new OfflineAudioContext(buf.numberOfChannels, numSamples, sr);
      const trimmed = trimCtx.createBuffer(buf.numberOfChannels, numSamples, sr);
      for (let ch = 0; ch < buf.numberOfChannels; ch++) {
        trimmed.getChannelData(ch).set(buf.getChannelData(ch).subarray(startSample, startSample + numSamples));
      }
      buf = trimmed;
    }
  }
  onProgress(35);

  // Resample to a rate lamejs supports
  const targetRate = nearestSupportedRate(buf.sampleRate);
  buf = await resampleBuffer(buf, targetRate);
  onProgress(50);

  const numChannels = Math.min(buf.numberOfChannels, 2); // lamejs max 2ch
  const kbps = compress ? parseInt(bitrate, 10) : 128;
  const encoder = new Mp3Encoder(numChannels, buf.sampleRate, kbps);
  const blockSize = 1152;
  const mp3Chunks = [];

  const leftInt = float32ToInt16(buf.getChannelData(0));
  const rightInt = numChannels > 1 ? float32ToInt16(buf.getChannelData(1)) : null;

  const totalBlocks = Math.ceil(leftInt.length / blockSize);
  for (let b = 0; b < totalBlocks; b++) {
    const start = b * blockSize;
    const l = leftInt.subarray(start, start + blockSize);
    const chunk = rightInt
      ? encoder.encodeBuffer(l, rightInt.subarray(start, start + blockSize))
      : encoder.encodeBuffer(l);
    if (chunk.length > 0) mp3Chunks.push(new Uint8Array(chunk));
    // Yield to browser every 80 blocks to avoid freezing
    if (b % 80 === 0) {
      onProgress(50 + Math.floor((b / totalBlocks) * 46));
      await new Promise(r => setTimeout(r, 0));
    }
  }

  const tail = encoder.flush();
  if (tail.length > 0) mp3Chunks.push(new Uint8Array(tail));
  onProgress(99);

  return new Blob(mp3Chunks, { type: 'audio/mpeg' });
}

export default function AudioProcessor({ file, onProcessed }) {
  const [open, setOpen] = useState(false);
  const [compressOn, setCompressOn] = useState(false);
  const [bitrate, setBitrate] = useState('96');
  const [trimOn, setTrimOn] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const resultUrlRef = useRef(null);

  useEffect(() => () => { if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current); }, []);

  useEffect(() => {
    setResult(null);
    setError('');
    setOpen(false);
  }, [file]);

  if (!file) return null;

  const handleProcess = async () => {
    if (!compressOn && !trimOn) { setError('Compress ya Trim — koi ek option zaroori hai.'); return; }
    const startSec = parseTimeToSeconds(startTime);
    const endSec = parseTimeToSeconds(endTime);
    if (trimOn && endSec > 0 && endSec <= startSec) { setError('End time, Start time se zyada hona chahiye.'); return; }

    setError(''); setProcessing(true); setProgress(0);
    try {
      const blob = await processAudioFile(file, {
        compress: compressOn, bitrate,
        trim: trimOn, startSec, endSec,
        onProgress: setProgress,
      });

      const processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '_processed.mp3'), { type: 'audio/mpeg' });
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setProgress(100);
      setResult({ file: processedFile, url, size: blob.size });
    } catch (err) {
      console.error('[AudioProcessor]', err);
      setError(`Error: ${err.message || 'Audio process nahi hua.'}`);
    } finally {
      setProcessing(false);
    }
  };

  const sizeReduction = result ? Math.round((1 - result.size / file.size) * 100) : null;

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
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
          <line x1="20" y1="4" x2="8.12" y2="15.88"/>
          <line x1="14.47" y1="14.48" x2="20" y2="20"/>
          <line x1="8.12" y1="8.12" x2="12" y2="12"/>
        </svg>
        Audio Tools {open ? '▲' : '▼'}
        <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.65 }}>(Compress / Trim)</span>
      </button>

      {open && (
        <div style={{
          marginTop: 8, padding: '16px 18px',
          background: 'var(--bg-card)', borderRadius: 12,
          border: '1px solid var(--divider)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 14 }}>
            File: <span style={{ color: 'var(--grey-light)' }}>{file.name}</span>
            {' · '}<span style={{ color: 'var(--grey-light)' }}>{formatBytes(file.size)}</span>
          </p>

          {/* Compress */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={compressOn} onChange={e => setCompressOn(e.target.checked)}
              style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
            <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700 }}>Compress</span>
            <span style={{ color: 'var(--grey)', fontSize: 11 }}>— file size kam karo</span>
          </label>

          {compressOn && (
            <div style={{ marginLeft: 23, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {[
                  { val: '128', label: '128 kbps', hint: 'CD quality' },
                  { val: '96',  label: '96 kbps',  hint: 'Balanced' },
                  { val: '64',  label: '64 kbps',  hint: 'Smaller' },
                  { val: '48',  label: '48 kbps',  hint: 'Podcast' },
                  { val: '32',  label: '32 kbps',  hint: 'Voice only' },
                ].map(({ val, label, hint }) => (
                  <button key={val} type="button" onClick={() => setBitrate(val)} title={hint}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: bitrate === val ? 'rgba(212,168,67,.15)' : 'var(--bg-surface)',
                      color: bitrate === val ? 'var(--gold)' : 'var(--grey)',
                      border: `1px solid ${bitrate === val ? 'rgba(212,168,67,.4)' : 'var(--divider)'}`,
                      cursor: 'pointer',
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              <p style={{ color: 'var(--grey-dark)', fontSize: 10 }}>
                {formatBytes(file.size)} → ~{formatBytes(file.size * ({ '128': 0.75, '96': 0.55, '64': 0.38, '48': 0.28, '32': 0.18 }[bitrate]))}
              </p>
            </div>
          )}

          {/* Trim */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={trimOn} onChange={e => setTrimOn(e.target.checked)}
              style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
            <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700 }}>Trim</span>
            <span style={{ color: 'var(--grey)', fontSize: 11 }}>— shuru / khatam set karo</span>
          </label>

          {trimOn && (
            <div style={{ marginLeft: 23, marginBottom: 14, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <label style={{ color: 'var(--grey)', fontSize: 11, display: 'block', marginBottom: 4 }}>Start</label>
                <input type="text" value={startTime} onChange={e => setStartTime(e.target.value)}
                  placeholder="0:00" className="form-input"
                  style={{ width: 110, padding: '6px 10px', fontSize: 12 }} />
              </div>
              <div>
                <label style={{ color: 'var(--grey)', fontSize: 11, display: 'block', marginBottom: 4 }}>End</label>
                <input type="text" value={endTime} onChange={e => setEndTime(e.target.value)}
                  placeholder="20:00" className="form-input"
                  style={{ width: 110, padding: '6px 10px', fontSize: 12 }} />
              </div>
              <p style={{ color: 'var(--grey-dark)', fontSize: 10, width: '100%', marginTop: -4 }}>
                Format: MM:SS (e.g. 1:30) ya HH:MM:SS. End khaali = file aakhir tak.
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
                <div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid var(--gold)', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                <span style={{ color: 'var(--grey-light)', fontSize: 12 }}>Processing... {progress}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--divider)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: 'var(--gold)', borderRadius: 4, transition: 'width .2s' }} />
              </div>
            </div>
          ) : result ? (
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#10B981', fontSize: 12, fontWeight: 700 }}>✓ Done!</span>
                <span style={{ color: 'var(--grey)', fontSize: 11 }}>
                  {formatBytes(file.size)} → {formatBytes(result.size)}
                  {sizeReduction > 0
                    ? <span style={{ color: '#10B981', marginLeft: 4 }}>({sizeReduction}% chota)</span>
                    : <span style={{ color: '#F97316', marginLeft: 4 }}>(original se bada — 128k try karein)</span>
                  }
                </span>
              </div>
              <audio controls src={result.url} style={{ width: '100%', height: 36, accentColor: 'var(--gold)', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => onProcessed(result.file, result.url)}
                  style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,.12)', color: '#10B981', border: '1px solid rgba(16,185,129,.3)', cursor: 'pointer' }}>
                  ✓ Yeh file use karein
                </button>
                <button type="button" onClick={handleProcess}
                  style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--bg-surface)', color: 'var(--grey)', border: '1px solid var(--divider)', cursor: 'pointer' }}>
                  Dobara
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={handleProcess} disabled={!compressOn && !trimOn}
              style={{
                marginTop: 4, padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: (compressOn || trimOn) ? 'rgba(212,168,67,.15)' : 'var(--bg-surface)',
                color: (compressOn || trimOn) ? 'var(--gold)' : 'var(--grey-dark)',
                border: `1px solid ${(compressOn || trimOn) ? 'rgba(212,168,67,.4)' : 'var(--divider)'}`,
                cursor: (compressOn || trimOn) ? 'pointer' : 'not-allowed',
              }}>
              Process Audio
            </button>
          )}
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
