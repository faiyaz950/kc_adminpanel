import { useState, useRef, useEffect, useCallback } from 'react';
import { Mp3Encoder } from '@breezystack/lamejs';

/* ─── Helpers ─────────────────────────────────────────────────── */

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
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

const LAMEJS_RATES = [8000, 11025, 12000, 16000, 22050, 24000, 32000, 44100, 48000];
const nearestRate = r => LAMEJS_RATES.reduce((a, b) => Math.abs(b - r) < Math.abs(a - r) ? b : a);

async function resampleBuffer(buf, targetRate) {
  if (buf.sampleRate === targetRate) return buf;
  const frames = Math.ceil(buf.duration * targetRate);
  const ctx = new OfflineAudioContext(buf.numberOfChannels, frames, targetRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  return ctx.startRendering();
}

async function processAudioFile(file, { compress, bitrate, trim, startSec, endSec, onProgress }) {
  const arrayBuffer = await file.arrayBuffer();
  onProgress(8);

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let buf = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();
  onProgress(20);

  if (trim && (startSec > 0 || endSec > 0)) {
    const start = Math.max(0, startSec);
    const end = endSec > 0 ? Math.min(endSec, buf.duration) : buf.duration;
    if (end > start) {
      const sr = buf.sampleRate;
      const s0 = Math.floor(start * sr);
      const n = Math.floor((end - start) * sr);
      const trimCtx = new OfflineAudioContext(buf.numberOfChannels, n, sr);
      const trimmed = trimCtx.createBuffer(buf.numberOfChannels, n, sr);
      for (let ch = 0; ch < buf.numberOfChannels; ch++)
        trimmed.getChannelData(ch).set(buf.getChannelData(ch).subarray(s0, s0 + n));
      buf = trimmed;
    }
  }
  onProgress(35);

  buf = await resampleBuffer(buf, nearestRate(buf.sampleRate));
  onProgress(50);

  const numCh = Math.min(buf.numberOfChannels, 2);
  const kbps = compress ? parseInt(bitrate, 10) : 320;
  const encoder = new Mp3Encoder(numCh, buf.sampleRate, kbps);
  const blockSize = 1152;
  const chunks = [];
  const leftInt = float32ToInt16(buf.getChannelData(0));
  const rightInt = numCh > 1 ? float32ToInt16(buf.getChannelData(1)) : null;
  const totalBlocks = Math.ceil(leftInt.length / blockSize);

  for (let b = 0; b < totalBlocks; b++) {
    const s = b * blockSize;
    const l = leftInt.subarray(s, s + blockSize);
    const chunk = rightInt
      ? encoder.encodeBuffer(l, rightInt.subarray(s, s + blockSize))
      : encoder.encodeBuffer(l);
    if (chunk.length > 0) chunks.push(new Uint8Array(chunk));
    if (b % 80 === 0) {
      onProgress(50 + Math.floor((b / totalBlocks) * 46));
      await new Promise(r => setTimeout(r, 0));
    }
  }
  const tail = encoder.flush();
  if (tail.length > 0) chunks.push(new Uint8Array(tail));
  onProgress(99);
  return new Blob(chunks, { type: 'audio/mpeg' });
}

/* ─── Waveform + drag-trim component ──────────────────────────── */

function drawWaveform(canvas, audioBuf, startR, endR) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const data = audioBuf.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / W));

  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#0e1117';
  ctx.fillRect(0, 0, W, H);

  // Center line
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();

  const startX = Math.round(startR * W);
  const endX = Math.round(endR * W);

  for (let x = 0; x < W; x++) {
    let min = 0, max = 0;
    for (let j = 0; j < step; j++) {
      const v = data[x * step + j] || 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const inSelection = x >= startX && x <= endX;
    ctx.strokeStyle = inSelection ? 'rgba(212,168,67,0.85)' : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, ((1 - max) / 2) * H);
    ctx.lineTo(x + 0.5, ((1 - min) / 2) * H);
    ctx.stroke();
  }

  // Darken outside selection
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, startX, H);
  ctx.fillRect(endX, 0, W - endX, H);
}

function WaveformTrimmer({ audioBuf, duration, startR, endR, onChange }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const dragging = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [playheadR, setPlayheadR] = useState(null);
  const playCtxRef = useRef(null);
  const srcRef = useRef(null);
  const rafRef = useRef(null);
  const playStartCtxTime = useRef(0);
  const playStartSec = useRef(0);

  const stopPlayback = useCallback(() => {
    if (srcRef.current) { try { srcRef.current.stop(); } catch {} srcRef.current = null; }
    if (playCtxRef.current) { playCtxRef.current.close(); playCtxRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setPlaying(false);
    setPlayheadR(null);
  }, []);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  // Stop playback when handles move
  useEffect(() => { if (playing) stopPlayback(); }, [startR, endR]); // eslint-disable-line

  const startPlayback = useCallback(() => {
    if (!audioBuf) return;
    stopPlayback();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(ctx.destination);
    const startSec = startR * duration;
    const endSec = endR * duration;
    src.start(0, startSec, endSec - startSec);
    src.onended = stopPlayback;
    playCtxRef.current = ctx;
    srcRef.current = src;
    playStartCtxTime.current = ctx.currentTime;
    playStartSec.current = startSec;
    setPlaying(true);

    const tick = () => {
      if (!playCtxRef.current) return;
      const elapsed = playCtxRef.current.currentTime - playStartCtxTime.current;
      const r = (playStartSec.current + elapsed) / duration;
      setPlayheadR(Math.min(r, endR));
      if (r < endR) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [audioBuf, duration, startR, endR, stopPlayback]);

  useEffect(() => {
    if (!canvasRef.current || !audioBuf) return;
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth * window.devicePixelRatio || 800;
    canvas.height = 80 * window.devicePixelRatio || 80;
    drawWaveform(canvas, audioBuf, startR, endR);
  }, [audioBuf, startR, endR]);

  const getR = useCallback((clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const onMouseDown = useCallback((handle) => (e) => {
    e.preventDefault();
    dragging.current = handle;
    const onMove = (e) => {
      const r = getR(e.clientX);
      if (dragging.current === 'left')
        onChange({ startR: Math.min(r, endR - 0.005), endR });
      else
        onChange({ startR, endR: Math.max(r, startR + 0.005) });
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [startR, endR, onChange, getR]);

  const onTouchStart = useCallback((handle) => (e) => {
    e.preventDefault();
    dragging.current = handle;
    const onMove = (e) => {
      const r = getR(e.touches[0].clientX);
      if (dragging.current === 'left')
        onChange({ startR: Math.min(r, endR - 0.005), endR });
      else
        onChange({ startR, endR: Math.max(r, startR + 0.005) });
    };
    const onUp = () => {
      dragging.current = null;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  }, [startR, endR, onChange, getR]);

  const handle = (side) => ({
    onMouseDown: onMouseDown(side),
    onTouchStart: onTouchStart(side),
  });

  const selDuration = (endR - startR) * duration;

  return (
    <div style={{ marginTop: 6 }}>
      {/* Waveform */}
      <div
        ref={containerRef}
        style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', userSelect: 'none', border: '1px solid var(--divider)' }}
      >
        <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 80 }} />

        {/* Selected region borders */}
        <div style={{
          position: 'absolute', top: 0,
          left: `${startR * 100}%`, width: `${(endR - startR) * 100}%`, height: '100%',
          borderLeft: '2px solid var(--gold)', borderRight: '2px solid var(--gold)',
          pointerEvents: 'none',
        }} />

        {/* Playhead */}
        {playheadR !== null && (
          <div style={{
            position: 'absolute', top: 0, left: `${playheadR * 100}%`,
            width: 2, height: '100%', background: '#fff',
            transform: 'translateX(-1px)', pointerEvents: 'none',
            boxShadow: '0 0 6px rgba(255,255,255,0.6)',
          }} />
        )}

        {/* Left handle */}
        <div {...handle('left')} style={{
          position: 'absolute', top: 0, left: `${startR * 100}%`,
          width: 22, height: '100%', cursor: 'ew-resize',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }}>
          <div style={{
            width: 14, height: 36, background: 'var(--gold)', borderRadius: 4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: '#000' }} />)}
          </div>
        </div>

        {/* Right handle */}
        <div {...handle('right')} style={{
          position: 'absolute', top: 0, left: `${endR * 100}%`,
          width: 22, height: '100%', cursor: 'ew-resize',
          transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }}>
          <div style={{
            width: 14, height: 36, background: 'var(--gold)', borderRadius: 4,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 2, height: 2, borderRadius: '50%', background: '#000' }} />)}
          </div>
        </div>
      </div>

      {/* Time labels + play button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Play/Stop button */}
          <button
            type="button"
            onClick={playing ? stopPlayback : startPlayback}
            title={playing ? 'Rokein' : 'Selected hissa sunein'}
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: playing ? 'rgba(239,68,68,.15)' : 'rgba(212,168,67,.15)',
              color: playing ? '#EF4444' : 'var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: playing ? '0 0 0 1px rgba(239,68,68,.3)' : '0 0 0 1px rgba(212,168,67,.3)',
              transition: 'all .15s',
            }}
          >
            {playing
              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="4" width="4" height="16" rx="1"/><rect x="15" y="4" width="4" height="16" rx="1"/></svg>
              : <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>
            }
          </button>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--grey-dark)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Start</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(startR * duration)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: 'var(--grey-dark)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>End</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(endR * duration)}</div>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: 'var(--grey-dark)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Selected</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--grey-light)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(selDuration)}</div>
        </div>
      </div>

      <p style={{ fontSize: 10, color: 'var(--grey-dark)', marginTop: 6 }}>
        Gold handles pakad kar khenchein — ya sidha number click karein aur type karein
      </p>

      {/* Editable time inputs */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: 'var(--grey)', display: 'block', marginBottom: 3 }}>Start (MM:SS)</label>
          <input
            type="text"
            className="form-input"
            defaultValue={formatTime(startR * duration)}
            key={`s-${Math.round(startR * 100)}`}
            placeholder="0:00"
            onBlur={e => {
              const sec = parseManualTime(e.target.value, duration);
              if (sec !== null) onChange({ startR: Math.min(sec / duration, endR - 0.005), endR });
            }}
            style={{ padding: '5px 8px', fontSize: 12 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 10, color: 'var(--grey)', display: 'block', marginBottom: 3 }}>End (MM:SS)</label>
          <input
            type="text"
            className="form-input"
            defaultValue={formatTime(endR * duration)}
            key={`e-${Math.round(endR * 100)}`}
            placeholder={formatTime(duration)}
            onBlur={e => {
              const sec = parseManualTime(e.target.value, duration);
              if (sec !== null) onChange({ startR, endR: Math.max(sec / duration, startR + 0.005) });
            }}
            style={{ padding: '5px 8px', fontSize: 12 }}
          />
        </div>
      </div>
    </div>
  );
}

function parseManualTime(val, duration) {
  if (!val || !val.trim()) return null;
  const parts = val.trim().split(':').map(Number);
  if (parts.some(isNaN)) return null;
  let sec = 0;
  if (parts.length === 3) sec = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) sec = parts[0] * 60 + parts[1];
  else sec = parts[0];
  return Math.max(0, Math.min(sec, duration));
}

/* ─── Main AudioProcessor ─────────────────────────────────────── */

export default function AudioProcessor({ file, onProcessed }) {
  const [open, setOpen] = useState(false);
  const [compressOn, setCompressOn] = useState(false);
  const [bitrate, setBitrate] = useState('128');
  const [trimOn, setTrimOn] = useState(false);
  const [startR, setStartR] = useState(0);
  const [endR, setEndR] = useState(1);
  const [audioBuf, setAudioBuf] = useState(null);
  const [duration, setDuration] = useState(0);
  const [loadingWave, setLoadingWave] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [used, setUsed] = useState(false);
  const [error, setError] = useState('');
  const resultUrlRef = useRef(null);

  useEffect(() => () => { if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current); }, []);

  useEffect(() => {
    setResult(null); setError(''); setOpen(false); setUsed(false);
    setAudioBuf(null); setStartR(0); setEndR(1);
  }, [file]);

  // Decode audio for waveform when trim is turned on
  useEffect(() => {
    if (!trimOn || !file || audioBuf) return;
    setLoadingWave(true);
    file.arrayBuffer().then(ab => {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      return ctx.decodeAudioData(ab).then(buf => { ctx.close(); return buf; });
    }).then(buf => {
      setAudioBuf(buf);
      setDuration(buf.duration);
      setStartR(0);
      setEndR(1);
    }).catch(() => {}).finally(() => setLoadingWave(false));
  }, [trimOn, file, audioBuf]);

  const handleChange = useCallback(({ startR: s, endR: e }) => {
    setStartR(s); setEndR(e);
  }, []);

  const trimmedSec = trimOn && duration > 0 ? Math.max(0, (endR - startR) * duration) : 0;
  const trimmedEstMb = trimmedSec > 0 ? (trimmedSec * (compressOn ? parseInt(bitrate, 10) : 320)) / 8 / 1024 / 1024 : 0;
  const needsCompressWarning = trimOn && trimmedSec > 600 && !compressOn;

  const handleProcess = async () => {
    if (!compressOn && !trimOn) { setError('Compress ya Trim — koi ek option zaroori hai.'); return; }
    const startSec = trimOn ? startR * duration : 0;
    const endSec = trimOn ? endR * duration : 0;
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
  if (!file) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
          background: open ? 'rgba(212,168,67,.12)' : 'var(--bg-surface)',
          color: open ? 'var(--gold)' : 'var(--grey)',
          border: `1px solid ${open ? 'rgba(212,168,67,.35)' : 'var(--divider)'}`,
          cursor: 'pointer', transition: 'all .15s',
        }}>
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
        <div style={{ marginTop: 8, padding: '16px 18px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--divider)' }}>
          <p style={{ fontSize: 11, color: 'var(--grey)', marginBottom: 14 }}>
            File: <span style={{ color: 'var(--grey-light)' }}>{file.name}</span>
            {' · '}<span style={{ color: 'var(--grey-light)' }}>{formatBytes(file.size)}</span>
          </p>

          {/* ── Compress ── */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={compressOn} onChange={e => setCompressOn(e.target.checked)}
              style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
            <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700 }}>Compress</span>
            <span style={{ color: 'var(--grey)', fontSize: 11 }}>— file size kam karo</span>
          </label>

          {compressOn && (
            <div style={{ marginLeft: 23, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                {[
                  { val: '320', label: '320 kbps', hint: 'Best quality' },
                  { val: '256', label: '256 kbps', hint: 'High quality' },
                  { val: '192', label: '192 kbps', hint: 'Very good' },
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
                {formatBytes(file.size)} → ~{formatBytes(file.size * ({'320':1.2,'256':0.95,'192':0.72,'128':0.75,'96':0.55,'64':0.38,'48':0.28,'32':0.18}[bitrate] || 0.75))}
              </p>
            </div>
          )}

          {/* ── Trim ── */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
            <input type="checkbox" checked={trimOn} onChange={e => setTrimOn(e.target.checked)}
              style={{ accentColor: 'var(--gold)', width: 15, height: 15 }} />
            <span style={{ color: 'var(--white)', fontSize: 13, fontWeight: 700 }}>Trim</span>
            <span style={{ color: 'var(--grey)', fontSize: 11 }}>— shuru / khatam drag karein</span>
          </label>

          {trimOn && (
            <div style={{ marginLeft: 0, marginBottom: 16 }}>
              {loadingWave ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 0', color: 'var(--grey)', fontSize: 12 }}>
                  <div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid var(--gold)', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
                  Waveform load ho raha hai...
                </div>
              ) : audioBuf ? (
                <WaveformTrimmer
                  audioBuf={audioBuf}
                  duration={duration}
                  startR={startR}
                  endR={endR}
                  onChange={handleChange}
                />
              ) : null}
              {needsCompressWarning && (
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5, color: '#F97316', background: 'rgba(249,115,22,.1)', border: '1px solid rgba(249,115,22,.25)' }}>
                  Lamba clip (~{formatTime(trimmedSec)}, ~{trimmedEstMb.toFixed(0)}MB bina compress) — upload fail ho sakta hai.
                  Upar <strong>Compress</strong> ON karein (128 kbps recommended).
                </div>
              )}
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div style={{ color: '#EF4444', fontSize: 12, marginBottom: 10, padding: '8px 12px', background: 'rgba(239,68,68,.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,.2)' }}>
              {error}
            </div>
          )}

          {/* ── Processing / Result / Button ── */}
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
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#10B981', fontSize: 12, fontWeight: 700 }}>✓ Done!</span>
                <span style={{ color: 'var(--grey)', fontSize: 11 }}>
                  {formatBytes(file.size)} → {formatBytes(result.size)}
                  {sizeReduction > 0
                    ? <span style={{ color: '#10B981', marginLeft: 4 }}>({sizeReduction}% chota)</span>
                    : <span style={{ color: '#F97316', marginLeft: 4 }}>(bada hua — 128k try karein)</span>
                  }
                </span>
              </div>
              <audio controls src={result.url} style={{ width: '100%', height: 36, accentColor: 'var(--gold)', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {used ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,.18)', color: '#10B981', border: '1px solid rgba(16,185,129,.4)' }}>
                    ✓ Yeh file selected hai — upload mein use hogi
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { onProcessed(result.file, result.url); setUsed(true); }}
                    style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(16,185,129,.12)', color: '#10B981', border: '1px solid rgba(16,185,129,.3)', cursor: 'pointer' }}
                  >
                    ✓ Yeh file use karein
                  </button>
                )}
                {!used && (
                  <button type="button" onClick={handleProcess}
                    style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'var(--bg-surface)', color: 'var(--grey)', border: '1px solid var(--divider)', cursor: 'pointer' }}>
                    Dobara
                  </button>
                )}
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
