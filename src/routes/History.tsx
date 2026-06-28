// Historique des modifications — same UX as edub-finance/src/routes/History.tsx.
// Each record mutation appears as a per-field event (records.<id>.<field>);
// click "Annuler" to revert that specific change.

import { useEffect, useMemo, useState } from 'react'
import { RotateCcw, RefreshCw, Filter, AlertCircle } from 'lucide-react'
import { fetchLog, revertLogEvent, type ActionEvent } from '../lib/api'
import { useRecords } from '../stores/records'

type RangeFilter = '24h' | '7d' | '30d' | 'all'

const RANGE_LABELS: Record<RangeFilter, string> = {
  '24h': '24 h',
  '7d': '7 jours',
  '30d': '30 jours',
  all: 'Tout',
}

export default function History() {
  const [events, setEvents] = useState<ActionEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<RangeFilter>('7d')
  const [showUndos, setShowUndos] = useState(false)
  const [pendingRevert, setPendingRevert] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  function buildFilters(): { from?: string; to?: string } {
    if (range === 'all') return {}
    const ms = range === '24h' ? 24 * 3600e3 : range === '7d' ? 7 * 86400e3 : 30 * 86400e3
    return { from: new Date(Date.now() - ms).toISOString() }
  }

  async function reload(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchLog(500, buildFilters())
      setEvents(data) // server returns newest-first
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload().catch(() => { /* state already set */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  const undoneIds = useMemo(() => {
    const s = new Set<string>()
    for (const e of events) if (e.undoes) s.add(e.undoes)
    return s
  }, [events])

  const visible = useMemo(
    () => events.filter(e => showUndos || e.type !== 'undo'),
    [events, showUndos],
  )

  async function handleRevert(eventId: string): Promise<void> {
    setPendingRevert(eventId)
    try {
      await revertLogEvent(eventId)
      setFlash({ kind: 'ok', text: 'Modification annulée' })
      // Refresh records too so the UI reflects the revert.
      await useRecords.getState().refresh()
      await reload()
      setTimeout(() => setFlash(null), 2000)
    } catch (e) {
      setFlash({ kind: 'err', text: (e as Error).message })
      setTimeout(() => setFlash(null), 4000)
    } finally {
      setPendingRevert(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
          Historique des modifications
        </h2>
        <button
          onClick={() => reload().catch(() => {})}
          className="rounded-md px-3 py-1.5 text-sm hover:bg-white/5"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RefreshCw size={14} /> Recharger
        </button>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: 'var(--neutral-spend)' }}>
        Chaque modification de cellule est tracée ici, plus récente en haut.
        Clique "Annuler" pour défaire une modif passée — sa valeur d'origine
        sera restaurée.
      </p>

      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: 'var(--surface)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Filter size={14} style={{ color: 'var(--neutral-spend)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--neutral-spend)' }}>Période:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {(Object.entries(RANGE_LABELS) as Array<[RangeFilter, string]>).map(([k, lbl]) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid',
                  borderColor: range === k ? 'var(--accent-primary)' : 'var(--border-color)',
                  background: range === k ? 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' : 'transparent',
                  color: range === k ? 'var(--accent-primary)' : 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--neutral-spend)', cursor: 'pointer' }}>
          <input type="checkbox" checked={showUndos} onChange={e => setShowUndos(e.target.checked)} />
          Afficher les annulations
        </label>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--neutral-spend)' }}>
          {visible.length} entrée{visible.length > 1 ? 's' : ''}
        </span>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--negative)', fontSize: 13, padding: 12, borderRadius: 12, background: 'var(--surface)' }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, borderRadius: 12, background: 'var(--surface)', fontSize: 13, color: 'var(--neutral-spend)' }}>
          Chargement…
        </div>
      ) : visible.length === 0 ? (
        <div style={{ padding: 24, borderRadius: 12, background: 'var(--surface)', fontSize: 13, color: 'var(--neutral-spend)' }}>
          Aucune modification dans cette plage.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visible.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              undone={undoneIds.has(ev.id)}
              pending={pendingRevert === ev.id}
              onRevert={() => handleRevert(ev.id)}
            />
          ))}
        </div>
      )}

      {flash && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(72px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: flash.kind === 'ok' ? 'var(--positive, #22c55e)' : 'var(--negative, #ef4444)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 200,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {flash.text}
        </div>
      )}
    </div>
  )
}

function EventCard({
  event,
  undone,
  pending,
  onRevert,
}: {
  event: ActionEvent
  undone: boolean
  pending: boolean
  onRevert: () => void
}) {
  const desc = describeEvent(event)
  const isUndo = event.type === 'undo'
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        background: 'var(--surface)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        opacity: undone || isUndo ? 0.55 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {desc.title}
          </span>
          {undone && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999,
              background: 'color-mix(in srgb, var(--neutral-spend) 16%, transparent)',
              color: 'var(--neutral-spend)', fontStyle: 'italic',
            }}>
              annulée
            </span>
          )}
          {isUndo && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 999,
              background: 'color-mix(in srgb, var(--neutral-spend) 16%, transparent)',
              color: 'var(--neutral-spend)',
            }}>
              annulation
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12, color: 'var(--neutral-spend)' }}>
          <span>{formatRelative(event.ts)}</span>
          {desc.detail && (
            <>
              <span>·</span>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11 }}>{desc.detail}</span>
            </>
          )}
        </div>
      </div>
      {!isUndo && !undone && (
        <button
          disabled={pending}
          onClick={onRevert}
          className="rounded-md px-3 py-1.5 text-sm hover:bg-white/5 disabled:opacity-50"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Restaurer la valeur d'origine"
        >
          <RotateCcw size={13} />
          {pending ? '…' : 'Annuler'}
        </button>
      )}
    </div>
  )
}

interface Desc { title: string; detail: string | null }

function describeEvent(event: ActionEvent): Desc {
  // target: "records.<id>" or "records.<id>.<field>"
  const parts = event.target.split('.')
  if (parts[0] !== 'records') return { title: event.target, detail: null }
  const id = parts[1] ?? ''
  const shortId = id.slice(0, 8)
  if (parts.length === 2) {
    const action = event.after === null ? 'supprimée' : event.before === null ? 'créée' : 'modifiée'
    const obj = (event.after ?? event.before) as { transaction?: string } | null
    const label = obj?.transaction ?? shortId
    return { title: `Transaction ${label} (${action})`, detail: null }
  }
  const field = parts[2] ?? ''
  return {
    title: `Transaction ${shortId} · ${field}`,
    detail: `${formatScalar(event.before)} → ${formatScalar(event.after)}`,
  }
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return '∅'
  if (typeof v === 'number') return Number.isInteger(v) ? v.toLocaleString('fr-FR') : v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
  if (typeof v === 'string') return v.length > 30 ? v.slice(0, 27) + '…' : v
  if (typeof v === 'boolean') return v ? 'oui' : 'non'
  if (Array.isArray(v)) return `[${v.length}]`
  return '{…}'
}

function formatRelative(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `il y a ${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `il y a ${d} j`
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}
