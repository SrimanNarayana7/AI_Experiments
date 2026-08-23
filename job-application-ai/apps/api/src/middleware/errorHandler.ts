import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { env } from '../config';
import { logger } from '../logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'INTERNAL_ERROR',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: Error, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.message,
        code: error.code,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }

    logger.error({ err: error }, 'Unhandled error');

    return reply.status(500).send({
      success: false,
      error: env.isProduction ? 'Internal server error' : error.message,
      ...(env.isDevelopment ? { stack: error.stack } : {}),
    });
  });

  app.setNotFoundHandler((_request: FastifyRequest, reply: FastifyReply) => {
    return reply.status(404).send({
      success: false,
      error: 'Not found',
    });
  });
}
