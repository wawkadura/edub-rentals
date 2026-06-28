// Shared SQLite connection. WAL + foreign_keys → online-safe for the
// `sqlite3 .backup` invocation in edub-backup, same conventions as
// edub-finance (see ../../README.md → "Où vit la data").

import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as schema from './schema.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const DB_PATH =
  process.env.RENTALS_DB_PATH ?? path.resolve(__dirname, '../../data/rentals.sqlite')

declare global {
  // eslint-disable-next-line no-var
  var __rentalsSqlite: Database.Database | undefined
}

const sqlite = globalThis.__rentalsSqlite ?? new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('synchronous = NORMAL')

if (process.env.NODE_ENV !== 'production') {
  globalThis.__rentalsSqlite = sqlite
}

export const db: BetterSQLite3Database<typeof schema> = drizzle(sqlite, { schema })
export { schema }
export const rawSqlite = sqlite
