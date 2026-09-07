import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { registerRoutes } from './routes.js';
import { ensureStorage } from './storage.js';

async function main(): Promise<void> {
  await ensureStorage();

  const app = Fastify({
    logger: true,
    bodyLimit: config.maxUploadSize,
  });

  await app.register(cors, { origin: config.frontendUrl });
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(multipart, { limits: { fileSize: config.maxUploadSize, files: 1 } });
  await app.register(rateLimit, { max: 60, timeWindow: '1 minute' });

  app.setErrorHandler((error: { statusCode?: number }, _request, reply) => {
    app.log.error(error);
    reply.status(error.statusCode ?? 500).send({
      message: 'Internal server error.',
    });
  });

  await registerRoutes(app);

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
