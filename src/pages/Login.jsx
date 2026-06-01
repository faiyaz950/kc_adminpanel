import { useState } from 'react';
import client from '../api/client';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/login', {
        email,
        password,
        device_name: `web-${navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'}-${Date.now()}`,
      });
      const isAdmin = res.data.user.is_admin === true || res.data.user.is_admin === 1;
      if (!isAdmin) {
        setError('Access denied. Aap admin nahi hain.');
        return;
      }
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Email ya password galat hai.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Ambient glows */}
      <div style={{ ...s.glow, top: -100, right: -100, background: 'radial-gradient(circle, rgba(22,163,74,.15), transparent 70%)' }} />
      <div style={{ ...s.glow, bottom: -80, left: -80, background: 'radial-gradient(circle, rgba(212,168,67,.1), transparent 70%)' }} />

      <div style={s.card}>
        {/* Top accent line */}
        <div style={s.topAccent} />

        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoInner}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 22h18M9 22V8l3-6 3 6v14M5 22V12l-2-2M19 22V12l2-2"/>
              <line x1="9" y1="11" x2="15" y2="11"/>
            </svg>
          </div>
        </div>

        <h1 style={s.title}>Karbala Connect</h1>
        <p style={s.subtitle}>Admin Panel — Sirf authorized access</p>

        <form onSubmit={handleLogin} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Email Address</label>
            <div style={s.inputWrap}>
              <svg width="16" height="16" style={s.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
              </svg>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                style={s.input}
              />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <div style={s.inputWrap}>
              <svg width="16" height="16" style={s.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ ...s.input, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                style={s.eyeBtn}
              >
                {showPass
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {error && (
            <div style={s.errBanner}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={s.submitBtn}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span style={s.spinner} />
                Login ho raha hai...
              </span>
            ) : 'Admin Login'}
          </button>
        </form>

        <p style={s.footNote}>
          Sirf authorized admins hi access kar sakte hain
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px var(--bg-surface) inset !important; -webkit-text-fill-color: var(--white) !important; }
      `}</style>
    </div>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-dark)',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--divider)',
    borderRadius: 24,
    padding: '40px 36px',
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 24px 60px rgba(0,0,0,.5)',
  },
  topAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    background: 'linear-gradient(90deg, var(--emerald), var(--gold), var(--emerald-light))',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 20,
    background: 'linear-gradient(135deg, rgba(212,168,67,.2), rgba(212,168,67,.05))',
    border: '1px solid rgba(212,168,67,.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 30px rgba(212,168,67,.15)',
  },
  title: {
    color: 'var(--white)',
    fontSize: 22,
    fontWeight: 800,
    letterSpacing: '-0.3px',
    marginBottom: 6,
  },
  subtitle: {
    color: 'var(--grey)',
    fontSize: 12,
    marginBottom: 32,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 7,
    textAlign: 'left',
  },
  label: {
    color: 'var(--grey)',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  inputWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 13,
    color: 'var(--grey-dark)',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    background: 'var(--bg-surface)',
    border: '1px solid var(--divider)',
    borderRadius: 10,
    padding: '12px 14px 12px 40px',
    color: 'var(--white)',
    fontSize: 14,
    transition: 'border-color .15s, box-shadow .15s',
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    background: 'none',
    color: 'var(--grey)',
    display: 'flex',
    padding: 4,
  },
  errBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: 'rgba(239,68,68,.08)',
    border: '1px solid rgba(239,68,68,.25)',
    borderRadius: 8,
    padding: '10px 12px',
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'left',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
    color: 'var(--bg-deep)',
    fontWeight: 700,
    fontSize: 15,
    padding: '14px',
    borderRadius: 10,
    marginTop: 4,
    transition: 'opacity .15s, transform .1s',
    width: '100%',
  },
  spinner: {
    display: 'inline-block',
    width: 16,
    height: 16,
    border: '2px solid rgba(0,0,0,.2)',
    borderTopColor: 'var(--bg-deep)',
    borderRadius: '50%',
    animation: 'spin .7s linear infinite',
  },
  footNote: {
    color: 'var(--grey-dark)',
    fontSize: 11,
    marginTop: 24,
    lineHeight: 1.5,
  },
};
