import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScanModule } from './scan/scan.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    ScanModule,
    StorageModule,
  ],
})
export class AppModule {}
