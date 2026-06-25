import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { GraphProcessor } from './graph.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'graph',
    }),
  ],
  controllers: [GraphController],
  providers: [GraphService, GraphProcessor],
})
export class GraphModule {}
