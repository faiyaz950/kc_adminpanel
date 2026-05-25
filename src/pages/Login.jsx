import { useState } from 'react';
import client from '../api/client';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/login', { email, password });
      if (!res.data.user.is_admin) {
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
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🕌</div>
        <h1 style={styles.title}>Karbala Connect</h1>
        <p style={styles.subtitle}>Admin Panel</p>

        <form onSubmit={handleLogin} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@email.com"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? 'Login ho raha hai...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' },
  card: { background: 'var(--bg-card)', border: '1px solid #2A1200', borderRadius: 16, padding: '40px 36px', width: 360, textAlign: 'center' },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { color: 'var(--gold)', fontSize: 22, fontWeight: 700, marginBottom: 4 },
  subtitle: { color: 'var(--grey)', fontSize: 13, marginBottom: 32 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' },
  label: { color: 'var(--grey)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  input: { background: 'var(--bg-light)', border: '1px solid #3A2200', borderRadius: 8, padding: '10px 14px', color: 'var(--white)' },
  error: { color: 'var(--red)', fontSize: 13 },
  btn: { background: 'var(--gold)', color: '#0D0500', fontWeight: 700, fontSize: 15, padding: '12px', borderRadius: 8, marginTop: 8 },
};
