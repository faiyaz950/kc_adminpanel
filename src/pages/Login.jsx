import { useState } from 'react';
import client, { API_BASE_URL } from '../api/client';

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const getDeviceName = () => {
    const key = 'kc_admin_device';
    let id = localStorage.getItem(key);
    if (!id) {
      id = `web-admin-${crypto.randomUUID()}`;
      localStorage.setItem(key, id);
    }
    return id;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/login', {
        email: email.trim(),
        password,
        device_name: getDeviceName(),
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
      const apiMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.errors?.password?.[0];

      if (!err.response) {
        setError(`Network error: ${err.message || 'Request failed'} (API: ${API_BASE_URL})`);
      } else if (err.response.status === 429) {
        setError(apiMsg || 'Bahut zyada login attempts (429). 1 minute wait karein, phir dubara try karein.');
      } else {
        setError(apiMsg || `Login failed (HTTP ${err.response.status})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes loginFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: .5; }
          50%       { opacity: 1; }
        }
        .login-input {
          width: 100%;
          background: var(--bg-surface);
          border: 1px solid var(--divider);
          border-radius: 10px;
          padding: 12px 14px 12px 42px;
          color: var(--white);
          font-size: 14px;
          transition: border-color .18s, box-shadow .18s;
        }
        .login-input:focus {
          border-color: var(--emerald-light);
          box-shadow: 0 0 0 3px rgba(34,197,94,.14), 0 0 14px rgba(34,197,94,.08);
          outline: none;
        }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px var(--bg-surface) inset !important;
          -webkit-text-fill-color: var(--white) !important;
        }
        .login-submit-btn {
          background: linear-gradient(135deg, var(--gold) 0%, var(--gold-light) 100%);
          color: #000;
          font-weight: 700;
          font-size: 15px;
          padding: 14px;
          border-radius: 10px;
          margin-top: 4px;
          width: 100%;
          border: none;
          cursor: pointer;
          transition: opacity .15s, transform .12s, box-shadow .15s;
          box-shadow: 0 4px 16px rgba(212,168,67,.25);
        }
        .login-submit-btn:hover:not(:disabled) {
          opacity: .92;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(212,168,67,.35);
        }
        .login-submit-btn:active:not(:disabled) { transform: translateY(0); }
        .login-submit-btn:disabled { opacity: .65; cursor: not-allowed; }
        .login-card {
          animation: loginFadeIn .45s cubic-bezier(.22,1,.36,1) both;
        }
      `}</style>

      {/* Ambient glows */}
      <div style={{ ...s.glow, top: -120, right: -120, background: 'radial-gradient(circle, rgba(22,163,74,.18), transparent 70%)', animation: 'glowPulse 4s ease-in-out infinite' }} />
      <div style={{ ...s.glow, bottom: -100, left: -100, background: 'radial-gradient(circle, rgba(212,168,67,.12), transparent 70%)', animation: 'glowPulse 5s ease-in-out infinite .5s' }} />
      <div style={{ ...s.glow, top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(34,197,94,.03), transparent 65%)', pointerEvents: 'none' }} />

      <div className="login-card" style={s.card}>
        {/* Top accent */}
        <div style={s.topAccent} />

        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoInner}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 22h18M9 22V8l3-6 3 6v14M5 22V12l-2-2M19 22V12l2-2"/>
              <line x1="9" y1="11" x2="15" y2="11"/>
            </svg>
          </div>
        </div>

        <h1 style={s.title}>Karbala Connect</h1>
        <p style={s.subtitle}>Admin Panel — Sirf authorized access</p>

        <form onSubmit={handleLogin} style={s.form}>
          {/* Email */}
          <div style={s.field}>
            <label style={s.label}>Email Address</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" style={s.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/>
              </svg>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
                required
                className="login-input"
              />
            </div>
          </div>

          {/* Password */}
          <div style={s.field}>
            <label style={s.label}>Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" style={s.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="login-input"
                style={{ paddingRight: 44 }}
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

          {/* Error */}
          {error && (
            <div style={s.errBanner}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="login-submit-btn">
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span style={s.spinner} />
                Login ho raha hai...
              </span>
            ) : 'Admin Login'}
          </button>
        </form>

        <p style={s.footNote}>Sirf authorized admins hi access kar sakte hain</p>
        <p style={{ ...s.footNote, marginTop: 8, fontSize: 10, opacity: 0.7 }}>API: {API_BASE_URL}</p>
      </div>
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
    width: 450,
    height: 450,
    borderRadius: '50%',
    pointerEvents: 'none',
  },
  card: {
    background: 'rgba(10,26,12,0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(34,197,94,.12)',
    borderRadius: 24,
    padding: '44px 38px',
    width: '100%',
    maxWidth: 400,
    textAlign: 'center',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(0,0,0,.6), 0 0 40px rgba(34,197,94,.04)',
  },
  topAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    background: 'linear-gradient(90deg, transparent, var(--emerald-light), var(--gold), var(--emerald-light), transparent)',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  logoInner: {
    width: 68,
    height: 68,
    borderRadius: 20,
    background: 'linear-gradient(135deg, rgba(212,168,67,.18), rgba(212,168,67,.04))',
    border: '1px solid rgba(212,168,67,.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 30px rgba(212,168,67,.18)',
  },
  title: {
    color: 'var(--white)',
    fontSize: 23,
    fontWeight: 800,
    letterSpacing: '-0.4px',
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
  inputIcon: {
    position: 'absolute',
    left: 13,
    color: 'var(--grey-dark)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    background: 'none',
    color: 'var(--grey)',
    display: 'flex',
    padding: 4,
    transition: 'color .15s',
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
  spinner: {
    display: 'inline-block',
    width: 16,
    height: 16,
    border: '2px solid rgba(0,0,0,.25)',
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
