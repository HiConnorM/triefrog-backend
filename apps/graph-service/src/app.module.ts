import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GraphModule } from './graph/graph.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'graph',
    }),
    GraphModule,
  ],
})
export class AppModule {}
