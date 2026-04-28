import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CheckModule } from './check/check.module';
import { JanitorModule } from './janitor/janitor.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    BullModule.registerQueue({
      name: 'check',
    }),
    CheckModule,
    JanitorModule,
  ],
})
export class AppModule {}
