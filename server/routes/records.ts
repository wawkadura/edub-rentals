import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { readDomain, writeDomain } from '../lib/data-store.ts'
import { appendEvent, diffRecord } from '../lib/action-log.ts'
import { computeSummary } from '../lib/summary.ts'
import {
  ALL_NATURES,
  ALL_PARTICIPANTS,
  ALL_TAGS,
} from '../lib/types.ts'
import type { Nature, Participant, Record as TxRecord, RecordsFile, Tag } from '../lib/types.ts'

function isNature(n: unknown): n is Nature {
  return typeof n === 'string' && (ALL_NATURES as readonly string[]).includes(n)
}
function isParticipant(p: unknown): p is Participant {
  return typeof p === 'string' && (ALL_PARTICIPANTS as readonly string[]).includes(p)
}
function isTag(t: unknown): t is Tag {
  return typeof t === 'string' && (ALL_TAGS as readonly string[]).includes(t)
}

function parseTags(input: unknown): Tag[] {
  if (!Array.isArray(input)) return []
  return input.filter(isTag)
}

function validateRecord(input: unknown, partial = false): Partial<TxRecord> | null {
  if (typeof input !== 'object' || input === null) return null
  const o = input as Record<string, unknown>
  const out: Partial<TxRecord> = {}

  if ('transaction' in o) {
    if (typeof o.transaction !== 'string' || !o.transaction.trim()) return null
    out.transaction = o.transaction.trim()
  } else if (!partial) return null

  if ('amount' in o) {
    const n = typeof o.amount === 'number' ? o.amount : Number(o.amount)
    if (!Number.isFinite(n)) return null
    out.amount = n
  } else if (!partial) return null

  if ('date' in o) {
    if (typeof o.date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(o.date)) return null
    out.date = o.date.slice(0, 10)
  } else if (!partial) return null

  if ('paid_by' in o) {
    if (!isParticipant(o.paid_by)) return null
    out.paid_by = o.paid_by
  } else if (!partial) return null

  if ('beneficiary' in o) {
    if (!isParticipant(o.beneficiary)) return null
    out.beneficiary = o.beneficiary
  } else if (!partial) return null

  if ('nature' in o) {
    if (!isNature(o.nature)) return null
    out.nature = o.nature
  } else if (!partial) return null

  if ('tags' in o) out.tags = parseTags(o.tags)
  else if (!partial) out.tags = []

  if ('notes' in o) out.notes = typeof o.notes === 'string' ? o.notes : ''
  if ('archive' in o) out.archive = Boolean(o.archive)
  if ('hide' in o) out.hide = Boolean(o.hide)

  return out
}

export async function recordsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/api/records', async () => {
    return readDomain<RecordsFile>('records')
  })

  fastify.get('/api/summary', async () => {
    const file = await readDomain<RecordsFile>('records')
    return computeSummary(file.records)
  })

  fastify.post('/api/records', async (req, reply) => {
    const validated = validateRecord(req.body, false)
    if (!validated) return reply.code(400).send({ error: 'Invalid record payload' })
    const file = await readDomain<RecordsFile>('records')
    const created: TxRecord = {
      id: randomUUID(),
      transaction: validated.transaction!,
      amount: validated.amount!,
      date: validated.date!,
      paid_by: validated.paid_by!,
      beneficiary: validated.beneficiary!,
      nature: validated.nature!,
      tags: validated.tags ?? [],
      notes: validated.notes ?? '',
      archive: validated.archive ?? false,
      hide: validated.hide ?? false,
    }
    file.records = [...file.records, created]
    await writeDomain('records', file)
    for (const d of diffRecord(null, created as unknown as Record<string, unknown>)) {
      await appendEvent({ type: 'create_row', target: d.target, before: d.before, after: d.after })
    }
    return created
  })

  fastify.put('/api/records/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const patch = validateRecord(req.body, true)
    if (!patch) return reply.code(400).send({ error: 'Invalid record payload' })
    const file = await readDomain<RecordsFile>('records')
    const idx = file.records.findIndex(r => r.id === id)
    if (idx === -1) return reply.code(404).send({ error: 'Record not found' })
    const before = file.records[idx]
    const updated: TxRecord = { ...before, ...patch }
    file.records = [...file.records.slice(0, idx), updated, ...file.records.slice(idx + 1)]
    await writeDomain('records', file)
    for (const d of diffRecord(before as unknown as Record<string, unknown>, updated as unknown as Record<string, unknown>)) {
      await appendEvent({ type: 'set_cell', target: d.target, before: d.before, after: d.after })
    }
    return updated
  })

  fastify.delete('/api/records/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const file = await readDomain<RecordsFile>('records')
    const target = file.records.find(r => r.id === id)
    if (!target) return reply.code(404).send({ error: 'Record not found' })
    file.records = file.records.filter(r => r.id !== id)
    await writeDomain('records', file)
    for (const d of diffRecord(target as unknown as Record<string, unknown>, null)) {
      await appendEvent({ type: 'delete_row', target: d.target, before: d.before, after: d.after })
    }
    return { ok: true }
  })
}
