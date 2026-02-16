import './Skeleton.css';

export function SkeletonBlock({ width, height, style, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: width || '100%', height: height || '14px', ...style }}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div className="skeleton-stat-card">
      <SkeletonBlock width={40} height={40} style={{ borderRadius: 10 }} />
      <SkeletonBlock width="70%" height={12} />
      <SkeletonBlock width="40%" height={28} />
    </div>
  );
}

export function SkeletonChartCard() {
  return (
    <div className="skeleton-chart-card">
      <SkeletonBlock width="30%" height={16} style={{ marginBottom: 16 }} />
      <SkeletonBlock height={240} />
    </div>
  );
}

export function SkeletonAppCard() {
  return (
    <div className="skeleton-app-card">
      <div className="skeleton-row">
        <div style={{ flex: 1 }}>
          <SkeletonBlock width="60%" height={16} />
          <SkeletonBlock width="40%" height={12} style={{ marginTop: 6 }} />
        </div>
        <SkeletonBlock width={70} height={24} style={{ borderRadius: 20 }} />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <SkeletonBlock width={80} height={12} />
        <SkeletonBlock width={60} height={12} />
      </div>
    </div>
  );
}
