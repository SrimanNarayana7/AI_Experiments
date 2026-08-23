import type { FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { env } from '../config';

export async function registerRateLimiter(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (_req, context) => ({
      success: false,
      error: `Rate limit exceeded. Retry in ${context.after}`,
    }),
  });
}
