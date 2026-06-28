import Fastify from 'fastify'
import { runMigrations } from './db/migrate.ts'
import { DB_PATH } from './db/client.ts'
import { recordsRoutes } from './routes/records.ts'
import { logRoutes } from './routes/log.ts'

// Apply Drizzle migrations on boot — schema appears + DB file created on
// first run, idempotent on subsequent runs.
runMigrations()

const fastify = Fastify({ logger: false, bodyLimit: 256 * 1024 })

fastify.addHook('onRequest', async (req, reply) => {
  reply.header('Access-Control-Allow-Origin', 'http://localhost:3006')
  reply.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return reply.code(204).send()
  }
})

fastify.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
  try {
    done(null, JSON.parse(body as string))
  } catch (e) {
    done(e as Error)
  }
})

await recordsRoutes(fastify)
await logRoutes(fastify)

const port = 3007
await fastify.listen({ port, host: '127.0.0.1' })
console.log(`[edub-rentals] API listening on http://localhost:${port}`)
console.log(`[edub-rentals] sqlite db: ${DB_PATH}`)
