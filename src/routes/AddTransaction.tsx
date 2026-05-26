import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { useRecords } from '../stores/records'
import { ALL_NATURES, ALL_PARTICIPANTS, ALL_TAGS } from '../lib/types'
import type { Nature, Participant, Tag } from '../lib/types'

const NATURE_DEFAULT_TAG: Record<Nature, Tag | null> = {
  Transfer: null,
  Revenu: 'Rent',
  Expense: 'Maintenance',
}

function deriveTitle(nature: Nature, from: Participant, to: Participant, date: string): string {
  const monthName = new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  if (nature === 'Revenu') return `Loyer · ${monthName}`
  if (nature === 'Expense') return `Dépense · ${monthName}`
  if (from === to) return `Mouvement interne · ${monthName}`
  return `${from} → ${to} · ${monthName}`
}

export default function AddTransaction() {
  const navigate = useNavigate()
  const { add } = useRecords()
  const [amount, setAmount] = useState<string>('0')
  const [nature, setNature] = useState<Nature>('Transfer')
  const [from, setFrom] = useState<Participant>('Client')
  const [to, setTo] = useState<Participant>('Business')
  const [tags, setTags] = useState<Tag[]>([])
  const [titleOverride, setTitleOverride] = useState<string>('')
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const numericAmount = Number(amount.replace(/[^0-9.\-]/g, '')) || 0
  const derivedTitle = deriveTitle(nature, from, to, date)
  const title = titleOverride.trim() || derivedTitle

  const effectiveTags = useMemo(() => {
    if (tags.length > 0) return tags
    const def = NATURE_DEFAULT_TAG[nature]
    return def ? [def] : []
  }, [tags, nature])

  const isValid = numericAmount > 0 && from && to && nature && title.trim().length > 0

  function selectNature(n: Nature) {
    setNature(n)
    if (n === 'Revenu') {
      setFrom('Client')
      setTo('Business')
    } else if (n === 'Expense') {
      setFrom('Business')
      setTo('Business')
    } else {
      if (from === to) setTo(to === 'Business' ? 'Walid' : 'Business')
    }
  }

  function toggleTag(t: Tag) {
    setTags(prev => (prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]))
  }

  function appendDigit(d: string) {
    setAmount(prev => {
      if (prev === '0' && d !== '.') return d
      if (d === '.' && prev.includes('.')) return prev
      if (prev.length >= 12) return prev
      return prev + d
    })
  }
  function backspace() {
    setAmount(prev => (prev.length <= 1 ? '0' : prev.slice(0, -1)))
  }
  function clearAmount() {
    setAmount('0')
  }

  async function submit() {
    if (!isValid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await add({
        transaction: title.trim(),
        amount: numericAmount,
        date,
        paid_by: from,
        beneficiary: to,
        nature,
        tags: effectiveTags,
      })
      navigate('/transactions')
    } catch (e) {
      setError((e as Error).message)
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5">
      {/* Big amount */}
      <section
        className="flex min-h-[26vh] flex-col items-center justify-center rounded-3xl p-6"
        style={{
          background:
            'linear-gradient(135deg, var(--elevated) 0%, color-mix(in srgb, var(--accent-primary) 6%, var(--elevated)) 100%)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div
          className="text-center text-5xl font-semibold tracking-tight md:text-6xl"
          style={{ color: numericAmount > 0 ? 'var(--text-primary)' : 'var(--neutral-spend)' }}
        >
          {Number(numericAmount).toLocaleString('fr-FR')}
        </div>
        <div className="mt-1 text-xs uppercase tracking-wider opacity-60">LYD</div>
      </section>

      {/* Keypad */}
      <Keypad onDigit={appendDigit} onBackspace={backspace} onClear={clearAmount} />

      {/* Nature */}
      <SectionLabel>Type</SectionLabel>
      <div className="grid grid-cols-3 gap-2">
        {ALL_NATURES.map(n => {
          const active = nature === n
          return (
            <button
              key={n}
              onClick={() => selectNature(n)}
              className="rounded-xl border py-3 text-sm font-medium transition"
              style={{
                borderColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
                background: active ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' : 'transparent',
                color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
              }}
            >
              {n === 'Transfer' ? 'Transfert' : n === 'Revenu' ? 'Revenu' : 'Dépense'}
            </button>
          )
        })}
      </div>

      {/* From → To */}
      <SectionLabel>De → Vers</SectionLabel>
      <div className="flex items-center gap-2">
        <ParticipantSelect value={from} onChange={setFrom} />
        <ArrowRight size={16} className="opacity-50" />
        <ParticipantSelect value={to} onChange={setTo} />
      </div>

      {/* Tags */}
      <SectionLabel>
        Tags <span className="opacity-50">(optionnel)</span>
      </SectionLabel>
      <div className="flex flex-wrap gap-2">
        {ALL_TAGS.map(t => {
          const active = effectiveTags.includes(t)
          const isImplicit = tags.length === 0 && NATURE_DEFAULT_TAG[nature] === t
          return (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className="rounded-full border px-3 py-1 text-xs"
              style={{
                borderColor: active ? 'var(--accent-primary)' : 'var(--border-color)',
                color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
                opacity: active && !isImplicit ? 1 : active ? 0.9 : 0.7,
                fontStyle: active && isImplicit ? 'italic' : 'normal',
              }}
            >
              {t}
            </button>
          )
        })}
      </div>

      {/* Title + date */}
      <SectionLabel>Libellé</SectionLabel>
      <input
        className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        value={titleOverride}
        placeholder={derivedTitle}
        onChange={e => setTitleOverride(e.target.value)}
      />

      <SectionLabel>Date</SectionLabel>
      <input
        type="date"
        className="w-full rounded-xl border bg-transparent px-3 py-2.5 text-sm"
        style={{ borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
        value={date}
        onChange={e => setDate(e.target.value)}
      />

      {error ? (
        <div className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--negative)', color: 'var(--negative)' }}>
          {error}
        </div>
      ) : null}

      <button
        onClick={submit}
        disabled={!isValid || submitting}
        className="sticky bottom-2 mt-3 flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold transition disabled:opacity-50"
        style={{
          background: 'var(--accent-primary)',
          color: '#111418',
          boxShadow: '0 6px 20px rgba(245,200,66,0.25)',
        }}
      >
        <Check size={18} />
        {submitting ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] uppercase tracking-wider opacity-60">{children}</div>
}

function ParticipantSelect({ value, onChange }: { value: Participant; onChange: (p: Participant) => void }) {
  return (
    <div className="flex flex-1 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
      <select
        value={value}
        onChange={e => onChange(e.target.value as Participant)}
        className="w-full appearance-none bg-transparent px-3 py-2.5 text-sm"
        style={{ color: 'var(--text-primary)' }}
      >
        {ALL_PARTICIPANTS.map(p => (
          <option key={p} value={p} style={{ background: 'var(--elevated)' }}>
            {p}
          </option>
        ))}
      </select>
    </div>
  )
}

function Keypad({
  onDigit,
  onBackspace,
  onClear,
}: {
  onDigit: (d: string) => void
  onBackspace: () => void
  onClear: () => void
}) {
  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫']
  return (
    <div className="grid grid-cols-3 gap-2 md:hidden">
      {KEYS.map(k => (
        <button
          key={k}
          onClick={() => (k === 'C' ? onClear() : k === '⌫' ? onBackspace() : onDigit(k))}
          className="rounded-xl border py-3 text-lg font-medium transition active:scale-95"
          style={{
            borderColor: 'var(--border-color)',
            color: k === 'C' ? 'var(--negative)' : 'var(--text-primary)',
            background: 'var(--elevated)',
          }}
        >
          {k}
        </button>
      ))}
    </div>
  )
}
