import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';

const HomeUlemas = lazy(() => import('./HomeUlemas'));
const HomeBrowseCategories = lazy(() => import('./HomeBrowseCategories'));
const HomeNauhakhwans = lazy(() => import('./HomeNauhakhwans'));
const FeaturedAlbums = lazy(() => import('./FeaturedAlbums'));

const TABS = [
  { id: 'ulemas', label: 'Home Ulema', Component: HomeUlemas },
  { id: 'categories', label: 'Home Categories', Component: HomeBrowseCategories },
  { id: 'nauhakhwans', label: 'Home Nauhakhwan', Component: HomeNauhakhwans },
  { id: 'albums', label: 'Featured Albums', Component: FeaturedAlbums },
];

function TabLoader() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--emerald)',
        borderTopColor: 'transparent',
        animation: 'kspin .7s linear infinite',
      }} />
      <style>{`@keyframes kspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

export default function HomeSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabId = searchParams.get('tab') || 'ulemas';
  const active = TABS.find(t => t.id === tabId) || TABS[0];
  const ActiveComponent = active.Component;

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Home Setting</h2>
          <p className="page-subtitle">
            App home screen — ulema, categories, nauhakhwans aur featured albums manage karein
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="Home settings sections"
        style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 20,
          padding: 4,
          borderRadius: 12,
          background: 'rgba(255,255,255,.03)',
          border: '1px solid var(--divider)',
        }}
      >
        {TABS.map(tab => {
          const isActive = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSearchParams({ tab: tab.id })}
              style={{
                padding: '10px 16px',
                borderRadius: 8,
                border: `1px solid ${isActive ? 'rgba(34,197,94,.45)' : 'transparent'}`,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(34,197,94,.18), rgba(34,197,94,.06))'
                  : 'transparent',
                color: isActive ? 'var(--emerald-light)' : 'var(--grey)',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all .15s',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <Suspense fallback={<TabLoader />}>
        <ActiveComponent embedded />
      </Suspense>
    </div>
  );
}
