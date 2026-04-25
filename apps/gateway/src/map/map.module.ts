import { Module } from '@nestjs/common';
import { MapController } from './map.controller';
import { HttpService } from '../http.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'change_me' })],
  controllers: [MapController],
  providers: [HttpService],
})
export class MapModule {}
