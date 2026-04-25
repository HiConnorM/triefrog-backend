import { Module } from '@nestjs/common';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [RealtimeModule],
})
export class AppModule {}
