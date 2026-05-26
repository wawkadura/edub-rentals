import { useEffect, useMemo, useState } from 'react'
import { useRecords } from '../stores/records'
import { formatLYD, formatDate } from '../lib/format'
import { ALL_NATURES, ALL_TAGS, ALL_PARTICIPANTS } from '../lib/types'
import type { Record as TxRecord, Nature, Tag, Participant } from '../lib/types'
import { Plus, Pencil, Trash2, X } from 'lucide-react'

type NatureFilter = 'all' | Nature

export default function Transactions() {
  const { records, loading, error, refresh, add, update, remove } = useRecords()
  const [filter, setFilter] = useState<NatureFilter>('all')
  const [editing, setEditing] = useState<TxRecord | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : -1))
    if (filter === 'all') return sorted
    return sorted.filter(r => r.nature === filter)
  }, [records, filter])

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition hover:opacity-80"
          style={{
            borderColor: 'var(--accent-primary)',
            color: 'var(--accent-primary)',
            borderStyle: 'dashed',
          }}
        >
          <Plus size={14} />
          Ajouter une transaction
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['all', ...ALL_NATURES] as NatureFilter[]).map(n => (
          <button
            key={n}
            onClick={() => setFilter(n)}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              filter === n ? 'opacity-100' : 'opacity-60'
            }`}
            style={{
              borderColor: filter === n ? 'var(--accent-primary)' : 'var(--border-color)',
              color: filter === n ? 'var(--accent-primary)' : 'var(--text-primary)',
            }}
          >
            {n === 'all' ? 'Toutes' : n}
          </button>
        ))}
      </div>

      {loading && !records.length ? (
        <div className="opacity-60">Chargement…</div>
      ) : error ? (
        <div style={{ color: 'var(--negative)' }}>{error}</div>
      ) : (
        <div
          className="overflow-x-auto rounded-xl border"
          style={{ borderColor: 'var(--border-color)', background: 'var(--elevated)' }}
        >
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs uppercase opacity-60">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Transaction</th>
                <th className="px-3 py-2">Nature</th>
                <th className="px-3 py-2">De → Vers</th>
                <th className="px-3 py-2">Tags</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-3 py-2 whitespace-nowrap opacity-70">{formatDate(r.date)}</td>
                  <td className="px-3 py-2 font-medium">{r.transaction}</td>
                  <td className="px-3 py-2">
                    <NatureBadge nature={r.nature} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap opacity-80">
                    {r.paid_by} → {r.beneficiary}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(r.tags ?? []).map(t => (
                        <span
                          key={t}
                          className="rounded-full border px-2 py-0.5 text-[10px] opacity-80"
                          style={{ borderColor: 'var(--border-color)' }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td
                    className="px-3 py-2 text-right font-semibold whitespace-nowrap"
                    style={{
                      color:
                        r.nature === 'Revenu'
                          ? 'var(--positive)'
                          : r.nature === 'Expense'
                            ? 'var(--negative)'
                            : 'var(--text-primary)',
                    }}
                  >
                    {formatLYD(r.amount)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setEditing(r)}
                        aria-label="Edit"
                        className="rounded p-1 opacity-60 hover:opacity-100"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer "${r.transaction}" ?`)) {
                            remove(r.id)
                          }
                        }}
                        aria-label="Delete"
                        className="rounded p-1 opacity-60 hover:opacity-100"
                        style={{ color: 'var(--negative)' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center opacity-60">
                    Aucune transaction.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) ? (
        <RecordDialog
          initial={editing}
          onClose={() => {
            setEditing(null)
            setCreating(false)
          }}
          onSubmit={async values => {
            if (editing) {
              await update(editing.id, values)
            } else {
              await add(values)
            }
            setEditing(null)
            setCreating(false)
          }}
        />
      ) : null}
    </div>
  )
}

function NatureBadge({ nature }: { nature: Nature }) {
  const color =
    nature === 'Revenu'
      ? 'var(--positive)'
      : nature === 'Expense'
        ? 'var(--negative)'
        : 'var(--neutral-spend)'
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px]"
      style={{ borderColor: color, color }}
    >
      {nature}
    </span>
  )
}

interface DialogValues {
  transaction: string
  amount: number
  date: string
  paid_by: Participant
  beneficiary: Participant
  nature: Nature
  tags: Tag[]
  notes?: string
}

function RecordDialog({
  initial,
  onClose,
  onSubmit,
}: {
  initial: TxRecord | null
  onClose: () => void
  onSubmit: (v: DialogValues) => Promise<void>
}) {
  const [values, setValues] = useState<DialogValues>(() => ({
    transaction: initial?.transaction ?? '',
    amount: initial?.amount ?? 0,
    date: initial?.date ?? new Date().toISOString().slice(0, 10),
    paid_by: initial?.paid_by ?? 'Walid',
    beneficiary: initial?.beneficiary ?? 'Business',
    nature: initial?.nature ?? 'Transfer',
    tags: initial?.tags ?? [],
    notes: initial?.notes ?? '',
  }))
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-6">
      <div
        className="w-full max-w-lg rounded-t-xl border p-5 md:rounded-xl"
        style={{ background: 'var(--elevated)', borderColor: 'var(--border-color)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {initial ? 'Modifier la transaction' : 'Nouvelle transaction'}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-white/10">
            <X size={16} />
          </button>
        </div>

        <form
          className="flex flex-col gap-3"
          onSubmit={async e => {
            e.preventDefault()
            if (!values.transaction.trim()) return
            setSubmitting(true)
            try {
              await onSubmit(values)
            } finally {
              setSubmitting(false)
            }
          }}
        >
          <Field label="Transaction">
            <input
              required
              className="input"
              value={values.transaction}
              onChange={e => setValues(v => ({ ...v, transaction: e.target.value }))}
              placeholder="Ex : Rent Avril 2026"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                required
                type="date"
                className="input"
                value={values.date}
                onChange={e => setValues(v => ({ ...v, date: e.target.value }))}
              />
            </Field>
            <Field label="Montant (LYD)">
              <input
                required
                type="number"
                step="1"
                className="input"
                value={values.amount}
                onChange={e => setValues(v => ({ ...v, amount: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <Field label="Nature">
            <div className="flex gap-2">
              {ALL_NATURES.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setValues(v => ({ ...v, nature: n }))}
                  className="flex-1 rounded-md border px-3 py-1.5 text-xs"
                  style={{
                    borderColor: values.nature === n ? 'var(--accent-primary)' : 'var(--border-color)',
                    color: values.nature === n ? 'var(--accent-primary)' : 'var(--text-primary)',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Payé par">
              <select
                className="input"
                value={values.paid_by}
                onChange={e => setValues(v => ({ ...v, paid_by: e.target.value as Participant }))}
              >
                {ALL_PARTICIPANTS.map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Bénéficiaire">
              <select
                className="input"
                value={values.beneficiary}
                onChange={e => setValues(v => ({ ...v, beneficiary: e.target.value as Participant }))}
              >
                {ALL_PARTICIPANTS.map(p => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map(t => {
                const selected = values.tags.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      setValues(v => ({
                        ...v,
                        tags: selected ? v.tags.filter(x => x !== t) : [...v.tags, t],
                      }))
                    }
                    className="rounded-full border px-2.5 py-0.5 text-[11px]"
                    style={{
                      borderColor: selected ? 'var(--accent-primary)' : 'var(--border-color)',
                      color: selected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    }}
                  >
                    {t}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Notes (optionnel)">
            <textarea
              className="input min-h-[60px]"
              value={values.notes ?? ''}
              onChange={e => setValues(v => ({ ...v, notes: e.target.value }))}
            />
          </Field>

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm opacity-70 hover:opacity-100">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-50"
              style={{
                borderColor: 'var(--accent-primary)',
                color: 'var(--accent-primary)',
                borderStyle: 'dashed',
              }}
            >
              {submitting ? 'Enregistrement…' : initial ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </form>

        <style>{`
          .input {
            width: 100%;
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 6px 10px;
            color: var(--text-primary);
            font-size: 13px;
          }
          .input:focus { outline: 1px solid var(--accent-primary); border-color: var(--accent-primary); }
        `}</style>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide opacity-60">{label}</span>
      {children}
    </label>
  )
}
