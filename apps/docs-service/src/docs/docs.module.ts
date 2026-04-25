import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocsController } from './docs.controller';
import { DocsService } from './docs.service';
import { DocsProcessor } from './docs.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'docs',
    }),
  ],
  controllers: [DocsController],
  providers: [DocsService, DocsProcessor],
})
export class DocsModule {}
