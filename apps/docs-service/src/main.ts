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

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Triefrog Docs Service')
    .setDescription('Documentation generation and management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = parseInt(process.env.DOCS_PORT ?? '3006', 10);
  await app.listen(port, '0.0.0.0');
  logger.log(`Docs service listening on port ${port}`);
  logger.log(`Swagger available at http://localhost:${port}/docs`);
}

bootstrap();
