import { useEffect } from 'react'
import { useRecords } from '../stores/records'
import { formatLYD } from '../lib/format'
import { Wallet, TrendingUp, TrendingDown, Users, Home } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export default function Dashboard() {
  const { summary, loading, error, refresh } = useRecords()

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading && !summary) return <Centered>Chargement…</Centered>
  if (error) return <Centered>Erreur : {error}</Centered>
  if (!summary) return <Centered>Pas de données.</Centered>

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-hero">{formatLYD(summary.treasury)}</h1>
        <p className="text-sm opacity-60">Trésorerie nette · Libya Villa Business</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          icon={Wallet}
          label="Total investi"
          value={formatLYD(summary.total_invested)}
          hint="Capital apporté par les actionnaires"
        />
        <Kpi
          icon={TrendingUp}
          label="Revenus locatifs"
          value={formatLYD(summary.total_revenus)}
          hint="Toutes les rentrées de loyer"
          tone="positive"
        />
        <Kpi
          icon={TrendingDown}
          label="Dépenses"
          value={formatLYD(summary.total_expenses)}
          hint="Maintenance, entretien"
          tone="negative"
        />
        <Kpi
          icon={Users}
          label="Distributions versées"
          value={formatLYD(summary.total_distributions)}
          hint="Versements aux actionnaires"
        />
      </section>

      <section className="rounded-xl border p-4 md:p-6" style={{ borderColor: 'var(--border-color)', background: 'var(--elevated)' }}>
        <div className="mb-3 flex items-center gap-2">
          <Home size={16} />
          <h2 className="text-sm font-medium">Par participant</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase opacity-60">
                <th className="py-2">Nom</th>
                <th className="py-2 text-right">Versé au business</th>
                <th className="py-2 text-right">Reçu du business</th>
                <th className="py-2 text-right">Net</th>
              </tr>
            </thead>
            <tbody>
              {summary.participants.map(p => (
                <tr key={p.name} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-right">{formatLYD(p.total_paid)}</td>
                  <td className="py-2 text-right">{formatLYD(p.total_received)}</td>
                  <td
                    className="py-2 text-right font-semibold"
                    style={{ color: p.net >= 0 ? 'var(--positive)' : 'var(--negative)' }}
                  >
                    {formatLYD(p.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
  hint: string
  tone?: 'positive' | 'negative'
}) {
  const valueColor =
    tone === 'positive' ? 'var(--positive)' : tone === 'negative' ? 'var(--negative)' : 'var(--text-primary)'
  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-3 md:p-4"
      style={{ borderColor: 'var(--border-color)', background: 'var(--elevated)' }}
    >
      <div className="flex items-center gap-1.5 text-xs opacity-60">
        <Icon width={14} height={14} />
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold md:text-xl" style={{ color: valueColor }}>
        {value}
      </div>
      <div className="text-[11px] opacity-50">{hint}</div>
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full items-center justify-center p-8 opacity-60">{children}</div>
}
