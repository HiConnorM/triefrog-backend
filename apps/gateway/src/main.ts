import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // CORS — allow the web frontend origin
  const webPort = process.env.WEB_PORT ?? '3010';
  const webOrigin = process.env.WEB_ORIGIN ?? `http://localhost:${webPort}`;

  await app.register(
    // @ts-expect-error fastify cors type compat
    import('@fastify/cors'),
    {
      origin: [webOrigin],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    },
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Triefrog Gateway')
    .setDescription('BFF / Gateway API — proxies all client traffic to downstream services')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = parseInt(process.env.GATEWAY_PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`Gateway listening on port ${port}`);
  logger.log(`CORS allowed origin: ${webOrigin}`);
  logger.log(`Swagger available at http://localhost:${port}/api-docs`);
}

bootstrap();
