import { useEffect, useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useRecords } from '../stores/records'
import { formatLYD } from '../lib/format'
import { Wallet, Percent } from 'lucide-react'

export default function Overview() {
  const { summary, loading, error, refresh } = useRecords()

  useEffect(() => {
    refresh()
  }, [refresh])

  const roi = useMemo(() => {
    if (!summary || summary.total_invested === 0) return null
    const pnl = summary.total_revenus - summary.total_expenses
    return (pnl / summary.total_invested) * 100
  }, [summary])

  if (loading && !summary) return <Centered>Chargement…</Centered>
  if (error) return <Centered>Erreur : {error}</Centered>
  if (!summary) return <Centered>Pas de données.</Centered>

  const walid = summary.participants.find(p => p.name === 'Walid')!
  const sofian = summary.participants.find(p => p.name === 'Sofian')!

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col items-start gap-1 md:items-center md:text-center">
        <span className="text-xs uppercase tracking-wider opacity-50">Trésorerie</span>
        <h1 className="text-hero" style={{ color: 'var(--accent-primary)' }}>
          {formatLYD(summary.treasury)}
        </h1>
        <span className="text-xs opacity-50">Solde net du business</span>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <BigCard
          icon={Wallet}
          label="Walid"
          primary={formatLYD(walid.net)}
          primaryColor={walid.net >= 0 ? 'var(--positive)' : 'var(--negative)'}
          rows={[
            { label: 'Investi', value: formatLYD(walid.invested) },
            { label: 'Reçu', value: formatLYD(walid.distributed) },
          ]}
        />
        <BigCard
          icon={Wallet}
          label="Sofian"
          primary={formatLYD(sofian.net)}
          primaryColor={sofian.net >= 0 ? 'var(--positive)' : 'var(--negative)'}
          rows={[
            { label: 'Investi', value: formatLYD(sofian.invested) },
            { label: 'Reçu', value: formatLYD(sofian.distributed) },
          ]}
        />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Kpi
          icon={Percent}
          label="Rentabilité"
          value={roi !== null ? `${roi.toFixed(1)} %` : '—'}
          tone={roi !== null && roi >= 0 ? 'positive' : roi !== null ? 'negative' : undefined}
          hint="(revenus − dépenses) / investi"
        />
        <Kpi
          icon={Wallet}
          label="Total investi"
          value={formatLYD(summary.total_invested)}
        />
      </section>
    </div>
  )
}

function BigCard({
  icon: Icon,
  label,
  primary,
  primaryColor,
  rows,
}: {
  icon: LucideIcon
  label: string
  primary: string
  primaryColor: string
  rows: { label: string; value: string }[]
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-4 md:p-5"
      style={{ borderColor: 'var(--border-color)', background: 'var(--elevated)' }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-60">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-semibold md:text-3xl" style={{ color: primaryColor }}>
        {primary}
      </div>
      <div className="flex flex-col gap-1 text-xs opacity-70">
        {rows.map(r => (
          <div key={r.label} className="flex justify-between">
            <span>{r.label}</span>
            <span className="font-medium">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: 'positive' | 'negative'
  hint?: string
}) {
  const color =
    tone === 'positive' ? 'var(--positive)' : tone === 'negative' ? 'var(--negative)' : 'var(--text-primary)'
  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-3"
      style={{ borderColor: 'var(--border-color)', background: 'var(--elevated)' }}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-60">
        <Icon size={12} />
        <span>{label}</span>
      </div>
      <div className="text-base font-semibold md:text-lg" style={{ color }}>
        {value}
      </div>
      {hint ? <div className="text-[10px] opacity-50">{hint}</div> : null}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center p-8 opacity-60">{children}</div>
}
