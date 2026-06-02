import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Trash2 } from 'lucide-react'
import { ALL_PARTICIPANTS } from '../lib/types'
import type { Nature, Participant, Tag, Record as TxRecord } from '../lib/types'
import { formatLYD } from '../lib/format'

export type UiKind = 'expense' | 'transfer'

export interface FlowValues {
  amount: number
  kind: UiKind
  paid_by: Participant
  beneficiary: Participant
  label: string
  date: string
  notes: string
}

export interface TransactionFlowProps {
  initial?: TxRecord
  submitLabel: string
  onSubmit: (values: {
    transaction: string
    amount: number
    date: string
    paid_by: Participant
    beneficiary: Participant
    nature: Nature
    tags: Tag[]
    notes: string
  }) => Promise<void>
  onDelete?: () => Promise<void>
}

function recordToUiKind(r: TxRecord): UiKind {
  return r.nature === 'Expense' ? 'expense' : 'transfer'
}

export default function TransactionFlow({ initial, submitLabel, onSubmit, onDelete }: TransactionFlowProps) {
  const [draft, setDraft] = useState<FlowValues | null>(() =>
    initial
      ? {
          amount: initial.amount,
          kind: recordToUiKind(initial),
          paid_by: initial.paid_by,
          beneficiary: initial.beneficiary,
          label: initial.transaction,
          date: initial.date,
          notes: initial.notes ?? '',
        }
      : null,
  )

  return draft ? (
    <RecapStep
      draft={draft}
      submitLabel={submitLabel}
      onBack={() => setDraft(null)}
      onSubmit={onSubmit}
      onDelete={onDelete}
    />
  ) : (
    <FlowStep initial={initial} onNext={setDraft} />
  )
}

// ─────────────────────────────────────────── Step 1
function FlowStep({
  initial,
  onNext,
}: {
  initial?: TxRecord
  onNext: (d: FlowValues) => void
}) {
  const [amount, setAmount] = useState<string>(() => (initial ? String(initial.amount) : ''))
  const [amountConfirmed, setAmountConfirmed] = useState<boolean>(!!initial)
  const [kind, setKind] = useState<UiKind | null>(() => (initial ? recordToUiKind(initial) : null))
  const [paidBy, setPaidBy] = useState<Participant | null>(() => initial?.paid_by ?? null)
  const [beneficiary, setBeneficiary] = useState<Participant | null>(() => initial?.beneficiary ?? null)

  const numericAmount = Number(amount) || 0

  function selectKind(k: UiKind) {
    setKind(k)
    if (k === 'expense') {
      setBeneficiary('Business')
      if (paidBy === 'Client') setPaidBy(null)
    }
  }

  const isValid =
    numericAmount > 0 && kind !== null && paidBy !== null && beneficiary !== null

  function next() {
    if (!isValid) return
    const monthName = new Date(
      new Date().toISOString().slice(0, 10) + 'T12:00:00',
    ).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const defaultLabel =
      initial?.transaction ??
      (kind === 'expense'
        ? `Dépense · ${monthName}`
        : paidBy === 'Client'
          ? `Loyer · ${monthName}`
          : beneficiary === 'Client'
            ? `Remboursement client · ${monthName}`
            : `${paidBy} → ${beneficiary} · ${monthName}`)
    onNext({
      amount: numericAmount,
      kind: kind!,
      paid_by: paidBy!,
      beneficiary: beneficiary!,
      label: defaultLabel,
      date: initial?.date ?? new Date().toISOString().slice(0, 10),
      notes: initial?.notes ?? '',
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8">
      <AmountField
        amount={amount}
        onChange={setAmount}
        onCommit={() => {
          if (numericAmount > 0) setAmountConfirmed(true)
        }}
        confirmed={amountConfirmed}
      />

      {amountConfirmed && numericAmount > 0 ? (
        <div className="grid grid-cols-2 gap-2 fade-in">
          <BigChoice active={kind === 'transfer'} onClick={() => selectKind('transfer')} label="Transfert" />
          <BigChoice active={kind === 'expense'} onClick={() => selectKind('expense')} label="Dépense" />
        </div>
      ) : null}

      {amountConfirmed && kind === 'expense' ? (
        <div className="fade-in">
          <ParticipantTiles label="Qui paye ?" value={paidBy} onChange={setPaidBy} exclude={['Client']} />
        </div>
      ) : null}

      {amountConfirmed && kind === 'transfer' ? (
        <div className="flex flex-col gap-4 fade-in">
          <ParticipantTiles label="De qui" value={paidBy} onChange={setPaidBy} />
          <ParticipantTiles label="Vers qui" value={beneficiary} onChange={setBeneficiary} />
        </div>
      ) : null}

      {isValid ? (
        <button
          onClick={next}
          className="sticky bottom-2 flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold transition fade-in"
          style={{
            background: 'var(--accent-primary)',
            color: '#111418',
            boxShadow: '0 6px 20px rgba(245,200,66,0.25)',
          }}
        >
          Suivant
          <ArrowRight size={18} />
        </button>
      ) : null}
    </div>
  )
}

function AmountField({
  amount,
  onChange,
  onCommit,
  confirmed,
}: {
  amount: string
  onChange: (next: string) => void
  onCommit: () => void
  confirmed: boolean
}) {
  const numericAmount = Number(amount) || 0

  return (
    <label
      className="flex min-h-[40vh] cursor-text flex-col items-center justify-center rounded-3xl px-6 py-10 text-center"
      style={{
        background:
          'linear-gradient(135deg, var(--elevated) 0%, color-mix(in srgb, var(--accent-primary) 6%, var(--elevated)) 100%)',
        border: '1px solid var(--border-color)',
      }}
    >
      <input
        type="text"
        inputMode="numeric"
        autoFocus={!confirmed}
        enterKeyHint="done"
        value={amount}
        onChange={e => {
          const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 12)
          onChange(cleaned)
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onCommit()
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        onBlur={() => {
          if (numericAmount > 0) onCommit()
        }}
        className="w-full bg-transparent text-center text-7xl font-semibold tracking-tight outline-none md:text-8xl"
        style={{
          color: numericAmount > 0 ? 'var(--text-primary)' : 'var(--neutral-spend)',
          caretColor: 'var(--accent-primary)',
        }}
        placeholder="0"
        aria-label="Montant"
      />
      <div className="mt-3 text-sm uppercase tracking-[0.2em] opacity-60">LYD</div>
      {!confirmed && numericAmount === 0 ? (
        <div className="mt-6 text-xs opacity-50">Tape un montant puis valide ↵</div>
      ) : null}
      {!confirmed && numericAmount > 0 ? (
        <div className="mt-6 text-xs opacity-50">Touche entrée pour valider</div>
      ) : null}
    </label>
  )
}

function BigChoice({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border py-5 text-base font-medium transition"
      style={{
        borderColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
        background: active ? 'color-mix(in srgb, var(--accent-primary) 14%, transparent)' : 'transparent',
        color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
      }}
    >
      {label}
    </button>
  )
}

function ParticipantTiles({
  label,
  value,
  onChange,
  exclude,
}: {
  label: string
  value: Participant | null
  onChange: (p: Participant) => void
  exclude?: Participant[]
}) {
  const options = exclude ? ALL_PARTICIPANTS.filter(p => !exclude.includes(p)) : ALL_PARTICIPANTS
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-wider opacity-60">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {options.map(p => {
          const active = value === p
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className="rounded-xl border py-3 text-sm font-medium transition"
              style={{
                borderColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
                background: active ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' : 'transparent',
                color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
              }}
            >
              {p}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────── Step 2
function RecapStep({
  draft,
  submitLabel,
  onBack,
  onSubmit,
  onDelete,
}: {
  draft: FlowValues
  submitLabel: string
  onBack: () => void
  onSubmit: TransactionFlowProps['onSubmit']
  onDelete?: () => Promise<void>
}) {
  const [label, setLabel] = useState<string>(draft.label)
  const [date, setDate] = useState<string>(draft.date)
  const [notes, setNotes] = useState<string>(draft.notes)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nature: Nature = useMemo(() => {
    if (draft.kind === 'expense') return 'Expense'
    if (draft.paid_by === 'Client') return 'Revenu'
    return 'Transfer'
  }, [draft])

  const tags: Tag[] = useMemo(() => {
    if (draft.kind === 'expense') return ['Maintenance']
    if (draft.paid_by === 'Client') return ['Rent']
    if (draft.paid_by === 'Business' && draft.beneficiary !== 'Business') return ['Distribution']
    if (draft.beneficiary === 'Business' && draft.paid_by !== 'Business') return ['Investment']
    return []
  }, [draft])

  async function submit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit({
        transaction: label.trim() || draft.label,
        amount: draft.amount,
        date,
        paid_by: draft.paid_by,
        beneficiary: draft.beneficiary,
        nature,
        tags,
        notes: notes.trim(),
      })
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  async function del() {
    if (!onDelete || submitting) return
    if (!confirm('Supprimer cette transaction ?')) return
    setSubmitting(true)
    try {
      await onDelete()
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      <button
        onClick={onBack}
        className="flex w-fit items-center gap-1 rounded-full border px-3 py-1 text-xs opacity-80"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <ArrowLeft size={12} />
        Modifier
      </button>

      <section
        className="rounded-3xl border p-6"
        style={{
          background:
            'linear-gradient(135deg, var(--elevated) 0%, color-mix(in srgb, var(--accent-primary) 8%, var(--elevated)) 100%)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="mb-5 text-center text-[11px] uppercase tracking-wider opacity-60">
          {draft.kind === 'expense' ? 'Dépense' : 'Transfert'}
        </div>

        <div className="flex items-center justify-between gap-3">
          <ParticipantBubble name={draft.paid_by} sublabel="De" />
          <div className="flex flex-1 flex-col items-center">
            <ArrowRight size={20} className="opacity-50" />
          </div>
          <ParticipantBubble name={draft.beneficiary} sublabel="Vers" />
        </div>

        <div className="mt-5 text-center">
          <div
            className="text-3xl font-semibold tracking-tight md:text-4xl"
            style={{
              color:
                draft.kind === 'expense'
                  ? 'var(--negative)'
                  : draft.paid_by === 'Client'
                    ? 'var(--positive)'
                    : 'var(--text-primary)',
            }}
          >
            {formatLYD(draft.amount)}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-wider opacity-60">Libellé</div>
        <input
          className="w-full rounded-xl border bg-transparent px-3 py-3 text-sm"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-wider opacity-60">Date</div>
        <input
          type="date"
          className="w-full rounded-xl border bg-transparent px-3 py-3 text-sm"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-[11px] uppercase tracking-wider opacity-60">Note (optionnel)</div>
        <textarea
          rows={3}
          placeholder="Détails, contexte, calculs…"
          className="w-full resize-none rounded-xl border bg-transparent px-3 py-3 text-sm"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--negative)', color: 'var(--negative)' }}>
          {error}
        </div>
      ) : null}

      <button
        onClick={submit}
        disabled={submitting}
        className="sticky bottom-2 mt-3 flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold transition disabled:opacity-50"
        style={{
          background: 'var(--accent-primary)',
          color: '#111418',
          boxShadow: '0 6px 20px rgba(245,200,66,0.25)',
        }}
      >
        <Check size={18} />
        {submitting ? 'Enregistrement…' : submitLabel}
      </button>

      {onDelete ? (
        <button
          onClick={del}
          disabled={submitting}
          className="flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm transition disabled:opacity-50"
          style={{ borderColor: 'var(--border-color)', color: 'var(--negative)' }}
        >
          <Trash2 size={14} />
          Supprimer
        </button>
      ) : null}
    </div>
  )
}

function ParticipantBubble({ name, sublabel }: { name: Participant; sublabel: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full border text-sm font-semibold"
        style={{
          borderColor: 'var(--accent-primary)',
          background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
          color: 'var(--accent-primary)',
        }}
      >
        {name === 'Business' ? 'B' : name === 'Client' ? 'C' : name[0]}
      </div>
      <div className="text-[10px] uppercase tracking-wider opacity-60">{sublabel}</div>
      <div className="text-xs font-medium">{name}</div>
    </div>
  )
}
