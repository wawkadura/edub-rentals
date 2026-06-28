// Apply Drizzle migrations idempotently on boot.

import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { db } from './client.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export function runMigrations(): void {
  drizzleMigrate(db, { migrationsFolder: path.resolve(__dirname, '../../drizzle') })
}
