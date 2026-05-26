import { useEffect } from 'react'
import { useRecords } from '../stores/records'
import { formatLYD } from '../lib/format'

export default function Participants() {
  const { summary, loading, error, refresh } = useRecords()

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading && !summary) return <div className="opacity-60">Chargement…</div>
  if (error) return <div style={{ color: 'var(--negative)' }}>{error}</div>
  if (!summary) return <div className="opacity-60">Pas de données.</div>

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Participants</h1>
        <p className="text-sm opacity-60">Vue détaillée par actionnaire / partie prenante</p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {summary.participants.map(p => (
          <div
            key={p.name}
            className="rounded-xl border p-4"
            style={{ borderColor: 'var(--border-color)', background: 'var(--elevated)' }}
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-base font-medium">{p.name}</h2>
              <div
                className="text-lg font-semibold"
                style={{ color: p.net >= 0 ? 'var(--positive)' : 'var(--negative)' }}
              >
                {formatLYD(p.net)}
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <Row label="Versé au business" value={p.total_paid} />
              <Row label="Reçu du business" value={p.total_received} />
              <Row label="dont investissement" value={p.invested} muted />
              <Row label="dont distribution reçue" value={p.distributed} muted />
              <Row label="dont avance dépenses" value={p.expenses_advanced} muted />
              <Row label="dont remboursement reçu" value={p.expenses_reimbursed} muted />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? 'opacity-50 pl-3' : ''}`}>
      <span>{label}</span>
      <span className="font-medium">{formatLYD(value)}</span>
    </div>
  )
}
