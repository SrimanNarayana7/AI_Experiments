import { buildApp } from './app';
import { env } from './config';
import { logger } from './logger';
import { disconnectPrisma } from './prisma';

async function start(): Promise<void> {
  const app = await buildApp();

  const closeGracefully = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Received signal, shutting down gracefully');
    await app.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGTERM', () => closeGracefully('SIGTERM'));
  process.on('SIGINT', () => closeGracefully('SIGINT'));

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`Server listening on http://0.0.0.0:${env.PORT}`);
  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
}

start();
