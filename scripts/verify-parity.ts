// Round-trip check: read records.json + readDomain('records') and diff each
// field per record. Exit non-zero on any mismatch.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readDomain } from '../server/lib/data-store.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SOURCE_DIR = path.resolve(
  process.argv[2] === '--source' ? process.argv[3] : path.join(__dirname, '../../edub-rentals-data'),
)

function stable(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stable)
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(v as object).sort()) {
      out[k] = stable((v as Record<string, unknown>)[k])
    }
    return out
  }
  return v
}

function deepEqual(a: unknown, b: unknown): boolean {
  // Treat absent / null / default-scalar as equivalent: a JSON `notes: ""`
  // and a DB `notes: undefined` mean the same thing to the FE.
  if (a == null && b == null) return true
  if ((a === '' && b == null) || (a == null && b === '')) return true
  if ((a === false && b == null) || (a == null && b === false)) return true
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b))
}

async function main(): Promise<void> {
  console.log(`[verify] source: ${SOURCE_DIR}`)
  const json = JSON.parse(await fs.readFile(path.join(SOURCE_DIR, 'records.json'), 'utf-8'))
  const db = await readDomain<{ records: Array<Record<string, unknown>> }>('records')

  const mismatches: string[] = []
  if (json.records.length !== db.records.length) {
    mismatches.push(`count: json=${json.records.length} db=${db.records.length}`)
  }
  const dbById = new Map<string, Record<string, unknown>>()
  for (const r of db.records) dbById.set(String(r.id), r)

  const keys = ['transaction', 'amount', 'date', 'paid_by', 'beneficiary', 'nature', 'tags', 'notes', 'archive', 'hide']
  for (const jr of json.records as Array<Record<string, unknown>>) {
    const dr = dbById.get(String(jr.id))
    if (!dr) { mismatches.push(`missing in db: ${jr.id}`); continue }
    for (const k of keys) {
      if (!deepEqual(jr[k], dr[k])) {
        mismatches.push(`${jr.id} key=${k}: json=${JSON.stringify(jr[k])} db=${JSON.stringify(dr[k])}`)
      }
    }
  }

  console.log(`\n[verify] checked ${json.records.length} records, ${mismatches.length} mismatch(es)`)
  if (mismatches.length === 0) {
    console.log('[verify] ✓ ALL PARITY CHECKS PASS')
    process.exit(0)
  }
  for (const m of mismatches.slice(0, 50)) console.error(`  ${m}`)
  if (mismatches.length > 50) console.error(`  …and ${mismatches.length - 50} more.`)
  process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
