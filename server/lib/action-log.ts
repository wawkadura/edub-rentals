// Audit log — table-backed. Same model as edub-finance: every record
// mutation emits one or more dotted-path events with before/after, and the
// /history route browses + reverts them.

import { desc, asc, eq } from 'drizzle-orm'
import { db, rawSqlite } from '../db/client.ts'
import { actionLog } from '../db/schema.ts'
import { readDomain, writeDomain } from './data-store.ts'

export interface ActionEvent {
  id: string
  ts: string
  type: 'set_cell' | 'create_row' | 'delete_row' | 'undo' | 'redo'
  target: string
  before: unknown
  after: unknown
  undoes?: string
}

function nextRowid(): number {
  const r = rawSqlite.prepare('SELECT COALESCE(MAX(rowid), 0) + 1 AS next FROM action_log').get() as { next: number }
  return r.next
}

function rowToEvent(r: typeof actionLog.$inferSelect): ActionEvent {
  return {
    id: r.id,
    ts: r.ts,
    type: r.type as ActionEvent['type'],
    target: r.target,
    before: r.beforeJson ? JSON.parse(r.beforeJson) : null,
    after: r.afterJson ? JSON.parse(r.afterJson) : null,
    undoes: r.undoes ?? undefined,
  }
}

export async function appendEvent(event: Omit<ActionEvent, 'id' | 'ts'>): Promise<ActionEvent> {
  const full: ActionEvent = {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    ...event,
  }
  db.insert(actionLog).values({
    id: full.id,
    ts: full.ts,
    type: full.type,
    target: full.target,
    beforeJson: full.before !== undefined ? JSON.stringify(full.before) : null,
    afterJson: full.after !== undefined ? JSON.stringify(full.after) : null,
    undoes: full.undoes ?? null,
    rowid: nextRowid(),
  }).run()
  return full
}

export interface LogFilter {
  limit?: number
  from?: string
  to?: string
}

export async function tail(n: number): Promise<ActionEvent[]> {
  // Most-recent-first.
  const rows = db.select().from(actionLog).orderBy(desc(actionLog.rowid)).limit(n).all()
  return rows.map(rowToEvent)
}

export async function listEvents(filter: LogFilter): Promise<ActionEvent[]> {
  const where: string[] = []
  const params: unknown[] = []
  if (filter.from) { where.push('ts >= ?'); params.push(filter.from) }
  if (filter.to) { where.push('ts <= ?'); params.push(filter.to) }
  const sql =
    'SELECT * FROM action_log' +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ' ORDER BY rowid DESC' +
    (filter.limit ? ` LIMIT ${Math.min(filter.limit, 1000)}` : '')
  const rows = rawSqlite.prepare(sql).all(...params) as Array<typeof actionLog.$inferSelect>
  return rows.map(rowToEvent)
}

export async function undoLast(): Promise<{ undone: string; undoneEvent: ActionEvent } | null> {
  const all = db.select().from(actionLog).orderBy(asc(actionLog.rowid)).all()
  const events = all.map(rowToEvent)
  const undoneIds = new Set(events.filter(e => e.undoes).map(e => e.undoes!))
  const candidate = [...events].reverse().find(e => e.type !== 'undo' && !undoneIds.has(e.id))
  if (!candidate) return null
  return applyRevert(candidate)
}

export async function revertEvent(eventId: string): Promise<{ undone: string; undoneEvent: ActionEvent } | null> {
  const target = db.select().from(actionLog).where(eq(actionLog.id, eventId)).get()
  if (!target) return null
  const undoOf = rawSqlite.prepare('SELECT id FROM action_log WHERE undoes = ?').get(eventId) as { id: string } | undefined
  if (undoOf) return null
  const candidate = rowToEvent(target)
  if (candidate.type === 'undo') return null
  return applyRevert(candidate)
}

// Apply candidate.before at candidate.target, then append an undo event
// linking back. Same surgical mechanics as the finance app.
async function applyRevert(candidate: ActionEvent): Promise<{ undone: string; undoneEvent: ActionEvent }> {
  const state = await readDomain<{ records: Array<Record<string, unknown>> }>('records')
  applyValueAtPath(state, candidate.target, candidate.before)
  await writeDomain('records', state)
  await appendEvent({
    type: 'undo',
    target: candidate.target,
    before: candidate.after,
    after: candidate.before,
    undoes: candidate.id,
  })
  return { undone: candidate.id, undoneEvent: candidate }
}

function applyValueAtPath(state: Record<string, unknown>, target: string, value: unknown): void {
  // target shape: "records.<id>.<field>" or "records.<id>" (create/delete).
  const parts = target.split('.')
  let current: unknown = state
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]
    if (Array.isArray(current)) {
      const found = (current as Array<Record<string, unknown>>).find(el => el.id === key)
      if (!found) throw new Error(`Could not find id=${key} in array`)
      current = found
    } else if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[key]
    }
  }
  const lastKey = parts[parts.length - 1]
  if (Array.isArray(current)) {
    const arr = current as Array<Record<string, unknown>>
    const idx = arr.findIndex(el => el.id === lastKey)
    if (value === null) { if (idx >= 0) arr.splice(idx, 1); return }
    if (value && typeof value === 'object') {
      if (idx >= 0) arr[idx] = value as Record<string, unknown>
      else arr.push(value as Record<string, unknown>)
      return
    }
    throw new Error(`Cannot set scalar at array path: ${target}`)
  }
  if (current && typeof current === 'object') {
    (current as Record<string, unknown>)[lastKey] = value
    return
  }
  throw new Error(`Cannot set value at path: ${target}`)
}

// Diff helpers used by the records route to emit per-field events on every
// write. Mirrors edub-finance/server/routes/data.ts.
export interface FieldChange {
  target: string
  before: unknown
  after: unknown
}

const RECORD_FIELDS = [
  'transaction', 'amount', 'date', 'paid_by', 'beneficiary',
  'nature', 'tags', 'notes', 'archive', 'hide',
] as const

export function diffRecord(oldRow: Record<string, unknown> | null, newRow: Record<string, unknown> | null): FieldChange[] {
  if (!oldRow && newRow) {
    return [{ target: `records.${newRow.id}`, before: null, after: newRow }]
  }
  if (oldRow && !newRow) {
    return [{ target: `records.${oldRow.id}`, before: oldRow, after: null }]
  }
  if (!oldRow || !newRow) return []
  const diffs: FieldChange[] = []
  for (const k of RECORD_FIELDS) {
    if (JSON.stringify(oldRow[k]) !== JSON.stringify(newRow[k])) {
      diffs.push({
        target: `records.${newRow.id}.${k}`,
        before: oldRow[k] ?? null,
        after: newRow[k] ?? null,
      })
    }
  }
  return diffs
}
