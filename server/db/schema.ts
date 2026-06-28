// SQLite schema for edub-rentals. One row table (record) + audit log
// (action_log). Mirrors the edub-finance pattern (better-sqlite3 + Drizzle
// + drizzle-kit migrations + WAL mode + foreign_keys on).

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'

export const record = sqliteTable(
  'record',
  {
    id: text('id').primaryKey(),
    transaction: text('transaction').notNull(),
    amount: real('amount').notNull(),
    date: text('date').notNull(),
    paidBy: text('paid_by').notNull(),
    beneficiary: text('beneficiary').notNull(),
    nature: text('nature').notNull(),
    tagsJson: text('tags_json').notNull().default('[]'),
    notes: text('notes'),
    archive: integer('archive', { mode: 'boolean' }).notNull().default(false),
    hide: integer('hide', { mode: 'boolean' }).notNull().default(false),
    orderIndex: integer('order_index').notNull().default(0),
  },
  (t) => ({
    dateIdx: index('record_date').on(t.date),
    natureIdx: index('record_nature').on(t.nature),
  }),
)

// Audit trail — same shape as edub-finance. Every record mutation emits one
// or more per-field events with the dotted target path
// `records.<id>.<field>` (or `records.<id>` for create/delete).
export const actionLog = sqliteTable(
  'action_log',
  {
    id: text('id').primaryKey(),
    ts: text('ts').notNull(),
    type: text('type').notNull(),
    target: text('target').notNull(),
    beforeJson: text('before_json'),
    afterJson: text('after_json'),
    undoes: text('undoes'),
    rowid: integer('rowid').notNull(),
  },
  (t) => ({
    tsIdx: index('action_log_ts').on(t.ts),
    rowidIdx: index('action_log_rowid').on(t.rowid),
    undoesIdx: index('action_log_undoes').on(t.undoes),
  }),
)
