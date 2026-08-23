import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { logger } from '../logger';

export function registerRequestLogger(app: FastifyInstance): void {
  app.addHook('onResponse', (request: FastifyRequest, reply: FastifyReply, done) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      `${request.method} ${request.url} ${reply.statusCode}`,
    );
    done();
  });
}
