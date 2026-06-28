// Domain data store — same public API as the original JSON-file impl, but
// backed by SQLite under the hood. readDomain('records') reconstructs the
// legacy RecordsFile shape; writeDomain transactionally replaces the row set.
//
// Kept the same DATA_DIR export for any legacy module that still imports it
// (no live consumer, but cheap to keep).

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { asc } from 'drizzle-orm'
import { db, rawSqlite } from '../db/client.ts'
import { record } from '../db/schema.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const DATA_DIR = path.resolve(__dirname, '../../data')

const FILES = { records: 'records.json' } as const
export type Domain = keyof typeof FILES

function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (s == null) return fallback
  try { return JSON.parse(s) as T } catch { return fallback }
}

interface RecordsPayload {
  schema_version: 1
  records: unknown[]
}

function readRecords(): RecordsPayload {
  const rows = db.select().from(record).orderBy(asc(record.orderIndex)).all()
  return {
    schema_version: 1,
    records: rows.map(r => ({
      id: r.id,
      transaction: r.transaction,
      amount: r.amount,
      date: r.date,
      paid_by: r.paidBy,
      beneficiary: r.beneficiary,
      nature: r.nature,
      tags: parseJson<string[]>(r.tagsJson, []),
      // Always emit notes/archive/hide so the wire shape matches the legacy
      // JSON exactly (the FE checks `.notes ?? ''` etc. — both work, but
      // keeping the shape literal avoids surprises for any consumer that
      // hasn't yet been audited).
      notes: r.notes ?? '',
      archive: r.archive,
      hide: r.hide,
    })),
  }
}

type Obj = Record<string, unknown>

function writeRecords(body: Obj): void {
  const rows = (body.records ?? []) as Obj[]
  rawSqlite.exec('BEGIN')
  try {
    db.delete(record).run()
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      db.insert(record).values({
        id: String(r.id),
        transaction: String(r.transaction ?? ''),
        amount: Number(r.amount ?? 0),
        date: String(r.date ?? ''),
        paidBy: String(r.paid_by ?? ''),
        beneficiary: String(r.beneficiary ?? ''),
        nature: String(r.nature ?? ''),
        tagsJson: JSON.stringify(r.tags ?? []),
        notes: r.notes != null ? String(r.notes) : null,
        archive: Boolean(r.archive),
        hide: Boolean(r.hide),
        orderIndex: i,
      }).run()
    }
    rawSqlite.exec('COMMIT')
  } catch (e) {
    rawSqlite.exec('ROLLBACK')
    throw e
  }
}

export async function readDomain<T = unknown>(domain: Domain): Promise<T> {
  if (domain === 'records') return readRecords() as T
  throw new Error(`Unknown domain: ${domain}`)
}

export async function writeDomain(domain: Domain, data: unknown): Promise<void> {
  const body = data as Obj
  if (domain === 'records') { writeRecords(body); return }
  throw new Error(`Unknown domain: ${domain}`)
}
