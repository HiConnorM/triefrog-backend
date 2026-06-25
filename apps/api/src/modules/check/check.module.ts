import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CheckController } from './check.controller';
import { CheckService } from './check.service';
import { CheckProcessor } from './check.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'check',
    }),
  ],
  controllers: [CheckController],
  providers: [CheckService, CheckProcessor],
  exports: [CheckService],
})
export class CheckModule {}
