import { useEffect, useState } from 'react';
import client from '../api/client';

const CATEGORY_COLORS = { dua: '#006B6B', noha: '#8B0000', manqabat: '#4B0082', naat: '#8B5E00' };

export default function Dashboard() {
  const [stats, setStats] = useState({ tracks: 0, reciters: 0, users: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tracks, reciters, users] = await Promise.all([
          client.get('/tracks'),
          client.get('/reciters'),
          client.get('/users'),
        ]);
        setStats({
          tracks: tracks.data.length,
          reciters: reciters.data.length,
          users: users.data.length,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Tracks', value: stats.tracks, icon: '🎵', color: 'var(--gold)' },
    { label: 'Reciters', value: stats.reciters, icon: '🎤', color: '#4B9CD3' },
    { label: 'Users', value: stats.users, icon: '👥', color: '#2E7D32' },
  ];

  const categories = [
    { id: 'dua', label: 'Duas' },
    { id: 'noha', label: 'Nauhe' },
    { id: 'manqabat', label: 'Manqabat' },
    { id: 'naat', label: 'Naats' },
  ];

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Dashboard</h2>
        <p style={styles.subtitle}>Karbala Connect ka overview</p>
      </div>

      {loading ? <p style={{ color: 'var(--grey)' }}>Loading...</p> : (
        <>
          <div style={styles.statsGrid}>
            {statCards.map(card => (
              <div key={card.label} style={styles.statCard}>
                <div style={styles.statIcon}>{card.icon}</div>
                <div>
                  <div style={{ ...styles.statValue, color: card.color }}>{card.value}</div>
                  <div style={styles.statLabel}>{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          <h3 style={styles.sectionTitle}>Categories</h3>
          <div style={styles.catGrid}>
            {categories.map(cat => (
              <div key={cat.id} style={{ ...styles.catCard, borderColor: CATEGORY_COLORS[cat.id], background: CATEGORY_COLORS[cat.id] + '22' }}>
                <div style={{ color: CATEGORY_COLORS[cat.id], fontSize: 18, fontWeight: 700 }}>{cat.label}</div>
                <div style={{ color: 'var(--grey)', fontSize: 12, marginTop: 4 }}>Tracks manage karein</div>
              </div>
            ))}
          </div>

          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.quickGrid}>
            <QuickCard href="/tracks" icon="🎵" label="Track Add Karein" />
            <QuickCard href="/reciters" icon="🎤" label="Reciter Add Karein" />
            <QuickCard href="/tracks" icon="⭐" label="Featured Set Karein" />
            <QuickCard href="/users" icon="👥" label="Users Dekhein" />
          </div>
        </>
      )}
    </div>
  );
}

function QuickCard({ href, icon, label }) {
  return (
    <a href={href} style={styles.quickCard}>
      <span style={{ fontSize: 24 }}>{icon}</span>
      <span style={{ color: 'var(--white)', fontSize: 13 }}>{label}</span>
    </a>
  );
}

const styles = {
  page: { padding: '28px 32px', maxWidth: 900 },
  header: { marginBottom: 28 },
  title: { color: 'var(--white)', fontSize: 22, fontWeight: 700 },
  subtitle: { color: 'var(--grey)', fontSize: 13, marginTop: 4 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 },
  statCard: { background: 'var(--bg-card)', border: '1px solid #2A1200', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 },
  statIcon: { fontSize: 32 },
  statValue: { fontSize: 32, fontWeight: 700, lineHeight: 1 },
  statLabel: { color: 'var(--grey)', fontSize: 13, marginTop: 4 },
  sectionTitle: { color: 'var(--gold)', fontSize: 15, fontWeight: 600, marginBottom: 12 },
  catGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 },
  catCard: { border: '1px solid', borderRadius: 10, padding: 16 },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  quickCard: { background: 'var(--bg-card)', border: '1px solid #2A1200', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
};
