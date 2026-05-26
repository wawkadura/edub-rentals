import Fastify from 'fastify'
import { recordsRoutes } from './routes/records.ts'
import { DATA_DIR } from './lib/data-store.ts'

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

const port = 3007
await fastify.listen({ port, host: '127.0.0.1' })
console.log(`[edub-rentals] API listening on http://localhost:${port}`)
console.log(`[edub-rentals] data dir: ${DATA_DIR}`)
