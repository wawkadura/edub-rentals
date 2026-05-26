// Walid 2026-05-26: one-shot import of the Notion export at
// /home/ubuntu/data/Money Management/Libya Villa Business/ into
// edub-rentals-data/records.json. Idempotent: re-runs are safe as long
// as records.json doesn't already contain records (refuses if non-empty).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { writeDomain, readDomain, DATA_DIR } from '../server/lib/data-store.ts'
import type { Nature, Participant, Record as TxRecord, RecordsFile, Tag } from '../server/lib/types.ts'

const SOURCE = '/home/ubuntu/data/Money Management/Libya Villa Business/Business Records 2c924a2a36a380999359fd0bbba4ced3_all.csv'

function parseCsv(raw: string): string[][] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuote = false
  // Strip BOM
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1)
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i]
    if (inQuote) {
      if (c === '"' && raw[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        inQuote = false
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuote = true
      } else if (c === ',') {
        cur.push(field)
        field = ''
      } else if (c === '\n') {
        cur.push(field)
        rows.push(cur)
        cur = []
        field = ''
      } else if (c === '\r') {
        // ignore — handled with \n
      } else {
        field += c
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field)
    rows.push(cur)
  }
  return rows
}

function normalizeAmount(raw: string): number {
  const clean = raw.replace(/[^0-9.\-]/g, '')
  if (!clean) return 0
  return Number(clean)
}

function normalizeDate(raw: string): string {
  // "2025/12/13" or "2025/12/09   (GMT+1)" → "2025-12-13"
  const m = raw.match(/(\d{4})\/(\d{2})\/(\d{2})/)
  if (!m) return ''
  return `${m[1]}-${m[2]}-${m[3]}`
}

function stripNotionLink(raw: string): string {
  // "Walid (https://www.notion.so/...)" → "Walid"
  return raw.replace(/\s*\(https?:\/\/[^)]+\)\s*$/, '').trim()
}

const VALID_PARTICIPANTS: readonly string[] = ['Walid', 'Sofian', 'Client', 'Business']
function asParticipant(raw: string): Participant | null {
  const name = stripNotionLink(raw)
  return VALID_PARTICIPANTS.includes(name) ? (name as Participant) : null
}

const VALID_NATURES: readonly string[] = ['Transfer', 'Revenu', 'Expense']
function asNature(raw: string): Nature | null {
  const name = raw.trim()
  return VALID_NATURES.includes(name) ? (name as Nature) : null
}

const TAG_MAP: { [csv: string]: Tag } = {
  Investment: 'Investment',
  Rent: 'Rent',
  Maintenance: 'Maintenance',
  Distribution: 'Distribution',
  'Paying back': 'Paying back',
}
function asTag(raw: string): Tag | null {
  const name = raw.trim()
  return TAG_MAP[name] ?? null
}

async function main() {
  console.log(`[migrate] reading ${SOURCE}`)
  const raw = await fs.readFile(SOURCE, 'utf-8')
  const rows = parseCsv(raw).filter(r => r.some(c => c.length > 0))
  const [header, ...body] = rows

  const idx = {
    transaction: header.indexOf('Transaction'),
    amount: header.indexOf('Amount'),
    beneficiary: header.indexOf('Beneficiary'),
    date: header.indexOf('Date'),
    nature: header.indexOf('Nature'),
    paid_by: header.indexOf('Paid By'),
    tags: header.indexOf('Tags'),
    archive: header.indexOf('archive'),
    hide: header.indexOf('hide'),
  }

  console.log('[migrate] header indices:', idx)

  const out: TxRecord[] = []
  const skipped: string[] = []

  for (const row of body) {
    const name = row[idx.transaction]?.trim() ?? ''
    if (!name) continue
    if (name === 'CALCULATIONS') continue
    const amountRaw = row[idx.amount] ?? ''
    const amount = normalizeAmount(amountRaw)
    const date = normalizeDate(row[idx.date] ?? '')
    const paid_by = asParticipant(row[idx.paid_by] ?? '')
    const beneficiary = asParticipant(row[idx.beneficiary] ?? '')
    const nature = asNature(row[idx.nature] ?? '')
    const tagRaw = row[idx.tags] ?? ''
    const tags: Tag[] = []
    for (const t of tagRaw.split(',').map(s => s.trim())) {
      const tag = asTag(t)
      if (tag) tags.push(tag)
    }
    const archive = (row[idx.archive] ?? '').trim().toLowerCase() === 'yes'
    const hide = (row[idx.hide] ?? '').trim().toLowerCase() === 'yes'

    if (!amount || !date || !paid_by || !beneficiary || !nature) {
      skipped.push(`${name} (amount=${amountRaw}, date=${date}, paid_by=${paid_by}, beneficiary=${beneficiary}, nature=${nature})`)
      continue
    }

    out.push({
      id: randomUUID(),
      transaction: name,
      amount,
      date,
      paid_by,
      beneficiary,
      nature,
      tags,
      archive,
      hide,
    })
  }

  const existing = await readDomain<RecordsFile>('records')
  if (existing.records.length > 0) {
    console.error(`[migrate] REFUSING: records.json already has ${existing.records.length} entries. Wipe manually if you really want to re-import.`)
    process.exit(2)
  }

  await fs.mkdir(DATA_DIR, { recursive: true })
  const file: RecordsFile = { schema_version: 1, records: out }
  await writeDomain('records', file)

  console.log(`[migrate] imported ${out.length} records → ${path.join(DATA_DIR, 'records.json')}`)
  if (skipped.length > 0) {
    console.log(`[migrate] skipped ${skipped.length}:`)
    for (const s of skipped) console.log(`  - ${s}`)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
