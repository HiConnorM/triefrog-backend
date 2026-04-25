"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_fastify_1.FastifyAdapter());
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Check Service')
        .setDescription('Triefrog shippability checks and findings API')
        .setVersion('0.1.0')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('docs', app, document);
    const port = parseInt(process.env.CHECK_PORT ?? '3005', 10);
    await app.listen(port, '0.0.0.0');
    console.log(`Check service running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map