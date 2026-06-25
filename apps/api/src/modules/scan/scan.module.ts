import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScanController } from './scan.controller';
import { ScanService } from './scan.service';

/**
 * Scan trigger surface. The API only *produces* scan jobs onto the `scan`
 * queue and exposes scan status; the heavy processing lives in apps/worker.
 */
@Module({
  imports: [BullModule.registerQueue({ name: 'scan' })],
  controllers: [ScanController],
  providers: [ScanService],
  exports: [ScanService],
})
export class ScanModule {}
