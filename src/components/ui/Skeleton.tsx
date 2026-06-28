// Shimmer placeholder used while a store is loading. Variants cover the
// common page shapes (header, KPI strip, chart, matrix). Routes compose them
// to mimic their content's layout.

import './Skeleton.css'

interface BlockProps {
  width?: number | string
  height?: number | string
  radius?: number
  style?: React.CSSProperties
}

export function SkeletonBlock({ width = '100%', height = 16, radius = 6, style }: BlockProps) {
  return (
    <div
      className="skeleton-block"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}

export function SkeletonCard({ height = 120, style }: { height?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        ...style,
      }}
    >
      <SkeletonBlock width={120} height={10} radius={4} style={{ marginBottom: 12 }} />
      <SkeletonBlock width="60%" height={28} radius={6} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="40%" height={12} radius={4} />
      {height > 120 && <SkeletonBlock width="100%" height={Math.max(0, height - 96)} radius={6} style={{ marginTop: 12 }} />}
    </div>
  )
}

// Page-level placeholder. Renders a header bar + a KPI strip + a chart block —
// the shape most of our pages share at the top.
export function PageSkeleton({ title }: { title?: string } = {}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SkeletonBlock width={160} height={22} radius={6} />
        {title && <span style={{ fontSize: 11, color: 'var(--neutral-spend)' }}>{title}</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <SkeletonCard height={108} />
        <SkeletonCard height={108} />
        <SkeletonCard height={108} />
      </div>
      <SkeletonCard height={280} />
      <SkeletonCard height={180} />
    </div>
  )
}
