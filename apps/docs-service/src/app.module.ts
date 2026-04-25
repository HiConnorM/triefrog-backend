import { Module } from '@nestjs/common';
import { BullModule } from 'bullmq';
import { DocsModule } from './docs/docs.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    DocsModule,
  ],
})
export class AppModule {}
