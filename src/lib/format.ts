const LYD = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0, useGrouping: true })

export function formatLYD(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const sign = n < 0 ? '−' : ''
  return `${sign}${LYD.format(Math.abs(Math.round(n)))} LYD`
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return LYD.format(Math.round(n))
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' })
}
