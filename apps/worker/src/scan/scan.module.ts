import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScanProcessor } from './scan.processor';
import { StorageModule } from '../storage/storage.module';

/**
 * Worker-side scan module. Consumes the `scan` queue (heavy clone + analyze +
 * snapshot) and produces the light post-scan jobs (`graph`, `check`, `docs`)
 * that the API consumes.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: 'scan' }),
    BullModule.registerQueue({ name: 'graph' }),
    BullModule.registerQueue({ name: 'check' }),
    BullModule.registerQueue({ name: 'docs' }),
    StorageModule,
  ],
  providers: [ScanProcessor],
})
export class ScanModule {}
