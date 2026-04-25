import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createLogger } from '@triefrog/shared-utils';

const logger = createLogger('auth-service');

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  });

  // Request ID middleware
  app.use((req: any, _res: any, next: () => void) => {
    req.headers['x-request-id'] =
      req.headers['x-request-id'] ??
      `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    next();
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Auth Service')
    .setDescription('TrieFrog Auth Service — registration, login, JWT & RBAC')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.AUTH_PORT ?? 3001);
  await app.listen(port, '0.0.0.0');
  logger.info({ port }, 'auth-service listening');
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start auth-service');
  process.exit(1);
});
