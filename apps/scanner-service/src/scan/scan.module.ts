import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';
import { ScanProcessor } from './scan.processor';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scan',
    }),
    BullModule.registerQueue({
      name: 'graph',
    }),
    BullModule.registerQueue({
      name: 'check',
    }),
    BullModule.registerQueue({
      name: 'docs',
    }),
    StorageModule,
  ],
  controllers: [ScanController],
  providers: [ScanService, ScanProcessor],
  exports: [ScanService],
})
export class ScanModule {}
