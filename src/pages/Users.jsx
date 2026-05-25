import { useState, useEffect } from 'react';
import client from '../api/client';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    client.get('/users')
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Users</h2>
          <p style={styles.subtitle}>{users.length} registered users</p>
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={styles.searchInput} />
      </div>

      {loading ? <p style={{ color: 'var(--grey)' }}>Loading...</p> : (
        <table style={styles.table}>
          <thead>
            <tr>
              {['User', 'Email', 'Favorites', 'Recently Played'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={4} style={{ ...styles.td, textAlign: 'center', color: 'var(--grey)' }}>Koi user nahi</td></tr>
            )}
            {filtered.map(user => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.userCell}>
                    <div style={styles.avatar}>{user.name?.[0]?.toUpperCase() || '?'}</div>
                    <span style={{ color: 'var(--white)', fontWeight: 600 }}>{user.name || 'N/A'}</span>
                  </div>
                </td>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}><span style={styles.badge}>{(user.favorites || []).length}</span></td>
                <td style={styles.td}><span style={styles.badge}>{(user.recently_played || []).length}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 860 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { color: 'var(--white)', fontSize: 22, fontWeight: 700 },
  subtitle: { color: 'var(--grey)', fontSize: 13, marginTop: 4 },
  searchInput: { background: 'var(--bg-card)', border: '1px solid #2A1200', borderRadius: 8, padding: '9px 14px', color: 'var(--white)', width: 220 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', color: 'var(--grey)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, padding: '10px 12px', borderBottom: '1px solid #2A1200' },
  tr: { borderBottom: '1px solid #1C0A00' },
  td: { padding: '12px', color: 'var(--grey)', verticalAlign: 'middle' },
  userCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 700, fontSize: 15 },
  badge: { background: 'var(--bg-light)', color: 'var(--gold)', padding: '3px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 },
};
