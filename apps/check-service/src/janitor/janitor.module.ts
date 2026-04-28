import { Module } from '@nestjs/common';
import { JanitorController } from './janitor.controller';
import { JanitorService } from './janitor.service';

@Module({
  controllers: [JanitorController],
  providers: [JanitorService],
})
export class JanitorModule {}
