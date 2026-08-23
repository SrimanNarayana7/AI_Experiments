import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { env } from './config';
import { logger } from './logger';
import { registerErrorHandler } from './middleware/errorHandler';
import { registerRequestLogger } from './middleware/requestLogger';
import { registerRateLimiter } from './middleware/rateLimiter';
import { healthRoutes } from './routes/health';
import { jobRoutes } from './routes/jobs';
import { resumeRoutes } from './routes/resumes';
import { resumeVersionRoutes } from './routes/resumeVersions';
import { analyticsRoutes } from './routes/analytics';

export async function buildApp(): Promise<import('fastify').FastifyInstance> {
  const app = Fastify({
    logger: false,
    bodyLimit: env.MAX_UPLOAD_SIZE,
  });

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: env.isProduction ? undefined : false,
  });

  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_UPLOAD_SIZE,
    },
  });

  await registerRateLimiter(app);
  registerRequestLogger(app);
  registerErrorHandler(app);

  await app.register(healthRoutes);
  await app.register(jobRoutes, { prefix: '/api/jobs' });
  await app.register(resumeRoutes, { prefix: '/api/resumes' });
  await app.register(resumeVersionRoutes, { prefix: '/api/resume-versions' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });

  return app;
}
