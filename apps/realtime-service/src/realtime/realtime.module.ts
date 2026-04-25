import { Module } from '@nestjs/common';
import { RealtimeController } from './realtime.controller';
import { RealtimeService } from './realtime.service';
import { redisProvider } from './redis.provider';

@Module({
  controllers: [RealtimeController],
  providers: [redisProvider, RealtimeService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
