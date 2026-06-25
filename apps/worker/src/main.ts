import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createLogger } from '@triefrog/shared-utils';

const logger = createLogger('worker');

/**
 * The worker has no HTTP surface — it boots the DI container so the BullMQ
 * processors start consuming the `scan` queue.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.enableShutdownHooks();
  logger.info('worker started — consuming scan queue');
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start worker');
  process.exit(1);
});
