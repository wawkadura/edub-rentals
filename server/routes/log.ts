import type { FastifyInstance } from 'fastify'
import { tail, undoLast, listEvents, revertEvent } from '../lib/action-log.ts'

export async function logRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { limit?: string; from?: string; to?: string } }>(
    '/api/log',
    async (req, reply) => {
      const limit = Math.min(parseInt(req.query.limit ?? '50', 10), 1000)
      if (req.query.from || req.query.to) {
        const events = await listEvents({ limit, from: req.query.from, to: req.query.to })
        return reply.send(events)
      }
      return reply.send(await tail(limit))
    },
  )

  fastify.post('/api/log/undo', async (_req, reply) => {
    const r = await undoLast()
    if (!r) return reply.code(404).send({ error: 'Nothing to undo' })
    return reply.send(r)
  })

  fastify.post<{ Body: { eventId?: string } }>('/api/log/revert', async (req, reply) => {
    const id = req.body?.eventId
    if (!id) return reply.code(400).send({ error: 'eventId required' })
    const r = await revertEvent(id)
    if (!r) return reply.code(404).send({ error: 'Event not found, already undone, or not revertable' })
    return reply.send(r)
  })
}
