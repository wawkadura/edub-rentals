// One-shot import: read /home/ubuntu/apps/edub-rentals-data/records.json
// → populate SQLite. Idempotent (delete + insert).
//
// Usage:
//   npx tsx scripts/migrate-json-to-sqlite.ts [--source /path]

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runMigrations } from '../server/db/migrate.ts'
import { rawSqlite } from '../server/db/client.ts'
import { writeDomain } from '../server/lib/data-store.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const args = new Map<string, string>()
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i]
  if (a.startsWith('--')) args.set(a.slice(2), process.argv[++i] ?? '')
}

const SOURCE_DIR = path.resolve(
  args.get('source') ?? path.join(__dirname, '../../edub-rentals-data'),
)

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}

async function main(): Promise<void> {
  console.log(`[migrate] source: ${SOURCE_DIR}`)
  if (!(await exists(SOURCE_DIR))) {
    console.error(`[migrate] source dir not found: ${SOURCE_DIR}`)
    process.exit(1)
  }

  console.log('[migrate] running schema migrations…')
  runMigrations()

  console.log('[migrate] clearing existing tables…')
  rawSqlite.exec('BEGIN')
  try {
    rawSqlite.exec('DELETE FROM record')
    rawSqlite.exec('DELETE FROM action_log')
    rawSqlite.exec('COMMIT')
  } catch (e) {
    rawSqlite.exec('ROLLBACK')
    throw e
  }

  const recordsPath = path.join(SOURCE_DIR, 'records.json')
  const raw = await fs.readFile(recordsPath, 'utf-8')
  const body = JSON.parse(raw) as Record<string, unknown>
  await writeDomain('records', body)
  console.log(`[migrate] records.json (${Array.isArray(body.records) ? body.records.length : 0} records)`)

  // Summary
  const r = rawSqlite.prepare('SELECT COUNT(*) AS n FROM record').get() as { n: number }
  console.log('\n[migrate] === summary ===')
  console.log(`  record      ${r.n}`)
  console.log(`  action_log  0  (will accumulate going forward)`)
  console.log('[migrate] done.')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
