import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ success: true, status: 'ok', timestamp: new Date().toISOString() });
  });
}
