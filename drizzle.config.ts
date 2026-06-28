import type { Config } from 'drizzle-kit'

export default {
  schema: './server/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: { url: process.env.RENTALS_DB_PATH ?? './data/rentals.sqlite' },
} satisfies Config
