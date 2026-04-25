import { Module } from '@nestjs/common';
import { FindingsController } from './findings.controller';
import { HttpService } from '../http.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'change_me' })],
  controllers: [FindingsController],
  providers: [HttpService],
})
export class FindingsModule {}
