import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRecords } from '../stores/records'
import { formatLYD, formatDate } from '../lib/format'
import { ALL_NATURES } from '../lib/types'
import type { Record as TxRecord, Nature } from '../lib/types'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, ChevronRight } from 'lucide-react'

type NatureFilter = 'all' | Nature

export default function Transactions() {
  const navigate = useNavigate()
  const { records, loading, error, refresh } = useRecords()
  const [filter, setFilter] = useState<NatureFilter>('all')

  useEffect(() => {
    refresh()
  }, [refresh])

  const grouped = useMemo(() => {
    const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1))
    const filtered = filter === 'all' ? sorted : sorted.filter(r => r.nature === filter)
    const groups: { key: string; label: string; items: TxRecord[] }[] = []
    for (const r of filtered) {
      const month = r.date.slice(0, 7)
      const last = groups[groups.length - 1]
      if (last && last.key === month) {
        last.items.push(r)
      } else {
        const label = new Date(r.date + 'T12:00:00').toLocaleDateString('fr-FR', {
          month: 'long',
          year: 'numeric',
        })
        groups.push({ key: month, label: label.charAt(0).toUpperCase() + label.slice(1), items: [r] })
      }
    }
    return groups
  }, [records, filter])

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold md:text-2xl">Transactions</h1>
        <span className="text-xs opacity-50">{records.length} entrées</span>
      </header>

      <div className="flex gap-2 overflow-x-auto">
        {(['all', ...ALL_NATURES] as NatureFilter[]).map(n => {
          const active = filter === n
          return (
            <button
              key={n}
              onClick={() => setFilter(n)}
              className="whitespace-nowrap rounded-full border px-3 py-1 text-xs transition"
              style={{
                borderColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
                color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
                background: active ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' : 'transparent',
              }}
            >
              {n === 'all' ? 'Toutes' : n === 'Transfer' ? 'Transferts' : n === 'Revenu' ? 'Revenus' : 'Dépenses'}
            </button>
          )
        })}
      </div>

      {loading && !records.length ? (
        <div className="opacity-60">Chargement…</div>
      ) : error ? (
        <div style={{ color: 'var(--negative)' }}>{error}</div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm opacity-60" style={{ borderColor: 'var(--border-color)' }}>
          Aucune transaction.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {grouped.map(g => (
            <div key={g.key} className="flex flex-col gap-2">
              <h2 className="text-[11px] uppercase tracking-wider opacity-50">{g.label}</h2>
              <div
                className="overflow-hidden rounded-2xl border"
                style={{ borderColor: 'var(--border-color)', background: 'var(--elevated)' }}
              >
                {g.items.map((r, i) => (
                  <Row
                    key={r.id}
                    r={r}
                    first={i === 0}
                    last={i === g.items.length - 1}
                    onClick={() => navigate(`/edit/${r.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Row({ r, last, onClick }: { r: TxRecord; first: boolean; last: boolean; onClick: () => void }) {
  const icon =
    r.nature === 'Revenu' ? (
      <ArrowDownLeft size={18} style={{ color: 'var(--positive)' }} />
    ) : r.nature === 'Expense' ? (
      <ArrowUpRight size={18} style={{ color: 'var(--negative)' }} />
    ) : (
      <ArrowLeftRight size={18} style={{ color: 'var(--neutral-spend)' }} />
    )

  const amountColor =
    r.nature === 'Revenu' ? 'var(--positive)' : r.nature === 'Expense' ? 'var(--negative)' : 'var(--text-primary)'

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-white/5 active:bg-white/10 md:px-4"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border-color)' }}
    >
      <div
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
        style={{ background: 'color-mix(in srgb, var(--text-primary) 6%, transparent)' }}
      >
        {icon}
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="truncate text-sm font-medium">{r.transaction}</div>
        <div className="flex items-center gap-2 text-[11px] opacity-60">
          <span>{formatDate(r.date)}</span>
          <span>·</span>
          <span className="truncate">
            {r.paid_by} → {r.beneficiary}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <div className="text-sm font-semibold whitespace-nowrap md:text-base" style={{ color: amountColor }}>
          {formatLYD(r.amount)}
        </div>
        {r.tags && r.tags.length > 0 ? (
          <div className="text-[10px] opacity-60">{r.tags[0]}</div>
        ) : null}
      </div>
      <ChevronRight size={14} className="opacity-30 transition group-hover:opacity-60" />
    </button>
  )
}
