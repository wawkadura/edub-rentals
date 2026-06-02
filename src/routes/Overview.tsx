import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useRecords } from '../stores/records'
import { formatLYD } from '../lib/format'
import { Wallet, Percent, ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'
import type { ParticipantSummary, Participant, Record as TxRecord } from '../lib/types'

function buildCumulativeSeries(records: TxRecord[]) {
  const live = records.filter(r => !r.archive && !r.hide)
  const sorted = [...live].sort((a, b) => (a.date < b.date ? -1 : 1))
  const series: { date: string; label: string; revenus: number; expenses: number }[] = []
  let revenus = 0
  let expenses = 0
  let current: { date: string; label: string; revenus: number; expenses: number } | null = null
  for (const r of sorted) {
    if (r.nature === 'Revenu') revenus += r.amount
    else if (r.nature === 'Expense') expenses += r.amount
    else continue
    const label = formatMonthLabel(r.date)
    if (current && current.date === r.date) {
      current.revenus = revenus
      current.expenses = expenses
    } else {
      current = { date: r.date, label, revenus, expenses }
      series.push(current)
    }
  }
  return series
}

function formatMonthLabel(date: string): string {
  const d = new Date(date + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(Math.round(n))
}

function buildParticipantRows(p: ParticipantSummary) {
  const rows = [
    { label: 'Investi', value: formatLYD(p.invested) },
    { label: 'Reçu', value: formatLYD(p.distributed) },
  ]
  if (p.advance_due > 0) {
    rows.push({ label: 'Avance dûe', value: formatLYD(Math.round(p.advance_due)) })
  }
  return rows
}

export default function Overview() {
  const { summary, records, loading, error, refresh, add } = useRecords()
  const [withdrawFor, setWithdrawFor] = useState<Participant | null>(null)

  useEffect(() => {
    refresh()
  }, [refresh])

  const roi = useMemo(() => {
    if (!summary || summary.total_invested === 0) return null
    const pnl = summary.total_revenus - summary.total_expenses
    return (pnl / summary.total_invested) * 100
  }, [summary])

  const cumulativeSeries = useMemo(() => buildCumulativeSeries(records), [records])

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
        <Kpi
          icon={ArrowDownLeft}
          label="Entrées totales"
          value={formatLYD(summary.total_cash_in)}
          tone="positive"
          hint="Loyers + apports"
        />
        <Kpi
          icon={ArrowUpRight}
          label="Sorties totales"
          value={formatLYD(summary.total_cash_out)}
          tone="negative"
          hint="Versements + dépenses"
        />
      </section>

      <section className="grid grid-cols-2 gap-3">
        <BigCard
          icon={Wallet}
          label="Walid"
          primary={formatLYD(walid.net)}
          primaryColor={walid.net >= 0 ? 'var(--positive)' : 'var(--negative)'}
          rows={buildParticipantRows(walid)}
          onClick={() => setWithdrawFor('Walid')}
        />
        <BigCard
          icon={Wallet}
          label="Sofian"
          primary={formatLYD(sofian.net)}
          primaryColor={sofian.net >= 0 ? 'var(--positive)' : 'var(--negative)'}
          rows={buildParticipantRows(sofian)}
          onClick={() => setWithdrawFor('Sofian')}
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

      {cumulativeSeries.length > 1 ? (
        <section
          className="flex flex-col gap-3 rounded-2xl border p-4 md:p-5"
          style={{ borderColor: 'var(--border-color)', background: 'var(--elevated)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-wider opacity-60">Cumul revenus / dépenses</div>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider opacity-60">
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: 'var(--positive)' }}
                />
                Revenus
              </span>
              <span className="flex items-center gap-1">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: 'var(--negative)' }}
                />
                Dépenses
              </span>
            </div>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumulativeSeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--border-color)" strokeDasharray="2 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--text-primary)', opacity: 0.6, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-color)' }}
                  interval="preserveStartEnd"
                  minTickGap={32}
                />
                <YAxis
                  tick={{ fill: 'var(--text-primary)', opacity: 0.6, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-color)' }}
                  tickFormatter={v => formatCompact(v as number)}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--text-primary)', opacity: 0.7, fontSize: 11 }}
                  formatter={value => [formatLYD(Number(value) || 0), '']}
                />
                <Line
                  type="monotone"
                  dataKey="revenus"
                  name="Revenus"
                  stroke="var(--positive)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  name="Dépenses"
                  stroke="var(--negative)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}

      {withdrawFor ? (
        <WithdrawModal
          partner={withdrawFor}
          onClose={() => setWithdrawFor(null)}
          onSubmit={async amount => {
            await add({
              transaction: `Retrait · ${withdrawFor}`,
              amount,
              date: new Date().toISOString().slice(0, 10),
              paid_by: 'Business',
              beneficiary: withdrawFor,
              nature: 'Transfer',
              tags: ['Distribution'],
              notes: '',
            })
            setWithdrawFor(null)
          }}
        />
      ) : null}
    </div>
  )
}

function WithdrawModal({
  partner,
  onClose,
  onSubmit,
}: {
  partner: Participant
  onClose: () => void
  onSubmit: (amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const numericAmount = Number(amount) || 0

  async function submit() {
    if (numericAmount <= 0 || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(numericAmount)
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center md:items-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-5 rounded-t-3xl border p-6 md:rounded-3xl"
        style={{
          background: 'var(--elevated)',
          borderColor: 'var(--border-color)',
          paddingBottom: 'calc(24px + var(--safe-bottom))',
        }}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider opacity-60">Retrait</span>
            <h2 className="text-lg font-semibold">{partner}</h2>
            <span className="text-xs opacity-60">Trésorerie → {partner}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-2 hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </header>

        <label className="flex flex-col items-center gap-2 rounded-2xl border px-4 py-6 text-center"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            enterKeyHint="done"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 12))}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
                submit()
              }
            }}
            className="w-full bg-transparent text-center text-5xl font-semibold tracking-tight outline-none"
            style={{
              color: numericAmount > 0 ? 'var(--text-primary)' : 'var(--neutral-spend)',
              caretColor: 'var(--accent-primary)',
            }}
            placeholder="0"
            aria-label="Montant"
          />
          <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">LYD</div>
        </label>

        {error ? (
          <div
            className="rounded-lg border px-3 py-2 text-xs"
            style={{ borderColor: 'var(--negative)', color: 'var(--negative)' }}
          >
            {error}
          </div>
        ) : null}

        <button
          onClick={submit}
          disabled={submitting || numericAmount <= 0}
          className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold transition disabled:opacity-50"
          style={{
            background: 'var(--accent-primary)',
            color: '#111418',
            boxShadow: '0 6px 20px rgba(245,200,66,0.25)',
          }}
        >
          {submitting ? 'Enregistrement…' : `Retirer ${numericAmount > 0 ? formatLYD(numericAmount) : ''}`}
        </button>
      </div>
    </div>
  )
}

function BigCard({
  icon: Icon,
  label,
  primary,
  primaryColor,
  rows,
  onClick,
}: {
  icon: LucideIcon
  label: string
  primary: string
  primaryColor: string
  rows: { label: string; value: string }[]
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col gap-3 rounded-2xl border p-4 text-left transition enabled:hover:bg-white/[0.03] enabled:active:scale-[0.99] md:p-5"
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
    </button>
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
